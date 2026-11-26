import { useCallback, useEffect, useState } from 'react'
import type { Notebook } from '../../core'
import type { ProfessorApi } from '../../professor/api'
import { addResponse, addStudent, historyFor, loadConversation, notebookLines, saveConversation, setDraft, ticketOutcome, type Conversation } from '../../professor/conversation'

export interface ProfessorChat {
  conversation: Conversation
  /** null while we don't know yet. */
  available: boolean | null
  busy: boolean
  send(text: string): Promise<void>
  confirm(entryId: number): Promise<void>
  cancel(entryId: number): void
  restart(): void
}

/** The chat with the professor: state, persistence for the session, and the calls to the server. */
export function useProfessor(api: ProfessorApi, station: string | undefined, notebook: Notebook): ProfessorChat {
  const [conversation, setConversation] = useState<Conversation>(loadConversation)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    saveConversation(conversation)
  }, [conversation])
  useEffect(() => {
    let live = true
    api.health().then((ok) => live && setAvailable(ok))
    return () => {
      live = false
    }
  }, [api])

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || busy) return
      const before = addStudent(conversation, message)
      setConversation(before)
      setBusy(true)
      const res = await api.chat({ station, notebook: notebookLines(notebook), history: historyFor(conversation), message })
      if (res.kind === 'notice' && res.reason === 'unavailable') setAvailable(false)
      else setAvailable(true)
      setConversation(addResponse(before, res))
      setBusy(false)
    },
    [api, busy, conversation, notebook, station],
  )

  const confirm = useCallback(
    async (id: number) => {
      const d = conversation.find((e) => e.id === id)?.draft
      if (!d || d.status !== 'pending') return
      setConversation((c) => setDraft(c, id, { status: 'sending', note: undefined }))
      const res = await api.confirm(d.draft, d.token)
      setConversation((c) => setDraft(c, id, ticketOutcome(res)))
    },
    [api, conversation],
  )

  const cancel = useCallback((id: number) => setConversation((c) => setDraft(c, id, { status: 'cancelled', note: 'Not sent.' })), [])
  const restart = useCallback(() => setConversation([]), [])

  return { conversation, available, busy, send, confirm, cancel, restart }
}
