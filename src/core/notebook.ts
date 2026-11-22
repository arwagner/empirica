import type { LabEvent, Measurement } from './lab'

/** One line in the notebook. `t` is milliseconds since the session started. */
export type NotebookEntry = { id: number; t: number } & (
  | LabEvent
  | { kind: 'note'; text: string }
)

export interface Notebook {
  title: string
  domain: string
  experimentId?: string
  startedAt: string // ISO timestamp
  entries: NotebookEntry[]
}

export interface Series {
  quantity: string
  unit: string
  instrument: string
  points: { t: number; value: number }[]
}

export function createNotebook(meta: Omit<Notebook, 'entries' | 'startedAt'>, startedAt: Date): Notebook {
  return { ...meta, startedAt: startedAt.toISOString(), entries: [] }
}

const nextId = (nb: Notebook) => (nb.entries.at(-1)?.id ?? 0) + 1

/** Append engine events. Notebooks are immutable: this returns a new one. */
export function record(nb: Notebook, events: LabEvent[], t: number): Notebook {
  let id = nextId(nb)
  return { ...nb, entries: [...nb.entries, ...events.map((e) => ({ ...e, id: id++, t }))] }
}

export function addNote(nb: Notebook, text: string, t: number): Notebook {
  const trimmed = text.trim()
  if (!trimmed) return nb
  return { ...nb, entries: [...nb.entries, { kind: 'note', text: trimmed, id: nextId(nb), t }] }
}

/** Measurements grouped by quantity + instrument, in time order: ready to plot or tabulate. */
export function measurementSeries(nb: Notebook): Series[] {
  const map = new Map<string, Series>()
  for (const e of nb.entries) {
    if (e.kind !== 'measurement') continue
    const m = e.measurement
    const key = `${m.quantity}|${m.instrument}|${m.unit}`
    if (!map.has(key)) map.set(key, { quantity: m.quantity, unit: m.unit, instrument: m.instrument, points: [] })
    map.get(key)!.points.push({ t: e.t, value: m.value })
  }
  return [...map.values()]
}

export const formatElapsed = (t: number) => {
  const s = Math.floor(t / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export const formatMeasurement = (m: Measurement) => `${m.value}${m.unit ? ` ${m.unit}` : ''}`

const LABEL: Record<NotebookEntry['kind'], string> = {
  action: 'Did',
  observation: 'Saw',
  measurement: 'Measured',
  note: 'Note',
}

export function toMarkdown(nb: Notebook): string {
  const lines = [
    `# ${nb.title}`,
    '',
    `- Domain: ${nb.domain}`,
    ...(nb.experimentId ? [`- Experiment: ${nb.experimentId}`] : []),
    `- Started: ${nb.startedAt}`,
    '',
    '## Log',
    '',
    ...nb.entries.map((e) => {
      const detail = e.kind === 'measurement' ? ` (${formatMeasurement(e.measurement)})` : ''
      const text = e.kind === 'note' ? `_${e.text}_` : e.text
      return `- \`${formatElapsed(e.t)}\` **${LABEL[e.kind]}:** ${text}${detail}`
    }),
  ]
  const series = measurementSeries(nb)
  if (series.length) {
    lines.push('', '## Measurements', '')
    for (const s of series) {
      lines.push(`### ${s.quantity} (${s.instrument})`, '', `| time | ${s.quantity}${s.unit ? ` (${s.unit})` : ''} |`, '|---|---|')
      for (const p of s.points) lines.push(`| ${formatElapsed(p.t)} | ${p.value} |`)
      lines.push('')
    }
  }
  return lines.join('\n').trimEnd() + '\n'
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Every measurement, one per row: opens straight in a spreadsheet. */
export function toCSV(nb: Notebook): string {
  const rows: (string | number)[][] = [['elapsed_s', 'quantity', 'value', 'unit', 'instrument', 'context']]
  for (const e of nb.entries)
    if (e.kind === 'measurement') {
      const m = e.measurement
      rows.push([e.t / 1000, m.quantity, m.value, m.unit, m.instrument, e.text])
    }
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n'
}
