import { useMemo, useState } from 'react'
import { REAGENTS, type Reagent } from '../reagents'

const GROUPS: { id: string; label: string; test: (r: Reagent) => boolean }[] = [
  { id: 'acids', label: 'Acids', test: (r) => /acid/i.test(r.name) && r.kind === 'solution' },
  { id: 'bases', label: 'Bases', test: (r) => /hydroxide|ammonia|limewater|carbonate|acetate/i.test(r.name) && r.kind === 'solution' },
  { id: 'salts', label: 'Salt solutions', test: (r) => r.kind === 'solution' && !/acid|hydroxide|ammonia|limewater|carbonate|acetate/i.test(r.name) },
  { id: 'solids', label: 'Solids', test: (r) => r.kind === 'solid' },
  { id: 'metals', label: 'Metals', test: (r) => r.kind === 'metal' },
  { id: 'indicators', label: 'Indicators', test: (r) => r.kind === 'indicator' },
  { id: 'water', label: 'Water', test: (r) => r.kind === 'liquid' },
]

const HAZARD_ICON: Record<string, string> = {
  corrosive: '🧪', toxic: '☠', flammable: '🔥', oxidizer: '⭕', irritant: '❗', explosive: '💥',
}

const DEFAULT_AMOUNT: Record<Reagent['unit'], number> = { mL: 10, g: 0.5, drops: 3 }
const MAX_AMOUNT: Record<Reagent['unit'], number> = { mL: 250, g: 50, drops: 50 }

/** How much − / + changes the amount: finer steps for small amounts. */
function bumpStep(unit: Reagent['unit'], amount: number) {
  if (unit === 'drops') return 1
  if (unit === 'g') return amount < 0.5 ? 0.05 : amount < 1 ? 0.1 : amount < 10 ? 0.5 : 5
  return amount < 1 ? 0.1 : amount < 10 ? 1 : 5
}

const tidy = (n: number) => Math.round(n * 1000) / 1000

interface Props {
  target: string | null
  onAdd: (r: Reagent, amount: number) => void
}

function AmountRow({ r, target, onAdd }: { r: Reagent; target: string | null; onAdd: Props['onAdd'] }) {
  const [text, setText] = useState(String(DEFAULT_AMOUNT[r.unit]))
  const n = Number(text)
  const valid = text.trim() !== '' && Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT[r.unit] && (r.unit !== 'drops' || Number.isInteger(n))
  const bump = (dir: 1 | -1) => {
    const cur = valid ? n : DEFAULT_AMOUNT[r.unit]
    // Stepping down uses the step for the smaller amount, so 1 → 0.9 rather than 1 → 0.
    const step = bumpStep(r.unit, dir > 0 ? cur : cur - 1e-9)
    const next = tidy(Math.min(MAX_AMOUNT[r.unit], Math.max(step, cur + dir * step)))
    setText(String(next))
  }
  const label = `${r.name} (${r.unit})`
  return (
    <li>
      <span className="rname">
        {r.name}
        {r.hazards.map((h) => (
          <span key={h.kind} className="hz" title={h.kind} aria-label={h.kind}>{HAZARD_ICON[h.kind] ?? '⚠'}</span>
        ))}
      </span>
      <span className="amount">
        <button className="bump" onClick={() => bump(-1)} aria-label={`Less ${label}`}>−</button>
        <input inputMode="decimal" value={text} aria-label={`Amount of ${label}`} aria-invalid={!valid}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'ArrowUp') { e.preventDefault(); bump(1) }
            if (e.key === 'ArrowDown') { e.preventDefault(); bump(-1) }
            if (e.key === 'Enter' && valid && target) onAdd(r, n)
          }} />
        <button className="bump" onClick={() => bump(1)} aria-label={`More ${label}`}>+</button>
        <span className="unit">{r.unit}</span>
        <button className="add" disabled={!target || !valid} onClick={() => onAdd(r, n)}
          aria-label={`Add ${valid ? n : ''} ${r.unit} of ${r.name}${target ? ` to ${target}` : ''}`}>Add</button>
      </span>
    </li>
  )
}

/** The reagent shelf: find a bottle, set an amount, add it to the selected vessel. */
export function Shelf({ target, onAdd }: Props) {
  const [q, setQ] = useState('')
  const [group, setGroup] = useState('acids')
  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (words.length) return REAGENTS.filter((r) => words.every((w) => r.name.toLowerCase().includes(w)))
    return REAGENTS.filter(GROUPS.find((g) => g.id === group)!.test)
  }, [q, group])

  return (
    <section className="shelf" aria-label="Reagent shelf">
      <input type="search" placeholder="Find a chemical…" aria-label="Find a chemical" value={q} onChange={(e) => setQ(e.target.value)} />
      {!q && (
        <div className="groups" role="tablist">
          {GROUPS.map((g) => (
            <button key={g.id} role="tab" aria-selected={group === g.id} className={group === g.id ? 'on' : ''} onClick={() => setGroup(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      )}
      <ul>
        {list.map((r) => <AmountRow key={r.id} r={r} target={target} onAdd={onAdd} />)}
        {list.length === 0 && <li className="none">Nothing on the shelf matches.</li>}
      </ul>
    </section>
  )
}
