import { formatElapsed, formatMeasurement, type Notebook } from '../core'
import type { ChatRequest, ChatResponse, Draft, TicketResponse } from './wire'

/** A drafted equipment request and where it's got to. */
export interface DraftState {
  draft: Draft
  token: string
  status: 'pending' | 'sending' | 'filed' | 'commented' | 'cancelled' | 'failed'
  url?: string
  note?: string
}

export interface Entry {
  id: number
  from: 'student' | 'professor'
  text: string
  /** The server's signature on a professor reply, sent back with the history. */
  sig?: string
  /** A message the server sent instead of a reply (limits, refusals). It and the question before it stay out of the history. */
  notice?: boolean
  draft?: DraftState
}

export type Conversation = Entry[]

const nextId = (c: Conversation) => (c.at(-1)?.id ?? 0) + 1

export const addStudent = (c: Conversation, text: string): Conversation => [...c, { id: nextId(c), from: 'student', text }]

export function addResponse(c: Conversation, res: ChatResponse): Conversation {
  const id = nextId(c)
  if (res.kind === 'notice') return [...c, { id, from: 'professor', text: res.text, notice: true }]
  return [...c, { id, from: 'professor', text: res.text, sig: res.sig, ...(res.draft ? { draft: { ...res.draft, status: 'pending' as const } } : {}) }]
}

export const setDraft = (c: Conversation, id: number, change: Partial<DraftState>): Conversation =>
  c.map((e) => (e.id === id && e.draft ? { ...e, draft: { ...e.draft, ...change } } : e))

/** How a confirm came out, as a draft update. */
export function ticketOutcome(res: TicketResponse): Partial<DraftState> {
  if (res.kind === 'filed') return { status: 'filed', url: res.url, note: `Sent! It's issue #${res.number}.` }
  if (res.kind === 'commented') return { status: 'commented', url: res.url, note: `Someone already asked for this, so your question was added to issue #${res.number}.` }
  return { status: res.reason === 'expired' ? 'failed' : 'pending', note: res.text }
}

/** The turns to send back: notices, and the question each one answered, are left out. */
export function historyFor(c: Conversation): ChatRequest['history'] {
  const out: ChatRequest['history'] = []
  c.forEach((e, i) => {
    if (e.notice) return
    if (e.from === 'student' && c[i + 1]?.notice) return
    if (e.from === 'student' && !c[i + 1]) return // still waiting for its answer
    out.push(e.from === 'student' ? { role: 'user', text: e.text } : { role: 'assistant', text: e.text, sig: e.sig })
  })
  return out
}

export const NOTEBOOK_LINES = 40
export const NOTEBOOK_LINE_CHARS = 300

/** The newest notebook entries as short lines of text, for the professor to read. */
export function notebookLines(nb: Notebook): string[] {
  return nb.entries.slice(-NOTEBOOK_LINES).map((e) => {
    const body =
      e.kind === 'measurement' ? `measured ${e.text}: ${formatMeasurement(e.measurement)} (${e.measurement.instrument})` : e.kind === 'note' ? `note: ${e.text}` : `${e.kind}: ${e.text}`
    return `[${formatElapsed(e.t)}] ${body}`.slice(0, NOTEBOOK_LINE_CHARS)
  })
}

export const MAX_MESSAGE_CHARS = 1000

const KEY = 'empirica.professor'

/** The conversation lives only in this browser tab's session. */
export function loadConversation(storage: Pick<Storage, 'getItem'> | undefined = globalThis.sessionStorage): Conversation {
  try {
    const raw = storage?.getItem(KEY)
    const c = raw ? JSON.parse(raw) : []
    return Array.isArray(c) ? c : []
  } catch {
    return []
  }
}

export function saveConversation(c: Conversation, storage: Pick<Storage, 'setItem'> | undefined = globalThis.sessionStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(c))
  } catch {
    /* private mode: the chat just won't survive a reload */
  }
}
