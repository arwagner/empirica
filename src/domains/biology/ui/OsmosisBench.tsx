import { useEffect } from 'react'
import type { LabEvent, RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { usePlayback } from '../../../ui/usePlayback'
import { useLabSession } from '../../../ui/useLabSession'
import { depth, massChange, type OsmosisState } from '../rigs/osmosis'
import './biology-bench.css'

const SPEEDS = { osmosis: [[60, '×60'], [600, '×600'], [3600, '×3600']], diffusion: [[1, '×1'], [10, '×10'], [60, '×60']] } as const

export function OsmosisBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as RigState<object>
  const s = state.rig.state as OsmosisState
  const { log } = useLabSession()
  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const st = (r.state as RigState<object>).rig.state as OsmosisState
    return st.running && !r.error
  })
  const speeds = SPEEDS[s.mode]
  // Each experiment has its own sensible speeds (minutes vs hours); snap to one when switching.
  const { setSpeed } = pb
  useEffect(() => {
    setSpeed(SPEEDS[s.mode][1][0])
  }, [s.mode, setSpeed])
  const logRead = (inst: string, target: string, label: string) => {
    const m = sandbox.domain.engine.measure(state, inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }
  const minutes = s.elapsed / 60
  const iso = sandbox.domain.engine.measure(state, 'isotonic', 'potato')

  return (
    <div className="bio-bench">
      <div className="stage">
        {s.mode === 'osmosis' ? (
          <svg viewBox="0 0 900 320" aria-label="Potato cylinders in sugar solutions">
            {s.tubes.map((t, i) => {
              const f = massChange(t.conc, s.elapsed)
              const x = 90 + i * 140
              const len = 110 * (1 + f)
              const sugar = Math.min(1, t.conc)
              return (
                <g key={i}>
                  <path d={`M ${x} 40 V 250 a 30 30 0 0 0 60 0 V 40`} fill="#ffffffaa" stroke="#7fa9b5" strokeWidth="3" />
                  <rect x={x + 3} y="90" width="54" height="188" fill={`rgba(230, 210, 150, ${0.15 + sugar * 0.35})`} />
                  <rect x={x + 18} y={270 - len} width={24 * (1 + f / 3)} height={len} rx="4" fill={f < -0.15 ? '#e6d9a6' : '#f2e3a2'} stroke="#b9a35e" transform={f < -0.2 ? `rotate(${-6} ${x + 30} 270)` : undefined} />
                  <text x={x + 30} y="305" textAnchor="middle" className="hint">{t.conc} M</text>
                  <text x={x + 30} y="30" textAnchor="middle" className="scale-s">{(f * 100).toFixed(1)}%</text>
                </g>
              )
            })}
          </svg>
        ) : (
          <svg viewBox="0 0 900 320" aria-label="Agar cubes in acid">
            <rect x="60" y="40" width="780" height="250" rx="16" fill="#e8f4f8" stroke="#7fa9b5" strokeWidth="3" />
            {s.cubes.map((c, i) => {
              const px = c.side * 55
              const cx = 190 + i * 260
              const d = Math.min(c.side / 2, depth(s.tempC, s.elapsed)) * 55
              return (
                <g key={i}>
                  <rect x={cx - px / 2} y={165 - px / 2} width={px} height={px} fill="#f6f1e4" stroke="#c9bfa5" />
                  {px - 2 * d > 0.5 && <rect x={cx - px / 2 + d} y={165 - px / 2 + d} width={px - 2 * d} height={px - 2 * d} fill="#ff4fa3" opacity="0.85" />}
                  <text x={cx} y={165 + px / 2 + 24} textAnchor="middle" className="hint">{c.side} cm · SA:V {(6 / c.side).toFixed(1)}</text>
                  {c.clearedAt !== null && <text x={cx} y={165 - px / 2 - 12} textAnchor="middle" className="scale-s">clear at {(c.clearedAt / 60).toFixed(1)} min</text>}
                </g>
              )
            })}
          </svg>
        )}
      </div>
      <div className="controls">
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="Experiment">
            {(['osmosis', 'diffusion'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={s.mode === m} className={s.mode === m ? 'on' : ''} onClick={() => { pb.setPlaying(false); act({ type: 'osm-mode', mode: m }) }}>{m === 'osmosis' ? 'Osmosis (potato)' : 'Diffusion (agar cubes)'}</button>
            ))}
          </div>
          <button className="primary" disabled={s.running} onClick={() => { act({ type: 'osm-start' }); pb.setPlaying(true) }}>Start</button>
          <button disabled={!s.running} onClick={() => pb.setPlaying(!pb.playing)}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={() => { pb.setPlaying(false); act({ type: 'osm-reset' }) }}>Reset</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {speeds.map(([v, label]) => <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>)}
          </div>
          <span className="clock">{minutes.toFixed(1)} min</span>
          {s.mode === 'diffusion' && <label>Temperature <input type="range" min="5" max="60" step="5" value={s.tempC} onChange={(e) => act({ type: 'osm-set', tempC: Number(e.target.value) })} aria-label="Acid temperature" /> {s.tempC} °C</label>}
        </div>
        {s.mode === 'osmosis' ? (
          <div className="osm-readouts">
            <table className="data" aria-label="Potato masses">
              <thead><tr><th>sucrose</th><th>start</th><th>now</th><th>change</th></tr></thead>
              <tbody>
                {s.tubes.map((t, i) => {
                  const f = massChange(t.conc, s.elapsed)
                  return <tr key={i}><td>{t.conc} M</td><td>{t.m0.toFixed(2)} g</td><td>{(t.m0 * (1 + f)).toFixed(2)} g</td><td>{(f * 100).toFixed(1)}%</td></tr>
                })}
              </tbody>
            </table>
            <figure className="mini-graph" aria-label="Percentage change in mass against sucrose concentration">
              <svg viewBox="0 0 200 110">
                <line x1="20" y1="55" x2="195" y2="55" className="axis" />
                <line x1="20" y1="5" x2="20" y2="105" className="axis" />
                {s.elapsed > 0 && (() => {
                  const pts = s.tubes.map((t) => [20 + (t.conc / 1.0) * 170, 55 - massChange(t.conc, s.elapsed) * 110] as const)
                  return <>{pts.length > 1 && <polyline className="trace" points={pts.map((p) => p.join(',')).join(' ')} />}{pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="var(--ui-accent, #2f7d6d)" />)}</>
                })()}
                <text x="110" y="108" className="ax-label">sucrose (M)</text>
                <text x="23" y="10" className="ax-label">% change</text>
              </svg>
            </figure>
            <div className="readout">
              <span className="lbl">Crosses zero at</span>
              <span className="val">{iso ? `${iso.value} M` : '—'}</span>
              <span className="sub">the isotonic point</span>
              <button disabled={s.elapsed <= 0} onClick={() => { s.tubes.forEach((t, i) => logRead('percent-change', `tube:${i}`, `% change in mass, ${t.conc} M`)); if (iso) logRead('isotonic', 'potato', 'Isotonic point') }}>Log</button>
            </div>
          </div>
        ) : (
          <div className="readouts">
            {s.cubes.map((c, i) => (
              <div key={i} className="readout">
                <span className="lbl">{c.side} cm cube</span>
                <span className="val">{c.clearedAt !== null ? `${(c.clearedAt / 60).toFixed(1)} min` : '—'}</span>
                <span className="sub">edge {Math.min(c.side / 2, depth(s.tempC, s.elapsed)).toFixed(2)} cm in · SA:V {(6 / c.side).toFixed(1)}</span>
                <button disabled={c.clearedAt === null} onClick={() => logRead('clear-time', `cube:${i}`, `${c.side} cm cube: time to clear`)}>Log</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
