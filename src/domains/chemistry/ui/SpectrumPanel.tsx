import { useEffect, useRef, useState } from 'react'
import type { Contents } from '../equilibrium'
import { LAMBDA_MAX, LAMBDA_MIN, MAX_RELIABLE_A, lightName, peak, spectrum, transmittedColor } from '../spectrum'

const W = 560, H = 220, PAD = { l: 40, r: 10, t: 10, b: 44 }
const x = (nm: number) => PAD.l + ((nm - LAMBDA_MIN) / (LAMBDA_MAX - LAMBDA_MIN)) * (W - PAD.l - PAD.r)
const RAINBOW: [number, string][] = [
  [380, '#4b0082'], [420, '#6a00ff'], [450, '#0040ff'], [485, '#00b4ff'], [505, '#00ff9c'], [530, '#4cff00'],
  [565, '#e5ff00'], [585, '#ffc800'], [610, '#ff6a00'], [650, '#ff0000'], [700, '#c80000'], [750, '#600000'],
]
const SCALES = [0.1, 0.2, 0.5, 1, 2, 4] as const
const niceMax = (a: number) => SCALES.find((m) => m >= a) ?? 4
const TWEEN_MS = 450

/** Eases from the previous value to `target` so a change of axis scale is visible, not a jump. */
function useTween(target: number) {
  const [value, setValue] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const still = typeof matchMedia !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = from.current
    if (still || start === target) {
      from.current = target
      setValue(target)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / TWEEN_MS)
      const v = start + (target - start) * (1 - (1 - k) ** 3)
      from.current = v
      setValue(v)
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return value
}
const pct = (f: number) => (f > 0.995 ? '100%' : f < 0.01 ? '<1%' : `${Math.round(f * 100)}%`)

/** The spectrometer's view of a sample: absorbance against wavelength, and what is doing the absorbing. */
export function SpectrumPanel({ vessel, contents }: { vessel: string; contents: Contents }) {
  const s = spectrum(contents)
  const p = s && peak(s)
  const [scale, setScale] = useState<'auto' | number>('auto')
  const target = scale === 'auto' ? niceMax(Math.min(p?.A ?? 0, MAX_RELIABLE_A + 0.5)) : scale
  const top = useTween(target)
  if (!s) return <section className="spectrum" aria-label="Spectrometer"><p className="hint">The spectrometer needs a liquid sample.</p></section>
  const y = (a: number) => PAD.t + (1 - Math.min(a, top) / top) * (H - PAD.t - PAD.b)
  const path = (abs: number[]) => abs.map((a, i) => `${i ? 'L' : 'M'}${x(s.wavelengths[i]).toFixed(1)},${y(a).toFixed(1)}`).join('')
  const parts = s.components
    .map((c) => {
      const cp = peak({ wavelengths: s.wavelengths, absorbance: c.absorbance })
      // The form's own color: its curve scaled to a moderate absorbance.
      const hue = cp ? transmittedColor(c.absorbance.map((a) => a / cp.A)) : '#888888'
      return { ...c, cp, hue }
    })
    .filter((c) => c.cp)
    .sort((a, b) => b.cp!.A - a.cp!.A)
  // Gridlines stay at fixed absorbance values, so while the axis eases they slide and show the rescale.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => +(f * target).toFixed(3)).filter((t) => t <= top * 1.001)

  return (
    <section className="spectrum" aria-label="Spectrometer">
      <header>
        <b>Absorption spectrum, {vessel}</b>
        <span className="sub">1 cm cuvette · pH {s.pH.toFixed(1)}</span>
        <span className="swatch" style={{ background: transmittedColor(s.absorbance) }} title="Color of the light that gets through" />
      </header>
      {!p ? (
        <p className="hint">Nothing in this sample absorbs visible light noticeably: it looks colorless.</p>
      ) : (
        <>
          <div className="row">
            <span className="lbl">Scale</span>
            <div className="seg" role="radiogroup" aria-label="Absorbance scale">
              {(['auto', ...SCALES] as const).map((v) => (
                <button key={v} role="radio" aria-checked={scale === v} className={scale === v ? 'on' : ''} onClick={() => setScale(v)}>
                  {v === 'auto' ? 'Auto' : `0–${v}`}
                </button>
              ))}
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Absorbance peaks at ${p.nm} nm`}>
            <defs>
              <linearGradient id="rainbow" x1={x(380)} x2={x(750)} gradientUnits="userSpaceOnUse">
                {RAINBOW.map(([nm, c]) => <stop key={nm} offset={(nm - 380) / 370} stopColor={c} />)}
              </linearGradient>
            </defs>
            <rect x={x(380)} y={H - PAD.b + 4} width={x(750) - x(380)} height={8} fill="url(#rainbow)" rx={2} />
            <text x={x(365)} y={H - PAD.b + 11} className="tiny" textAnchor="middle">UV</text>
            <text x={x(825)} y={H - PAD.b + 11} className="tiny" textAnchor="middle">near-IR</text>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="grid" />
                <text x={PAD.l - 4} y={y(t) + 3} textAnchor="end" className="tiny">{t}</text>
              </g>
            ))}
            {[400, 500, 600, 700, 800, 900].map((nm) => <text key={nm} x={x(nm)} y={H - PAD.b + 26} textAnchor="middle" className="tiny">{nm}</text>)}
            <text x={(PAD.l + W - PAD.r) / 2} y={H - 4} textAnchor="middle" className="tiny">wavelength (nm)</text>
            <text x={10} y={(PAD.t + H - PAD.b) / 2} textAnchor="middle" className="tiny" transform={`rotate(-90 10 ${(PAD.t + H - PAD.b) / 2})`}>absorbance</text>
            {parts.length > 1 && parts.map((c) => <path key={c.name} d={path(c.absorbance)} className="part" stroke={c.hue} />)}
            <path d={path(s.absorbance)} className="total" />
            <line x1={x(p.nm)} x2={x(p.nm)} y1={y(p.A)} y2={H - PAD.b} className="peak" />
          </svg>
          {p.A > target && p.A <= MAX_RELIABLE_A && <p className="warn">The peak is above the top of this scale. Pick a bigger scale to see it.</p>}
          {p.A > MAX_RELIABLE_A && (
            <p className="warn">Off the scale above A = {MAX_RELIABLE_A}: almost no light gets through, so the peak is unreliable. Dilute the sample and measure again.</p>
          )}
          <p>
            Peak at <b>{p.nm} nm</b> ({p.A > MAX_RELIABLE_A ? `A > ${MAX_RELIABLE_A}` : `A = ${p.A.toFixed(2)}`}): it soaks up mostly <b>{lightName(p.nm)}</b> light.
            {p.nm >= 750 ? ' That peak is beyond what eyes can see, but its tail still takes out red. ' : ' '}
            You see the light that's left over.
          </p>
          <ul className="parts" aria-label="What is absorbing">
            {parts.map((c) => (
              <li key={c.name}>
                <span className="dot" style={{ background: c.hue }} />
                <span>
                  <b>{c.name}</b>
                  {c.share < 1 && <> · {pct(c.share)} of the {c.dye}</>}
                  {' '}· absorbs {lightName(c.cp!.nm)} ({c.cp!.nm} nm) → looks {c.looks}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
