import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { WIRE_LIMITS, type ChatResponse, type Notice, type TicketResponse } from '../../src/professor/wire'
import type { Daily } from './budget'
import type { Catalog } from './catalog'
import type { IssueTracker } from './github'
import { worstCaseUsd, type ProfessorModel, type TopicChecker, type Turn } from './models'
import { leaksPrompt } from './prompt'
import type { RateLimiter } from './rateLimit'
import { SCREEN_REPLY, screenText } from './screen'
import { commentBody, DraftSchema, draftIsClean, issueBody, issueTitle, sameEquipment, signDraft, SUGGESTION_LABEL, verifyDraft } from './tickets'

export const LIMITS = {
  ...WIRE_LIMITS,
  replyChars: 4000,
  turns: 20,
  draftTtlMs: 60 * 60 * 1000,
}

const ChatRequest = z.object({
  station: z.string().max(80).optional(),
  notebook: z.array(z.string().max(LIMITS.notebookEntryChars)).max(LIMITS.notebookEntries).default([]),
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(LIMITS.replyChars), sig: z.string().max(100).optional() }))
    .max(LIMITS.turns * 2),
  message: z.string().trim().min(1).max(LIMITS.messageChars),
})

const TicketRequest = z.object({ draft: DraftSchema, token: z.string().max(200) })

export const NOTICES: Record<Notice, string> = {
  invalid: "I couldn't read that message. Try sending it again.",
  'too-long': "We've covered a lot in this conversation. Start a new one and tell me where you've got to.",
  'rate-limit': "You've asked a lot of questions this hour! Take a break, try an experiment, and come back to me in a little while.",
  budget: "I'm resting until tomorrow; I've answered all the questions I can for today. Keep experimenting and write down what you find!",
  screened: SCREEN_REPLY.injection,
  'off-topic': "That's outside what I can help with. I'm here for the lab: its equipment, its science and your experiments. What are you working on?",
  unavailable: "The professor is unavailable right now. Try again later; the rest of the lab still works.",
  'ticket-cap': 'The lab has taken all the equipment requests it can for today. Ask me again tomorrow and we can send it then.',
  expired: 'That draft has expired or was already sent. Ask me to draft it again.',
}

const notice = (reason: Notice, text = NOTICES[reason]) => ({ kind: 'notice' as const, reason, text })

const REFUSED = "I can't help with that one. Let's get back to the lab: what are you investigating?"
const EMPTY_WITH_DRAFT = "That's something the lab can't measure yet. I've drafted a request for the equipment that could; have a look below."

export interface ProfessorDeps {
  catalog: Catalog
  topic: TopicChecker
  model: ProfessorModel
  /** Null when no GitHub token is configured: drafts work, filing says unavailable. */
  tracker: IssueTracker | null
  daily: Daily
  chatLimit: RateLimiter
  ticketLimit: RateLimiter
  /** Signs replies and drafts so the browser can carry them without being able to forge them. */
  secret: string
  now?: () => number
  log?: (msg: string) => void
}

export interface Professor {
  chat(body: unknown, ip: string): Promise<ChatResponse>
  confirmTicket(body: unknown, ip: string): Promise<TicketResponse>
}

export function createProfessor(deps: ProfessorDeps): Professor {
  const now = deps.now ?? Date.now
  const log = deps.log ?? (() => {})
  const signReply = (text: string) => createHmac('sha256', deps.secret).update(`reply:${text}`).digest('base64url')
  const replySigned = (text: string, sig: string | undefined) => {
    if (!sig) return false
    const a = Buffer.from(signReply(text))
    const b = Buffer.from(sig)
    return a.length === b.length && timingSafeEqual(a, b)
  }
  /** Drafts already sent, so one Confirm can't file twice. Forgotten once their token would have expired anyway. */
  const usedDrafts = new Map<string, number>()

  return {
    async chat(body, ip) {
      const parsed = ChatRequest.safeParse(body)
      if (!parsed.success) return notice('invalid')
      const req = parsed.data
      if (req.history.filter((t) => t.role === 'user').length >= LIMITS.turns) return notice('too-long')
      if (!deps.chatLimit.take(ip)) return notice('rate-limit')

      const screen = screenText(req.message)
      if (!screen.ok) return notice('screened', SCREEN_REPLY[screen.reason])
      // The browser holds the conversation. Earlier student turns must pass the screen again,
      // and professor turns must carry our signature, so nobody can put words in either mouth.
      for (const t of req.history) {
        if (t.role === 'user' ? !screenText(t.text).ok : !replySigned(t.text, t.sig)) return notice('invalid')
      }
      const notebook = req.notebook.map((e) => (screenText(e).ok ? e : '[entry withheld]'))
      const history: Turn[] = [...req.history.map(({ role, text }) => ({ role, text })), { role: 'user', text: req.message }]
      const ctx = { station: req.station, notebook }

      const reserved = worstCaseUsd(deps.catalog, history, ctx)
      if (!deps.daily.reserve(reserved)) return notice('budget')

      let spent = 0
      try {
        const lastReply = req.history.findLast((t) => t.role === 'assistant')?.text
        const topic = await deps.topic.check(req.message, lastReply)
        spent += topic.costUsd
        if (!topic.onTopic) return notice('off-topic')

        const out = await deps.model.reply(history, ctx)
        spent += out.costUsd
        let text = out.refused ? REFUSED : out.text || (out.draft ? EMPTY_WITH_DRAFT : REFUSED)
        let draft = out.draft && draftIsClean(out.draft) ? out.draft : undefined
        if (leaksPrompt(text)) {
          log('withheld a reply that quoted the system prompt')
          text = REFUSED
          draft = undefined
        }
        text = text.slice(0, LIMITS.replyChars)
        return {
          kind: 'reply',
          text,
          sig: signReply(text),
          ...(draft ? { draft: { draft, token: signDraft(deps.secret, draft, now() + LIMITS.draftTtlMs) } } : {}),
        }
      } catch (e) {
        log(`model call failed: ${(e as Error).message}`)
        return notice('unavailable')
      } finally {
        deps.daily.spend(spent - reserved)
      }
    },

    async confirmTicket(body, ip) {
      const parsed = TicketRequest.safeParse(body)
      if (!parsed.success) return notice('invalid')
      const { draft, token } = parsed.data
      const t = now()
      for (const [k, exp] of usedDrafts) if (exp < t) usedDrafts.delete(k)
      if (!verifyDraft(deps.secret, draft, token, t) || usedDrafts.has(token)) return notice('expired')
      if (!draftIsClean(draft)) return notice('screened')
      if (!deps.ticketLimit.take(ip)) return notice('rate-limit')
      if (!deps.tracker) return notice('unavailable')

      usedDrafts.set(token, Number(token.split('.')[0]))
      try {
        const open = await deps.tracker.openSuggestions(SUGGESTION_LABEL)
        const dup = open.find((i) => sameEquipment(i.title, draft.equipment))
        if (dup) {
          await deps.tracker.comment(dup.number, commentBody(draft))
          return { kind: 'commented', number: dup.number, url: dup.url }
        }
        // Take the slot before the GitHub call, so two Confirms at once can't both file the last one.
        if (!deps.daily.reserveIssue()) {
          usedDrafts.delete(token)
          return notice('ticket-cap')
        }
        try {
          const issue = await deps.tracker.create({ title: issueTitle(draft), body: issueBody(draft), labels: [SUGGESTION_LABEL] })
          return { kind: 'filed', number: issue.number, url: issue.url }
        } catch (e) {
          deps.daily.releaseIssue()
          throw e
        }
      } catch (e) {
        usedDrafts.delete(token)
        log(`filing failed: ${(e as Error).message}`)
        return notice('unavailable')
      }
    },
  }
}
