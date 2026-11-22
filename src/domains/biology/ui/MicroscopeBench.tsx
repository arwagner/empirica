import { useEffect, useId, useState } from 'react'
import type { LabEvent, RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { fieldOfView, OBJECTIVES, sharpness, SPECIMENS, STAINS, totalMagnification, visibleFeatures, type MicroscopeState, type Stain } from '../rigs/microscope'
import './biology-bench.css'

const R = 190 // px radius of the eyepiece circle

const BG: Record<Stain, string> = { none: '#f3f5ef', iodine: '#f4e6bf', 'methylene-blue': '#e6eef8', 'crystal-violet': '#f1ecf8' }
const INK: Record<Stain, string> = { none: '#b9c2b0', iodine: '#9a6a2a', 'methylene-blue': '#3b6fb6', 'crystal-violet': '#7b3fa8' }
const NUC: Record<Stain, string> = { none: 'transparent', iodine: '#6b4314', 'methylene-blue': '#1f3f8f', 'crystal-violet': '#5a1f86' }

/** A nice round scale-bar length for a field of view. */
function scaleBar(fov: number) {
  const target = fov / 4
  return [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].reduce((b, v) => (Math.abs(v - target) < Math.abs(b - target) ? v : b), 1)
}

function Specimen({ s, k, t }: { s: MicroscopeState; k: number; t: number }) {
  const pid = useId().replace(/:/g, '')
  const sp = s.specimen ? SPECIMENS[s.specimen] : null
  if (!sp) return null
  const ink = INK[s.stain]
  const nuc = NUC[s.stain]
  const seen = new Set(visibleFeatures(s).map((f) => f.id))
  const showNuc = (sp.features.find((f) => f.id === 'nucleus')?.needs ?? []).includes(s.stain)
  const tile = (w: number, h: number, body: React.ReactNode) => (
    <>
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width={w * k} height={h * k} x={-R} y={-R}>{body}</pattern>
      </defs>
      <rect x={-R} y={-R} width={2 * R} height={2 * R} fill={`url(#${pid})`} />
    </>
  )
  switch (sp.id) {
    case 'onion':
      return tile(250, 120, (
        <g stroke={ink} strokeWidth={Math.max(0.6, 3 * k)} fill="none">
          <rect x={0} y={0} width={250 * k} height={60 * k} />
          <rect x={-125 * k} y={60 * k} width={250 * k} height={60 * k} />
          <rect x={125 * k} y={60 * k} width={250 * k} height={60 * k} />
          {showNuc && [[125, 30], [0, 90], [250, 90]].map(([x, y], i) => <circle key={i} cx={x * k} cy={y * k} r={Math.max(0.8, 9 * k)} fill={nuc} stroke="none" />)}
        </g>
      ))
    case 'cheek':
      return tile(160, 160, (
        <g fill={s.stain === 'none' ? '#e9ece4' : `${ink}22`} stroke={ink} strokeWidth={Math.max(0.5, 1.2 * k)}>
          <path d={`M ${10 * k} ${20 * k} L ${60 * k} ${8 * k} L ${72 * k} ${55 * k} L ${30 * k} ${70 * k} Z`} />
          <path d={`M ${95 * k} ${85 * k} L ${150 * k} ${95 * k} L ${140 * k} ${150 * k} L ${88 * k} ${140 * k} Z`} />
          {showNuc && <><circle cx={42 * k} cy={38 * k} r={Math.max(0.8, 4 * k)} fill={nuc} stroke="none" /><circle cx={118 * k} cy={118 * k} r={Math.max(0.8, 4 * k)} fill={nuc} stroke="none" /></>}
        </g>
      ))
    case 'leaf':
      return tile(150, 100, (
        <g stroke={s.stain === 'none' ? '#9fb29a' : ink} strokeWidth={Math.max(0.5, 1.5 * k)} fill="none">
          {[0, 50, 100].map((x) => <path key={x} d={`M ${x * k} 0 q ${8 * k} ${12 * k} 0 ${25 * k} q ${-8 * k} ${12 * k} 0 ${25 * k} q ${8 * k} ${12 * k} 0 ${25 * k} q ${-8 * k} ${12 * k} 0 ${25 * k}`} />)}
          {[0, 50].map((y) => <path key={y} d={`M 0 ${y * k} q ${12 * k} ${8 * k} ${25 * k} 0 q ${12 * k} ${-8 * k} ${25 * k} 0 q ${12 * k} ${8 * k} ${25 * k} 0 q ${12 * k} ${-8 * k} ${25 * k} 0 q ${12 * k} ${8 * k} ${25 * k} 0 q ${12 * k} ${-8 * k} ${25 * k} 0`} />)}
          <g transform={`translate(${75 * k} ${72 * k})`}>
            <ellipse rx={7 * k} ry={13 * k} cx={-5 * k} fill="#cfe3c4" stroke="#6c8f5e" />
            <ellipse rx={7 * k} ry={13 * k} cx={5 * k} fill="#cfe3c4" stroke="#6c8f5e" />
            {seen.has('chloroplasts') && [-7, -4, 4, 7].map((x, i) => <circle key={i} cx={x * k} cy={(i % 2 ? 5 : -5) * k} r={2 * k} fill="#3f8f3a" stroke="none" />)}
          </g>
        </g>
      ))
    case 'blood':
      return tile(18, 16, (
        <g>
          <circle cx={5 * k} cy={5 * k} r={3.7 * k} fill="#e7a4a0" />
          <circle cx={5 * k} cy={5 * k} r={1.5 * k} fill="#f2cfcb" />
          <circle cx={14 * k} cy={12 * k} r={3.7 * k} fill="#e7a4a0" />
          <circle cx={14 * k} cy={12 * k} r={1.5 * k} fill="#f2cfcb" />
        </g>
      ))
    case 'yeast':
      return tile(22, 20, (
        <g fill="#efe5c8" stroke={s.stain === 'none' ? '#b8a878' : ink} strokeWidth={Math.max(0.4, 0.4 * k)}>
          <ellipse cx={6 * k} cy={6 * k} rx={2.8 * k} ry={2.2 * k} />
          <ellipse cx={16 * k} cy={14 * k} rx={2.8 * k} ry={2.2 * k} />
          <circle cx={19 * k} cy={12.5 * k} r={1.1 * k} />
        </g>
      ))
    case 'bacteria':
      return tile(12, 10, (
        <g fill={s.stain === 'crystal-violet' ? '#6b2a9c' : '#dfe3da'}>
          <rect x={1 * k} y={2 * k} width={3 * k} height={0.9 * k} rx={0.45 * k} />
          <rect x={6 * k} y={6 * k} width={3 * k} height={0.9 * k} rx={0.45 * k} transform={`rotate(40 ${7.5 * k} ${6.5 * k})`} />
          {[0, 1, 2, 3].map((i) => <circle key={i} cx={(2 + i * 1.1) * k} cy={8 * k} r={0.5 * k} />)}
        </g>
      ))
    case 'pond': {
      const alive = s.stain === 'none'
      const orgs = [
        { kind: 'paramecium', x: -800, y: -300, vx: 160, vy: 60 },
        { kind: 'paramecium', x: 600, y: 500, vx: -120, vy: 90 },
        { kind: 'euglena', x: 200, y: -120, vx: 40, vy: 30 },
        { kind: 'euglena', x: -150, y: 260, vx: -30, vy: 50 },
        { kind: 'amoeba', x: -60, y: 40, vx: 6, vy: 3 },
      ]
      return (
        <g>
          {orgs.map((o, i) => {
            const tt = alive ? t : 0
            const x = (((o.x + o.vx * tt) % 2400) + 3600) % 2400 - 1200
            const y = (((o.y + o.vy * tt) % 2400) + 3600) % 2400 - 1200
            const ang = (Math.atan2(o.vy, o.vx) * 180) / Math.PI
            return (
              <g key={i} transform={`translate(${x * k} ${y * k}) rotate(${ang})`} stroke={s.stain === 'none' ? '#7d8f74' : ink} strokeWidth={Math.max(0.5, 1.5 * k)}>
                {o.kind === 'paramecium' && <path d={`M ${-100 * k} 0 C ${-90 * k} ${-35 * k} ${80 * k} ${-35 * k} ${100 * k} 0 C ${80 * k} ${30 * k} ${-90 * k} ${40 * k} ${-100 * k} 0 Z`} fill="#e3ead9" />}
                {o.kind === 'euglena' && <><path d={`M ${-25 * k} 0 Q 0 ${-12 * k} ${25 * k} 0 Q 0 ${12 * k} ${-25 * k} 0 Z`} fill="#9fd08a" /><circle cx={18 * k} cy={0} r={2.5 * k} fill="#d43b2a" stroke="none" /></>}
                {o.kind === 'amoeba' && <path d={`M ${-150 * k} 0 C ${-120 * k} ${-120 * k} ${40 * k} ${-90 * k} ${80 * k} ${-140 * k} C ${150 * k} ${-60 * k} ${120 * k} ${80 * k} ${30 * k} ${120 * k} C ${-60 * k} ${150 * k} ${-170 * k} ${80 * k} ${-150 * k} 0 Z`} fill="#e9e4d6" />}
              </g>
            )
          })}
        </g>
      )
    }
    default:
      return null
  }
}

export function MicroscopeBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as RigState<object>
  const s = state.rig.state as MicroscopeState
  const { log } = useLabSession()
  const clip = useId()
  const blurId = useId().replace(/:/g, '')
  const [t, setT] = useState(0)
  const alive = s.specimen === 'pond' && s.stain === 'none'
  useEffect(() => {
    if (!alive) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      setT((now - start) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [alive])

  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const sharp = sharpness(s)
  const fov = fieldOfView(s)
  const k = (2 * R) / fov // px per µm
  const bar = scaleBar(fov)
  const blur = (1 - sharp) * 9
  const dim = Math.max(0, 0.85 - s.light) * 0.9
  const wash = s.stain === 'none' ? Math.max(0, s.light - 0.7) * 1.6 : 0
  const read = (inst: string, target: string) => sandbox.domain.engine.measure(state, inst, target)
  const logRead = (inst: string, target: string, label: string) => {
    const m = read(inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }
  const cell = read('graticule', 'cell')
  const count = read('cell-count', 'cell')

  return (
    <div className="bio-bench mic">
      <aside className="mic-side">
        <h4>Slide</h4>
        <div className="chips">
          {Object.values(SPECIMENS).map((sp) => (
            <button key={sp.id} className={s.specimen === sp.id ? 'on' : ''} aria-pressed={s.specimen === sp.id} onClick={() => act({ type: 'mic-load', specimen: sp.id })}>{sp.name}</button>
          ))}
        </div>
        <h4>Stain</h4>
        <div className="chips">
          {(Object.keys(STAINS) as Stain[]).map((st) => (
            <button key={st} className={s.stain === st ? 'on' : ''} aria-pressed={s.stain === st} disabled={!s.specimen} onClick={() => act({ type: 'mic-stain', stain: st })}>{STAINS[st].name}</button>
          ))}
        </div>
      </aside>

      <div className="mic-view">
        <svg viewBox={`${-R - 10} ${-R - 10} ${2 * R + 20} ${2 * R + 20}`} aria-label="View down the microscope">
          <defs>
            <clipPath id={clip}><circle r={R} /></clipPath>
            <filter id={blurId} x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation={blur} /></filter>
          </defs>
          <circle r={R + 8} className="eyepiece" />
          <g clipPath={`url(#${clip})`}>
            <rect x={-R} y={-R} width={2 * R} height={2 * R} fill={s.specimen ? BG[s.stain] : '#f6f6f2'} />
            <g filter={`url(#${blurId})`}>
              <Specimen s={s} k={k} t={t} />
            </g>
            {wash > 0 && <rect x={-R} y={-R} width={2 * R} height={2 * R} fill="#fff" opacity={Math.min(0.7, wash)} />}
            <rect x={-R} y={-R} width={2 * R} height={2 * R} fill="#000" opacity={dim} />
            <g className="graticule">
              <line x1={-bar * k / 2} x2={bar * k / 2} y1={R - 30} y2={R - 30} />
              <text y={R - 38} textAnchor="middle">{bar} µm</text>
            </g>
          </g>
          {!s.specimen && <text textAnchor="middle" className="hint">put a slide on the stage</text>}
        </svg>
      </div>

      <div className="controls">
        <div className="row">
          <span className="lbl">Objective</span>
          <div className="seg" role="radiogroup" aria-label="Objective lens">
            {OBJECTIVES.map((o) => (
              <button key={o} role="radio" aria-checked={s.objective === o} className={s.objective === o ? 'on' : ''} onClick={() => act({ type: 'mic-objective', objective: o })}>{o}×</button>
            ))}
          </div>
          {s.objective === 100 && <button disabled={s.oil} onClick={() => act({ type: 'mic-oil' })}>{s.oil ? 'Oil on' : 'Add immersion oil'}</button>}
        </div>
        <div className="row">
          <label>Coarse focus <input type="range" min="0" max="100" step="0.5" value={s.focus} onChange={(e) => act({ type: 'mic-focus', focus: Number(e.target.value) }, true)} aria-label="Coarse focus" /></label>
          <span className="lbl">Fine</span>
          {[-0.5, -0.1, 0.1, 0.5].map((d) => (
            <button key={d} onClick={() => act({ type: 'mic-focus', focus: Math.max(0, Math.min(100, Math.round((s.focus + d) * 10) / 10)) }, true)} aria-label={`Fine focus ${d > 0 ? '+' : ''}${d}`}>{d > 0 ? `+${d}` : d}</button>
          ))}
          <label>Light <input type="range" min="0" max="1" step="0.05" value={s.light} onChange={(e) => act({ type: 'mic-light', light: Number(e.target.value) }, true)} aria-label="Light" /></label>
        </div>
        <div className="readouts">
          <div className="readout">
            <span className="lbl">Magnification</span>
            <span className="val">{totalMagnification(s)}×</span>
            <span className="sub">{s.objective}× objective × 10× eyepiece</span>
            <button onClick={() => { logRead('magnification', 'microscope', 'Total magnification'); logRead('field-of-view', 'microscope', 'Field of view') }}>Log</button>
          </div>
          <div className="readout">
            <span className="lbl">Field of view · sharpness</span>
            <span className="val">{fov >= 1000 ? `${(fov / 1000).toFixed(1)} mm` : `${fov} µm`}</span>
            <span className="sub">{Math.round(sharp * 100)}% sharp</span>
          </div>
          <div className="readout">
            <span className="lbl">Graticule: cell length</span>
            <span className="val">{cell ? `${cell.value.toFixed(cell.value < 10 ? 1 : 0)} µm` : '—'}</span>
            <span className="sub">{count ? `≈ ${count.value} in view` : 'focus on cells to measure'}</span>
            <button disabled={!cell} onClick={() => { logRead('graticule', 'cell', 'Cell length'); logRead('cell-count', 'cell', 'Cells in view') }}>Log</button>
          </div>
        </div>
      </div>
    </div>
  )
}
