import { useEffect, useRef, useState } from 'react'
import { professorApi, type ProfessorApi } from '../../professor/api'
import { UNAVAILABLE } from '../../professor/wire'
import { MAX_MESSAGE_CHARS, type DraftState } from '../../professor/conversation'
import { useLabSession } from '../useLabSession'
import { useProfessor } from './useProfessor'
import './professor.css'

const defaultApi = professorApi()

interface Props {
  /** Where the student is, if at a station. */
  station?: { id: string; name: string }
  api?: ProfessorApi
}

function DraftCard({ d, onConfirm, onCancel }: { d: DraftState; onConfirm: () => void; onCancel: () => void }) {
  return (
    <section className="draft" aria-label={`Equipment request: ${d.draft.equipment}`}>
      <h4>Equipment request: {d.draft.equipment}</h4>
      <dl>
        <dt>Question it answers</dt>
        <dd>{d.draft.question}</dd>
        <dt>What it measures</dt>
        <dd>{d.draft.measures}</dd>
        <dt>Where it goes</dt>
        <dd>{d.draft.location}</dd>
        <dt>On a phone</dt>
        <dd>{d.draft.phone}</dd>
      </dl>
      {d.status === 'pending' || d.status === 'sending' ? (
        <>
          <p className="fine">Confirm sends this to the lab's public issue list on GitHub.</p>
          <div className="draft-actions">
            <button className="primary" onClick={onConfirm} disabled={d.status === 'sending'}>
              {d.status === 'sending' ? 'Sending…' : 'Confirm'}
            </button>
            <button onClick={onCancel} disabled={d.status === 'sending'}>
              Cancel
            </button>
          </div>
        </>
      ) : null}
      {d.note && (
        <p className="draft-note" role="status">
          {d.note}{' '}
          {d.url && (
            <a href={d.url} target="_blank" rel="noreferrer">
              View it
            </a>
          )}
        </p>
      )}
    </section>
  )
}

/** Chat with the AI professor about your experiments. Lives in the menu's Professor tab. */
export function ProfessorPanel({ station, api = defaultApi }: Props) {
  const { notebook } = useLabSession()
  const chat = useProfessor(api, station?.id, notebook)
  const [text, setText] = useState('')
  const log = useRef<HTMLDivElement>(null)
  // Keep the newest message in view.
  useEffect(() => {
    const el = log.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.conversation, chat.busy])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || chat.busy) return
    void chat.send(text)
    setText('')
  }

  return (
    <section className="professor" aria-label="Professor chat">
      <header>
        <p>
          {station ? <>At the <strong>{station.name}</strong>. </> : null}
          Talk through your experiments and results. The professor sees your notebook{station ? ' and this station' : ''}.
        </p>
        {chat.conversation.length > 0 && (
          <button onClick={chat.restart} disabled={chat.busy}>
            New conversation
          </button>
        )}
      </header>
      <div className="chat-log" role="log" aria-live="polite" ref={log}>
        {chat.conversation.length === 0 && (
          <p className="hello">
            Hello! What are you investigating? Tell me what you measured or what puzzled you, and we'll work through it together.
          </p>
        )}
        {chat.conversation.map((e) => (
          <div key={e.id} className={`msg from-${e.from}${e.notice ? ' notice' : ''}`}>
            <span className="who">{e.from === 'student' ? 'You' : 'Professor'}</span>
            <p>{e.text}</p>
            {e.draft && <DraftCard d={e.draft} onConfirm={() => void chat.confirm(e.id)} onCancel={() => chat.cancel(e.id)} />}
          </div>
        ))}
        {chat.busy && (
          <div className="msg from-professor thinking" aria-label="The professor is thinking">
            <span className="who">Professor</span>
            <p>…</p>
          </div>
        )}
      </div>
      {chat.available === false && (
        <p className="unavailable" role="status">
          {UNAVAILABLE}
        </p>
      )}
      <form onSubmit={submit}>
        <textarea
          aria-label="Message to the professor"
          placeholder="Ask about your results…"
          value={text}
          maxLength={MAX_MESSAGE_CHARS}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e)
          }}
        />
        <button className="primary" type="submit" disabled={!text.trim() || chat.busy}>
          Send
        </button>
      </form>
    </section>
  )
}
