import { useRef, useState } from 'react'
import type { LabEvent } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { HitArea } from '../../../ui/HitArea'
import { useHitRadius } from '../../../ui/touch'
import type { PhysicsState } from '../engine'
import { SURFACES, type RampState, type Surface } from '../rigs/ramp'
import { PLANETS, type Planet } from '../world'
import { usePlayback } from '../../../ui/usePlayback'
import './physics-bench.css'

// Drawing space: the ramp pivots at its bottom-right foot.
const W = 900
const H = 420
const FOOT = { x: 790, y: 310 }
/** The hanging mass drops the same distance the cart travels; drawn compressed to fit. */
const DROP_PX_PER_M = 40
const PX_PER_M = 340

const SPEEDS = [[1, 'Real time'], [0.25, 'Slow ×¼'], [0.1, 'Slow ×⅒']] as const

export function RampBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as PhysicsState
  const s = state.rig.state as RampState
  const { log } = useLabSession()
  const svg = useRef<SVGSVGElement>(null)
  const hitR = useHitRadius(svg, W)
  const [drag, setDrag] = useState<null | 'angle' | string>(null)
  const [trace, setTrace] = useState<{ t: number; x: number; v: number }[]>([])
  const [graph, setGraph] = useState<'x' | 'v'>('x')

  const th = (s.angleDeg * Math.PI) / 180
  const top = { x: FOOT.x - Math.cos(th) * s.length * PX_PER_M, y: FOOT.y - Math.sin(th) * s.length * PX_PER_M }
  /** Point on the track surface `d` metres from the top. */
  const at = (d: number) => ({ x: top.x + Math.cos(th) * d * PX_PER_M, y: top.y + Math.sin(th) * d * PX_PER_M })

  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })

  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const st = (r.state as PhysicsState).rig.state as RampState
    setTrace((tr) => [...tr, { t: (r.state as PhysicsState).time - st.releasedAt, x: st.x, v: st.v }])
    return !(st.stopped || st.atBottom) && !r.error
  })

  const release = () => {
    setTrace([{ t: 0, x: s.x, v: 0 }])
    act({ type: 'ramp-release' })
    pb.setPlaying(true)
  }
  const reset = () => {
    pb.setPlaying(false)
    setTrace([])
    act({ type: 'ramp-reset' })
  }

  // Direct manipulation: drag the top of the ramp (angle) or a light gate (position).
  const toLocal = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const p = toLocal(e)
    if (drag === 'angle') {
      const deg = Math.round(Math.max(0, Math.min(60, (Math.atan2(FOOT.y - p.y, FOOT.x - p.x) * 180) / Math.PI)))
      if (deg !== s.angleDeg) act({ type: 'ramp-set', angleDeg: deg }, true)
    } else {
      const d = ((p.x - top.x) * Math.cos(th) + (p.y - top.y) * Math.sin(th)) / PX_PER_M
      const x = Math.round(Math.max(0.1, Math.min(s.length - 0.05, d)) * 20) / 20
      const g = s.gates.find((gg) => gg.id === drag)
      if (g && g.x !== x) act({ type: 'ramp-move-gate', gate: drag, x }, true)
    }
    setTrace([])
  }
  const endDrag = () => {
    if (drag === 'angle') log([{ kind: 'action', text: `Set the ramp to ${s.angleDeg}°.`, action: { type: 'ramp-set', angleDeg: s.angleDeg } }])
    else if (drag) log([{ kind: 'action', text: `Moved light gate ${drag} to ${s.gates.find((g) => g.id === drag)?.x} m.`, action: { type: 'ramp-move-gate' } }])
    setDrag(null)
  }

  const read = (inst: string, target: string) => sandbox.domain.engine.measure(state, inst, target)
  const logRead = (inst: string, target: string, label: string) => {
    const m = read(inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }

  const cart = at(s.x)
  const running = s.released && !s.stopped && !s.atBottom
  const tMax = Math.max(1, ...trace.map((p) => p.t))
  const vMax = Math.max(0.5, ...trace.map((p) => p.v))

  return (
    <div className="phys-bench">
      <div className="stage">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag} aria-label={`Ramp at ${s.angleDeg} degrees`}>
          <line x1="20" y1={FOOT.y + 6} x2={FOOT.x + 14} y2={FOOT.y + 6} className="floor" />
          <line x1={FOOT.x + 14} y1={FOOT.y + 6} x2={FOOT.x + 14} y2={H} className="floor" />
          <polygon points={`${top.x},${top.y} ${FOOT.x},${FOOT.y} ${top.x},${FOOT.y}`} className="ramp" />
          <path d={`M ${FOOT.x - 60} ${FOOT.y} A 60 60 0 0 1 ${FOOT.x - 60 * Math.cos(th)} ${FOOT.y - 60 * Math.sin(th)}`} className="arc" />
          <text x={FOOT.x - 110} y={FOOT.y - 8} className="angle-label">{s.angleDeg}°</text>
          <rect x={FOOT.x - 4} y={FOOT.y - 34} width="8" height="34" className="stop" />
          {s.gates.map((g) => {
            const p = at(g.x)
            const ox = -Math.sin(th) * 46
            const oy = Math.cos(th) * -46
            return (
              <g key={g.id} className={`gate ${g.time !== null ? 'tripped' : ''}`} onPointerDown={(e) => { e.preventDefault(); setDrag(g.id) }}
                role="slider" aria-label={`Light gate ${g.id}`} aria-valuenow={g.x} aria-valuemin={0.1} aria-valuemax={s.length}>
                <HitArea cx={p.x + ox} cy={p.y + oy} r={hitR} />
                <line x1={p.x} y1={p.y} x2={p.x + ox} y2={p.y + oy} className="post" />
                <circle cx={p.x + ox} cy={p.y + oy} r="9" className="head" />
                <text x={p.x + ox} y={p.y + oy - 16} className="gate-label">{g.id}</text>
                <line x1={p.x} y1={p.y} x2={p.x + ox * 0.7} y2={p.y + oy * 0.7} className="beam" />
              </g>
            )
          })}
          {s.hanging > 0 && (() => {
            const front = at(s.x + 0.09)
            const nx = Math.sin(th) * 17
            const ny = -Math.cos(th) * 17
            const pul = { x: FOOT.x + 22, y: FOOT.y - 14 }
            const wy = pul.y + 30 + Math.max(0, s.x - 0.05) * DROP_PX_PER_M
            const size = 10 + Math.min(18, s.hanging * 40)
            return (
              <g className="pulley">
                <line x1={front.x + nx} y1={front.y + ny} x2={pul.x - 8} y2={pul.y - 8} className="string" />
                <line x1={pul.x + 9} y1={pul.y} x2={pul.x + 9} y2={wy} className="string" />
                <line x1={FOOT.x + 4} y1={FOOT.y} x2={pul.x} y2={pul.y} className="bracket" />
                <circle cx={pul.x} cy={pul.y} r="9" className="wheel-p" />
                <rect x={pul.x + 9 - size / 2} y={wy} width={size} height={size} rx="2" className="weight" />
                <text x={pul.x + 9 + size / 2 + 6} y={wy + size / 2 + 4} className="weight-label">{s.hanging * 1000} g</text>
              </g>
            )
          })()}
          <g transform={`translate(${cart.x} ${cart.y}) rotate(${s.angleDeg})`} className="cart">
            <rect x="-30" y="-26" width="60" height="18" rx="4" />
            <rect x="-12" y={-26 - 6 * Math.min(6, Math.round(s.mass / 0.5))} width="24" height={6 * Math.min(6, Math.round(s.mass / 0.5))} className="masses" />
            <circle cx="-18" cy="-5" r="5" className="wheel" />
            <circle cx="18" cy="-5" r="5" className="wheel" />
          </g>
          <g onPointerDown={(e) => { e.preventDefault(); setDrag('angle') }}
            role="slider" aria-label="Ramp angle handle" aria-valuenow={s.angleDeg} aria-valuemin={0} aria-valuemax={60}>
            <HitArea cx={top.x} cy={top.y} r={hitR} />
            <circle cx={top.x} cy={top.y} r="11" className="handle" />
          </g>
          {!drag && !s.released && <text x={top.x - 18} y={top.y + 4} className="hint" textAnchor="end">drag to tilt ↕</text>}
        </svg>
      </div>

      <div className="controls">
        <div className="row">
          <button className="primary" onClick={release} disabled={s.released}>Release</button>
          <button onClick={() => pb.setPlaying(!pb.playing)} disabled={!running}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={reset}>Reset</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => (
              <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>
            ))}
          </div>
          <span className="clock">t = {Math.max(0, state.time - (s.released ? s.releasedAt : state.time)).toFixed(2)} s</span>
        </div>

        <div className="row">
          <label>Angle <input type="range" min="0" max="60" value={s.angleDeg} onChange={(e) => act({ type: 'ramp-set', angleDeg: Number(e.target.value) })} /> {s.angleDeg}°</label>
          <label>Cart mass
            <select value={s.mass} onChange={(e) => act({ type: 'ramp-set', mass: Number(e.target.value) })}>
              {[0.25, 0.5, 1, 1.5, 2, 3].map((m) => <option key={m} value={m}>{m} kg</option>)}
            </select>
          </label>
          <label>Hanging mass
            <select value={s.hanging} onChange={(e) => act({ type: 'ramp-set', hanging: Number(e.target.value) })} aria-label="Hanging mass">
              {[0, 0.02, 0.05, 0.1, 0.2, 0.5, 1].map((m) => <option key={m} value={m}>{m ? `${m * 1000} g` : 'none'}</option>)}
            </select>
          </label>
          <label>Surface
            <select value={s.surface} onChange={(e) => act({ type: 'ramp-set', surface: e.target.value as Surface })}>
              {(Object.keys(SURFACES) as Surface[]).map((k) => <option key={k} value={k}>{SURFACES[k].name}</option>)}
            </select>
          </label>
        </div>

        <div className="row world-settings">
          <label>World
            <select value={state.world.planet} onChange={(e) => act({ type: 'set-world', planet: e.target.value as Planet })}>
              {(Object.keys(PLANETS) as Planet[]).map((p) => <option key={p} value={p}>{PLANETS[p].name}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={state.world.friction} onChange={(e) => act({ type: 'set-world', friction: e.target.checked })} /> Friction</label>
          <label><input type="checkbox" checked={state.world.air} onChange={(e) => act({ type: 'set-world', air: e.target.checked })} /> Air resistance</label>
        </div>

        <div className="readouts">
          {s.gates.map((g) => (
            <div key={g.id} className="readout">
              <span className="lbl">Gate {g.id} @ {g.x.toFixed(2)} m</span>
              <span className="val">{g.time !== null ? `${g.time.toFixed(3)} s` : '—'}</span>
              <span className="sub">{g.speed !== null ? `${g.speed.toFixed(2)} m/s` : ''}</span>
              <button disabled={g.time === null} onClick={() => { logRead('light-gate', g.id, `Gate ${g.id} time`); logRead('gate-speed', g.id, `Gate ${g.id} speed`) }}>Log</button>
            </div>
          ))}
          <div className="readout">
            <span className="lbl">Cart</span>
            <span className="val">{s.v.toFixed(2)} m/s</span>
            <span className="sub">{s.x.toFixed(2)} m from start · a = {s.a.toFixed(2)} m/s²</span>
            <button onClick={() => { logRead('speedometer', 'cart', 'Cart speed'); logRead('accelerometer', 'cart', 'Cart acceleration'); logRead('ruler', 'cart', 'Cart distance') }}>Log</button>
          </div>
          <figure className="mini-graph" aria-label={graph === 'x' ? 'Distance against time' : 'Speed against time'}>
            <div className="graph-tabs" role="radiogroup" aria-label="Graph">
              <button role="radio" aria-checked={graph === 'x'} className={graph === 'x' ? 'on' : ''} onClick={() => setGraph('x')}>distance</button>
              <button role="radio" aria-checked={graph === 'v'} className={graph === 'v' ? 'on' : ''} onClick={() => setGraph('v')}>speed</button>
            </div>
            <svg viewBox="0 0 200 90">
              <line x1="20" y1="80" x2="195" y2="80" className="axis" />
              <line x1="20" y1="5" x2="20" y2="80" className="axis" />
              {trace.length > 1 && (
                <polyline className="trace" points={trace.map((p) => `${20 + (p.t / tMax) * 175},${80 - (graph === 'x' ? p.x / s.length : p.v / vMax) * 75}`).join(' ')} />
              )}
              <text x="108" y="89" className="ax-label">time</text>
            </svg>
          </figure>
        </div>
      </div>
    </div>
  )
}
