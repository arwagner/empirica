import { useMemo } from 'react'
import type { Vessel } from '../engine'
import { particles, type Particle } from '../inside'
import { visibleSolid } from '../appearance'

// Validated categorical palette (fixed order); anything beyond it folds into grey "other".
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6']
const OTHER = '#9a9a96'
const DOTS = 64

function fmtConc(c: number) {
  if (c >= 0.01) return `${c.toFixed(3)} mol/L`
  if (c >= 1e-4) return `${(c * 1000).toFixed(2)} mmol/L`
  return `${c.toExponential(1)} mol/L`
}

/** Deterministic scatter inside a circle so dots don't jump around between renders. */
function* scatter(seed: number) {
  let s = (seed * 2654435761) % 4294967296
  const next = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
  for (;;) {
    const r = Math.sqrt(next()) * 108
    const a = next() * Math.PI * 2
    yield [150 + r * Math.cos(a), 130 + r * Math.sin(a) * 0.9] as const
  }
}

/** A particle-level look inside a vessel: what's dissolved, how much, and what it means. */
export function VesselInside({ vessel }: { vessel: Vessel }) {
  const list = useMemo(() => particles(vessel.contents), [vessel.contents])
  const dissolved = list.filter((p) => !p.solid)
  const solids = list.filter((p) => p.solid && visibleSolid(p.mol, vessel.contents))
  const colorOf = (_p: Particle, i: number) => (i < PALETTE.length ? PALETTE[i] : OTHER)

  // Dots roughly in proportion to concentration; anything present gets at least one so you can find it.
  const total = dissolved.reduce((a, p) => a + (p.conc ?? 0), 0) || 1
  const counts = dissolved.map((p) => Math.max(1, Math.round(((p.conc ?? 0) / total) * DOTS)))
  const dots: { x: number; y: number; color: string; key: string }[] = []
  dissolved.forEach((p, i) => {
    const g = scatter(i + 1 + p.id.length * 31)
    for (let k = 0; k < counts[i]; k++) {
      const [x, y] = g.next().value!
      dots.push({ x, y, color: colorOf(p, i), key: `${p.id}${k}` })
    }
  })

  if (!list.length) return <p className="inside-empty">The {vessel.id} is empty.</p>

  return (
    <div className="inside">
      <svg viewBox="0 0 300 270" aria-label={`Particles inside the ${vessel.id}`}>
        <circle cx="150" cy="130" r="120" className="lens" />
        {dissolved.length > 0 && [...Array(40)].map((_, i) => {
          const g = scatter(999 + i)
          const [x, y] = g.next().value!
          return <circle key={`w${i}`} cx={x} cy={y} r="2" className="water-dot" />
        })}
        {dots.map((d) => <circle key={d.key} cx={d.x} cy={d.y} r="4.5" fill={d.color} stroke="var(--ui-panel, #fff)" strokeWidth="1.5" />)}
        {solids.map((p, i) => (
          <g key={p.id}>
            {[...Array(10)].map((_, k) => <circle key={k} cx={110 + i * 30 + (k % 5) * 8} cy={224 - Math.floor(k / 5) * 7} r="4" fill={p.color ?? OTHER} stroke="#0004" />)}
          </g>
        ))}
        <text x="150" y="266" className="caption">dots ≈ proportions (water, by far the most common, shown faint)</text>
      </svg>
      <ul className="inside-list">
        {dissolved.map((p, i) => (
          <li key={p.id}>
            <span className="sw" style={{ background: colorOf(p, i) }} />
            <span>
              <b>{p.name}</b> <span className="f">{p.formula}</span> · {fmtConc(p.conc ?? 0)}
              {p.note && <span className="note">{p.note}</span>}
            </span>
          </li>
        ))}
        {solids.map((p) => (
          <li key={p.id}>
            <span className="sw solid" style={{ background: p.color ?? OTHER }} />
            <span>
              <b>{p.name}</b> <span className="f">{p.formula}</span> · solid, {(p.mol * 1000).toFixed(2)} mmol
              <span className="note">Not dissolved: it sits in the liquid as a solid.</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
