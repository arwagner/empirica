import type { Contents } from '../equilibrium'
import { HDO_PPM, nmr, PPM_MAX, PPM_MIN } from '../nmr'
import { species } from '../species'

const W = 560, H = 200, PAD = { l: 12, r: 12, t: 12, b: 34 }
// NMR convention: chemical shift increases to the left.
const x = (ppm: number) => PAD.l + ((PPM_MAX - ppm) / (PPM_MAX - PPM_MIN)) * (W - PAD.l - PAD.r)
const pct = (f: number) => (f > 0.995 ? '100%' : f < 0.01 ? '<1%' : `${Math.round(f * 100)}%`)
const formula = (id: string) => (id === 'H+' ? 'H⁺' : id === 'OH-' ? 'OH⁻' : species(id).formula)

/** ¹H NMR of a sample: which hydrogen-bearing molecules are there, and how much of each form. */
export function NmrPanel({ vessel, contents }: { vessel: string; contents: Contents }) {
  const s = nmr(contents)
  if (!s) return <section className="spectrum" aria-label="NMR"><p className="hint">The NMR needs a liquid sample.</p></section>
  // Scale to the tallest real signal, ignoring the leftover water line.
  const scaleMax = Math.max(...s.intensity.filter((_, i) => Math.abs(s.ppm[i] - HDO_PPM) > 0.1))
  const top = Math.max(scaleMax * 1.1, 1e-5)
  const y = (v: number) => PAD.t + (1 - Math.max(-0.05, Math.min(v / top, 1))) * (H - PAD.t - PAD.b)
  const path = s.intensity.map((v, i) => `${i ? 'L' : 'M'}${x(s.ppm[i]).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const signals = s.groups.filter((g) => g.conc > 0)
  const empty = signals.length === 0

  return (
    <section className="spectrum" aria-label="NMR">
      <header>
        <b>¹H NMR, {vessel}</b>
        <span className="sub">400 MHz · in D₂O, water signal suppressed · pH {s.pH.toFixed(1)}</span>
      </header>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={empty ? 'NMR: no signals except water' : `NMR with ${signals.length} labelled signals`}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((p) => (
          <g key={p}>
            <line x1={x(p)} x2={x(p)} y1={H - PAD.b} y2={H - PAD.b + 4} className="grid-tick" />
            <text x={x(p)} y={H - PAD.b + 15} textAnchor="middle" className="tiny">{p}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="grid" />
        <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" className="tiny">chemical shift (ppm) ← deshielded · shielded →</text>
        <text x={x(HDO_PPM)} y={PAD.t - 2} textAnchor="middle" className="tiny">HDO</text>
        <path d={path} className="total thin" />
      </svg>
      {s.paramagnetic.length > 0 && (
        <p className="warn">
          {s.paramagnetic.map(formula).join(', ')} {s.paramagnetic.length > 1 ? 'are' : 'is'} paramagnetic (unpaired electrons): every line is {s.broadening.toFixed(0)}× broader.
          {s.broadening > 30 && ' The signals are smeared into the baseline.'}
        </p>
      )}
      {empty ? (
        <p className="hint">{s.broadening > 30 ? 'No signals at all: even the leftover water line is smeared out.' : 'No signals except leftover water: nothing dissolved here has hydrogens that stay put.'}</p>
      ) : (
        <ul className="parts" aria-label="NMR signals">
          {signals.map((g) => (
            <li key={g.label}>
              <span className="ppm">{g.ppm.toFixed(2)}</span>
              <span>
                <b>{g.label}</b>
                {g.share !== undefined && g.species === 'red-cabbage' && <> · integral: <b>{pct(g.share)}</b> of the pigment</>}
                {g.note && <span className="note">{g.note}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {s.invisible.length > 0 && (
        <p className="sub">Not seen: {s.invisible.map((v) => `${formula(v.species)} (${v.reason})`).join('; ')}.</p>
      )}
    </section>
  )
}
