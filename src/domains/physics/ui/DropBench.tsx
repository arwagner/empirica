import { useState } from 'react'
import type { LabEvent } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import type { PhysicsState } from '../engine'
import { OBJECTS, gateDepths, type DropObject, type DropState, type Lane } from '../rigs/dropTower'
import { PLANETS, type Planet } from '../world'
import { usePlayback } from '../../../ui/usePlayback'
import './physics-bench.css'

const W = 900
const H = 460
const TOP = 40
const BOTTOM = 430
const LANE_X: Record<Lane, number> = { left: 390, right: 510 }
const COLOR: Record<Lane, string> = { left: '#e1a32a', right: '#2e86ab' }
const SPEEDS = [[1, 'Real time'], [0.25, 'Slow ×¼'], [0.1, 'Slow ×⅒']] as const

function Icon({ object, x, y }: { object: DropObject; x: number; y: number }) {
  switch (object) {
    case 'hammer':
      return <g transform={`translate(${x} ${y})`}><rect x="-3" y="-26" width="6" height="26" fill="#a77b55" /><rect x="-14" y="-6" width="28" height="12" rx="2" fill="#555" /></g>
    case 'steel':
      return <circle cx={x} cy={y - 7} r="7" fill="#9aa3a8" stroke="#555" />
    case 'pingpong':
      return <circle cx={x} cy={y - 8} r="8" fill="#f6f3ec" stroke="#c9a" />
    case 'filter':
      return <path d={`M ${x - 16} ${y - 12} L ${x + 16} ${y - 12} L ${x + 8} ${y} L ${x - 8} ${y} Z`} fill="#f4ecd6" stroke="#b9a77a" />
    case 'parachute':
      return <g><path d={`M ${x - 20} ${y - 28} Q ${x} ${y - 46} ${x + 20} ${y - 28} Z`} fill="#c0392b" /><line x1={x - 20} y1={y - 28} x2={x} y2={y - 6} stroke="#555" /><line x1={x + 20} y1={y - 28} x2={x} y2={y - 6} stroke="#555" /><rect x={x - 4} y={y - 8} width="8" height="8" fill="#555" /></g>
    case 'feather':
      return <g transform={`translate(${x} ${y - 14}) rotate(-25)`}><path d="M 0 -16 Q 9 -4 0 16 Q -9 -4 0 -16 Z" fill="#e8e1d0" stroke="#a89f88" /><line x1="0" y1="-16" x2="0" y2="18" stroke="#a89f88" /></g>
  }
}

export function DropBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as PhysicsState
  const s = state.rig.state as DropState
  const { log } = useLabSession()
  const [trace, setTrace] = useState<{ t: number; left: number; right: number }[]>([])

  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const ps = r.state as PhysicsState
    const st = ps.rig.state as DropState
    setTrace((tr) => [...tr, { t: ps.time - st.releasedAt, left: st.lanes.left.v, right: st.lanes.right.v }])
    const falling = (['left', 'right'] as Lane[]).some((l) => st.lanes[l].object && st.lanes[l].landedAt === null)
    return falling && !r.error
  })
  const release = () => {
    setTrace([{ t: 0, left: 0, right: 0 }])
    act({ type: 'drop-release' })
    pb.setPlaying(true)
  }
  const reset = () => {
    pb.setPlaying(false)
    setTrace([])
    act({ type: 'drop-reset' })
  }
  const logRead = (inst: string, target: string, label: string) => {
    const m = sandbox.domain.engine.measure(state, inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }

  const py = (y: number) => BOTTOM - (y / s.height) * (BOTTOM - TOP)
  const gates = gateDepths(s.height)
  const vacuum = !state.world.air
  const tMax = Math.max(1, ...trace.map((p) => p.t))
  const vMax = Math.max(1, ...trace.flatMap((p) => [p.left, p.right]))
  const lanes = (['left', 'right'] as Lane[]).filter((l) => s.lanes[l].object)

  return (
    <div className="phys-bench">
      <div className="stage">
        <svg viewBox={`0 0 ${W} ${H}`} aria-label="Drop tower">
          <rect x="320" y={TOP - 20} width="260" height={BOTTOM - TOP + 30} rx="10" className={`tube ${vacuum ? 'vacuum' : ''}`} />
          <rect x="300" y={BOTTOM + 8} width="300" height="14" className="stop" />
          <rect x="300" y={TOP - 30} width="300" height="12" className="stop" />
          {gates.map((d) => (
            <g key={d}>
              <line x1="320" x2="580" y1={py(s.height - d)} y2={py(s.height - d)} className="beam-h" />
              <text x="596" y={py(s.height - d) + 4} className="scale" textAnchor="start">{d} m</text>
            </g>
          ))}
          <text x="590" y={BOTTOM + 4} className="scale" textAnchor="start">{s.height} m</text>
          {lanes.map((l) => <Icon key={l} object={s.lanes[l].object!} x={LANE_X[l]} y={py(s.lanes[l].y)} />)}
          <text x="610" y={TOP + 20} className="hint">{vacuum ? 'vacuum: the air has been pumped out' : 'tube full of air'}</text>
        </svg>
      </div>

      <div className="controls">
        <div className="row">
          <button className="primary" onClick={release} disabled={s.released}>Release</button>
          <button onClick={() => pb.setPlaying(!pb.playing)} disabled={!s.released}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={reset}>Reset</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => (
              <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>
            ))}
          </div>
          <button className={vacuum ? 'on-toggle' : ''} aria-pressed={vacuum} onClick={() => { reset(); act({ type: 'set-world', air: vacuum }) }}>
            {vacuum ? 'Let the air back in' : 'Pump out the air'}
          </button>
        </div>
        <div className="row">
          {(['left', 'right'] as Lane[]).map((l) => (
            <label key={l}>{l === 'left' ? 'Left' : 'Right'}
              <select value={s.lanes[l].object ?? ''} onChange={(e) => act({ type: 'drop-set', [l]: (e.target.value || null) as DropObject | null })} aria-label={`${l} object`}>
                <option value="">nothing</option>
                {(Object.keys(OBJECTS) as DropObject[]).map((o) => <option key={o} value={o}>{OBJECTS[o].name}</option>)}
              </select>
            </label>
          ))}
          <label>Drop height <input type="range" min="1" max="5" step="0.5" value={s.height} onChange={(e) => act({ type: 'drop-set', height: Number(e.target.value) })} aria-label="Drop height" /> {s.height} m</label>
          <label>World
            <select value={state.world.planet} onChange={(e) => act({ type: 'set-world', planet: e.target.value as Planet })}>
              {(Object.keys(PLANETS) as Planet[]).map((p) => <option key={p} value={p}>{PLANETS[p].name}</option>)}
            </select>
          </label>
        </div>
        <div className="readouts">
          {lanes.map((l) => {
            const f = s.lanes[l]
            return (
              <div key={l} className="readout">
                <span className="lbl" style={{ color: COLOR[l] }}>{OBJECTS[f.object!].name} ({l})</span>
                <span className="val">{f.landedAt !== null ? `${f.landedAt.toFixed(3)} s` : '—'}</span>
                <span className="sub">{f.v.toFixed(2)} m/s · gates {f.gates.map((t) => (t === null ? '–' : t.toFixed(2))).join(' / ')}</span>
                <button disabled={f.landedAt === null} onClick={() => { logRead('fall-timer', l, `${OBJECTS[f.object!].name} fall time`); gates.forEach((d) => logRead('gate', `${l}:${d}`, `${OBJECTS[f.object!].name} time to ${d} m`)) }}>Log</button>
              </div>
            )
          })}
          <figure className="mini-graph" aria-label="Speed against time for each object">
            <svg viewBox="0 0 200 90">
              <line x1="20" y1="80" x2="195" y2="80" className="axis" />
              <line x1="20" y1="5" x2="20" y2="80" className="axis" />
              {trace.length > 1 && lanes.map((l) => (
                <g key={l}>
                  <polyline className="trace-multi" stroke={COLOR[l]} points={trace.map((p) => `${20 + (p.t / tMax) * 160},${80 - (p[l] / vMax) * 72}`).join(' ')} />
                  <text x="184" y={80 - (trace.at(-1)![l] / vMax) * 72 + 3} className="ax-label">{l === 'left' ? 'L' : 'R'}</text>
                </g>
              ))}
              <text x="100" y="89" className="ax-label">time</text>
              <text x="3" y="10" className="ax-label">v</text>
            </svg>
          </figure>
        </div>
      </div>
    </div>
  )
}
