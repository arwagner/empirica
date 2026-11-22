import { useState } from 'react'
import type { Contents } from '../equilibrium'
import { massSpec, type Mode } from '../massSpec'
import { species } from '../species'

const W = 560, H = 210, PAD = { l: 36, r: 12, t: 22, b: 34 }
const niceMz = (m: number) => [100, 200, 500, 700, 1000, 1300].find((v) => v >= m) ?? 1300
const pct = (f: number) => `${f >= 0.995 ? 100 : f < 0.01 ? '<1' : Math.round(f * 100)}%`
const sub = (s: string) => s.replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[+d])

/** Electrospray mass spectrum: which ions are in the sample, by mass-to-charge ratio. */
export function MassSpecPanel({ vessel, contents }: { vessel: string; contents: Contents }) {
  const [mode, setMode] = useState<Mode>('positive')
  const s = massSpec(contents, mode)
  if (!s) return <section className="spectrum" aria-label="Mass spectrometer"><p className="hint">The mass spectrometer needs a liquid sample.</p></section>
  const maxMz = niceMz(Math.max(50, ...s.peaks.map((p) => p.mz)) * 1.05)
  const x = (mz: number) => PAD.l + (mz / maxMz) * (W - PAD.l - PAD.r)
  const y = (r: number) => PAD.t + (1 - r) * (H - PAD.t - PAD.b)
  const step = maxMz <= 200 ? 20 : maxMz <= 700 ? 100 : 200
  const labelled = s.ions.slice(0, 6)

  return (
    <section className="spectrum" aria-label="Mass spectrometer">
      <header>
        <b>Mass spectrum, {vessel}</b>
        <span className="sub">electrospray · pH {s.pH.toFixed(1)}</span>
      </header>
      <div className="row">
        <span className="lbl">Ions</span>
        <div className="seg" role="radiogroup" aria-label="Ion mode">
          {(['positive', 'negative'] as const).map((m) => (
            <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
              {m === 'positive' ? 'Positive (+)' : 'Negative (−)'}
            </button>
          ))}
        </div>
      </div>
      {s.peaks.length === 0 ? (
        <p className="hint">No {mode} ions detected.</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Mass spectrum, base peak at m/z ${s.ions[0].mz.toFixed(2)}`}>
            {[0, 0.5, 1].map((r) => (
              <g key={r}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(r)} y2={y(r)} className="grid" />
                <text x={PAD.l - 4} y={y(r) + 3} textAnchor="end" className="tiny">{r * 100}</text>
              </g>
            ))}
            {Array.from({ length: Math.floor(maxMz / step) + 1 }, (_, i) => i * step).map((m) => (
              <text key={m} x={x(m)} y={H - PAD.b + 15} textAnchor="middle" className="tiny">{m}</text>
            ))}
            <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" className="tiny">m/z (mass ÷ charge)</text>
            <text x={10} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" className="tiny" transform={`rotate(-90 10 ${(PAD.t + H - PAD.b) / 2})`}>relative %</text>
            {s.peaks.map((p, i) => <line key={i} x1={x(p.mz)} x2={x(p.mz)} y1={y(0)} y2={y(p.intensity)} className="stick" />)}
            {labelled.map((ion) => (
              <text key={ion.species + ion.label} x={x(ion.mz)} y={y(ion.intensity) - 4} textAnchor="middle" className="tiny mz">{ion.mz.toFixed(ion.mz < 100 ? 2 : 1)}</text>
            ))}
          </svg>
          <ul className="parts" aria-label="Ions detected">
            {s.ions.map((ion) => (
              <li key={ion.species + ion.label}>
                <span className="ppm">{ion.mz.toFixed(2)}</span>
                <span>
                  <b>{ion.label}</b> · {sub(ion.formula)}{Math.abs(ion.z) > 1 ? `, charge ${ion.z > 0 ? '+' : '−'}${Math.abs(ion.z)} (shows at 1/${Math.abs(ion.z)} of its mass)` : ''} · {pct(ion.intensity)}
                  {ion.note && <span className="note">{ion.note}</span>}
                </span>
              </li>
            ))}
          </ul>
          {s.peaks.length > s.ions.length && <p className="sub">Smaller neighbouring sticks are isotopes: the same ion with heavier atoms (¹³C, ³⁷Cl, ⁸¹Br, ⁶⁵Cu…).</p>}
        </>
      )}
      {s.unseen.length > 0 && <p className="sub">Not seen: {s.unseen.map((id) => species(id).formula).join(', ')} (neutral molecules don't fly as ions).</p>}
    </section>
  )
}
