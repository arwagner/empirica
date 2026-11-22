import { useState } from 'react'
import {
  formatElapsed, formatMeasurement, measurementSeries, toCSV, toMarkdown,
  type Notebook, type NotebookEntry,
} from '../../core'
import { SeriesChart } from './SeriesChart'
import './notebook.css'

const KIND: Record<NotebookEntry['kind'], { icon: string; label: string }> = {
  action: { icon: '✋', label: 'Did' },
  observation: { icon: '👁', label: 'Saw' },
  measurement: { icon: '📏', label: 'Measured' },
  note: { icon: '✎', label: 'Note' },
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  URL.revokeObjectURL(url)
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'notebook'

export function NotebookPanel({ notebook, onAddNote }: { notebook: Notebook; onAddNote: (text: string) => void }) {
  const [draft, setDraft] = useState('')
  const series = measurementSeries(notebook)
  const hasMeasurements = series.length > 0

  return (
    <section className="notebook" aria-label="Lab notebook">
      <header>
        <h2>{notebook.title}</h2>
        <div className="exports">
          <button onClick={() => download(`${slug(notebook.title)}.md`, toMarkdown(notebook), 'text/markdown')}>
            Export notes (.md)
          </button>
          <button disabled={!hasMeasurements}
            onClick={() => download(`${slug(notebook.title)}.csv`, toCSV(notebook), 'text/csv')}>
            Export data (.csv)
          </button>
        </div>
      </header>

      {hasMeasurements && (
        <div className="charts">
          {series.map((s) => <SeriesChart key={`${s.quantity}|${s.instrument}|${s.unit}`} series={s} />)}
        </div>
      )}

      {notebook.entries.length === 0 ? (
        <p className="empty">Nothing yet. Everything you do, see and measure will be written here.</p>
      ) : (
        <ol className="log">
          {notebook.entries.map((e) => (
            <li key={e.id} className={e.kind}>
              <time>{formatElapsed(e.t)}</time>
              <span className="kind" title={KIND[e.kind].label} aria-label={KIND[e.kind].label}>{KIND[e.kind].icon}</span>
              <span className="text">
                {e.text}
                {e.kind === 'measurement' && <b> {formatMeasurement(e.measurement)}</b>}
              </span>
            </li>
          ))}
        </ol>
      )}

      <form className="note" onSubmit={(ev) => {
        ev.preventDefault()
        if (!draft.trim()) return
        onAddNote(draft)
        setDraft('')
      }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a note or hypothesis…" aria-label="New note"
          onKeyDown={(e) => e.stopPropagation()} />
        <button type="submit">Add</button>
      </form>
    </section>
  )
}
