import { useRef, useState } from 'react'
import type { LabEvent } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import type { PhysicsState } from '../engine'
import { extension, liveQ, type OscState } from '../rigs/oscillator'
import { PLANETS, type Planet } from '../world'
import { usePlayback } from './usePlayback'
import './physics-bench.css'

const W = 900
const H = 440
const PIVOT = { x: 450, y: 40 }
const PEND_PX = 120 // px per metre of string
const SPRING_PX = 400 // px per metre of stretch
const NATURAL = 0.25 // drawn natural length of the spring, m
const SPEEDS = [[1, 'Real time'], [0.25, 'Slow ×¼'], [0.1, 'Slow ×⅒']] as const

function zigzag(x: number, y0: number, y1: number, coils = 14, w = 14) {
  const pts = [`${x},${y0}`, `${x},${y0 + 8}`]
  const step = (y1 - y0 - 16) / coils
  for (let i = 0; i < coils; i++) pts.push(`${x + (i % 2 ? -w : w)},${y0 + 8 + step * (i + 0.5)}`)
  pts.push(`${x},${y1 - 8}`, `${x},${y1}`)
  return pts.join(' ')
}

export function OscBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as PhysicsState
  const s = state.rig.state as OscState
  const { log } = useLabSession()
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState(false)
  const [trace, setTrace] = useState<{ t: number; q: number }[]>([])

  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const ps = r.state as PhysicsState
    const st = ps.rig.state as OscState
    setTrace((tr) => [...tr.slice(-600), { t: ps.time - st.releasedAt, q: st.q }])
    return st.released && !r.error
  })
  const release = () => {
    setTrace([])
    act({ type: 'osc-release' })
    pb.setPlaying(true)
  }
  const reset = () => {
    pb.setPlaying(false)
    setTrace([])
    act({ type: 'osc-reset' })
  }

  const pendulum = s.mode === 'pendulum'
  const ext = extension(s, state.world)
  const bob = pendulum
    ? { x: PIVOT.x + Math.sin(s.q) * s.length * PEND_PX, y: PIVOT.y + Math.cos(s.q) * s.length * PEND_PX }
    : { x: PIVOT.x, y: PIVOT.y + Math.min(340, (NATURAL + ext + s.q) * SPRING_PX) }

  const onMove = (e: React.PointerEvent) => {
    if (!drag || s.released) return
    const r = svg.current!.getBoundingClientRect()
    const p = { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
    if (pendulum) {
      const deg = Math.round(Math.max(1, Math.min(90, Math.abs((Math.atan2(p.x - PIVOT.x, p.y - PIVOT.y) * 180) / Math.PI))))
      if (deg !== s.angleDeg) act({ type: 'osc-set', angleDeg: deg }, true)
    } else {
      const rest = PIVOT.y + (NATURAL + ext) * SPRING_PX
      const pull = Math.round(Math.max(0.005, Math.min(0.3, (p.y - rest) / SPRING_PX)) * 200) / 200
      if (pull !== s.pull) act({ type: 'osc-set', pull }, true)
    }
    setTrace([])
  }
  const endDrag = () => {
    if (drag) log([{ kind: 'action', text: pendulum ? `Pulled the pendulum back to ${s.angleDeg}°.` : `Pulled the mass ${(s.pull * 100).toFixed(1)} cm below equilibrium.`, action: { type: 'osc-set' } }])
    setDrag(false)
  }

  const read = (inst: string, target: string) => sandbox.domain.engine.measure(state, inst, target)
  const logRead = (inst: string, target: string, label: string) => {
    const m = read(inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }
  const qMax = Math.max(pendulum ? (s.angleDeg * Math.PI) / 180 : s.pull, ...trace.map((p) => Math.abs(p.q)), 1e-3)
  const tSpan = trace.length ? Math.max(5, trace.at(-1)!.t - trace[0].t) : 5
  const tStart = trace[0]?.t ?? 0
  const bobR = 8 + Math.cbrt(s.mass) * 8

  return (
    <div className="phys-bench">
      <div className="stage">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag} aria-label={pendulum ? 'Pendulum' : 'Mass on a spring'}>
          <rect x={PIVOT.x - 140} y={PIVOT.y - 16} width="280" height="12" className="stop" />
          {pendulum ? (
            <>
              <line x1={PIVOT.x} y1={PIVOT.y} x2={PIVOT.x} y2={PIVOT.y + s.length * PEND_PX + 30} className="rest-line" />
              <rect x={PIVOT.x - 3} y={PIVOT.y + s.length * PEND_PX + 14} width="6" height="22" className="gate-mark" />
              <line x1={PIVOT.x} y1={PIVOT.y} x2={bob.x} y2={bob.y} className="string" />
              <circle cx={PIVOT.x} cy={PIVOT.y} r="4" className="pivot" />
              {!s.released && (
                <path d={`M ${PIVOT.x} ${PIVOT.y + 50} A 50 50 0 0 0 ${PIVOT.x + Math.sin(s.q) * 50} ${PIVOT.y + Math.cos(s.q) * 50}`} className="arc" />
              )}
            </>
          ) : (
            <>
              <polyline points={zigzag(PIVOT.x, PIVOT.y - 4, bob.y - bobR)} className="spring-coil" />
              {/* ruler beside the spring, 0 at the spring's natural end */}
              <g className="ruler">
                <rect x={PIVOT.x + 60} y={PIVOT.y + NATURAL * SPRING_PX} width="36" height={0.8 * SPRING_PX} />
                {[...Array(81)].map((_, i) => (
                  <line key={i} x1={PIVOT.x + 60} x2={PIVOT.x + 60 + (i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6)} y1={PIVOT.y + (NATURAL + i / 100) * SPRING_PX} y2={PIVOT.y + (NATURAL + i / 100) * SPRING_PX} />
                ))}
                {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((cm) => <text key={cm} x={PIVOT.x + 100} y={PIVOT.y + (NATURAL + cm / 100) * SPRING_PX + 4}>{cm}</text>)}
                <text x={PIVOT.x + 60} y={PIVOT.y + NATURAL * SPRING_PX - 8}>cm</text>
              </g>
              <line x1={PIVOT.x - 40} x2={PIVOT.x + 58} y1={PIVOT.y + (NATURAL + ext) * SPRING_PX} y2={PIVOT.y + (NATURAL + ext) * SPRING_PX} className="rest-line" />
            </>
          )}
          <circle cx={bob.x} cy={bob.y} r={bobR} className={pendulum ? 'bob' : 'bob weight-bob'} onPointerDown={(e) => { e.preventDefault(); if (!s.released) setDrag(true) }}
            role="slider" aria-label={pendulum ? 'Release angle' : 'Pull distance'} aria-valuenow={pendulum ? s.angleDeg : s.pull} />
          {!s.released && !drag && <text x={bob.x + bobR + 10} y={bob.y + 4} className="hint">{pendulum ? 'drag to pull back' : 'drag down to stretch'}</text>}
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
          <span className="clock">t = {(s.released ? state.time - s.releasedAt : 0).toFixed(2)} s</span>
        </div>
        <div className="row">
          <label>Rig
            <select value={s.mode} onChange={(e) => act({ type: 'osc-set', mode: e.target.value as OscState['mode'] })} aria-label="Rig">
              <option value="pendulum">Pendulum</option>
              <option value="spring">Mass on a spring</option>
            </select>
          </label>
          <label>Mass
            <select value={s.mass} onChange={(e) => act({ type: 'osc-set', mass: Number(e.target.value) })} aria-label="Mass">
              {[0.05, 0.1, 0.2, 0.3, 0.5, 1].map((m) => <option key={m} value={m}>{m * 1000} g</option>)}
            </select>
          </label>
          {pendulum ? (
            <>
              <label>Length <input type="range" min="0.1" max="3" step="0.05" value={s.length} onChange={(e) => act({ type: 'osc-set', length: Number(e.target.value) })} aria-label="Length" /> {s.length.toFixed(2)} m</label>
              <label>Release angle <input type="range" min="1" max="90" value={s.angleDeg} onChange={(e) => act({ type: 'osc-set', angleDeg: Number(e.target.value) })} aria-label="Release angle" /> {s.angleDeg}°</label>
            </>
          ) : (
            <>
              <label>Spring constant
                <select value={s.k} onChange={(e) => act({ type: 'osc-set', k: Number(e.target.value) })} aria-label="Spring constant">
                  {[5, 10, 20, 40, 80, 150].map((k) => <option key={k} value={k}>{k} N/m</option>)}
                </select>
              </label>
              <label>Pull <input type="range" min="0.005" max="0.3" step="0.005" value={s.pull} onChange={(e) => act({ type: 'osc-set', pull: Number(e.target.value) })} aria-label="Pull" /> {(s.pull * 100).toFixed(1)} cm</label>
            </>
          )}
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
          <div className="readout">
            <span className="lbl">Period (light gate)</span>
            <span className="val">{s.period !== null ? `${s.period.toFixed(3)} s` : '—'}</span>
            <span className="sub">{s.swings} full swing{s.swings === 1 ? '' : 's'}</span>
            <button disabled={s.period === null} onClick={() => logRead('period', 'bob', 'Period')}>Log</button>
          </div>
          <div className="readout">
            <span className="lbl">Stopwatch: 10 swings</span>
            <span className="val">{s.tenSwings !== null ? `${s.tenSwings.toFixed(2)} s` : '—'}</span>
            <span className="sub">{s.tenSwings !== null ? `÷ 10 = ${(s.tenSwings / 10).toFixed(3)} s` : 'counting…'}</span>
            <button disabled={s.tenSwings === null} onClick={() => logRead('stopwatch', 'bob', 'Time for 10 swings')}>Log</button>
          </div>
          {pendulum ? (
            <div className="readout">
              <span className="lbl">Length · angle</span>
              <span className="val">{s.length.toFixed(2)} m</span>
              <span className="sub">{((s.q * 180) / Math.PI).toFixed(1)}° now</span>
              <button onClick={() => logRead('ruler', 'length', 'Pendulum length')}>Log</button>
            </div>
          ) : (
            <div className="readout">
              <span className="lbl">Extension · tension</span>
              <span className="val">{((ext + liveQ(s)) * 100).toFixed(1)} cm</span>
              <span className="sub">{(s.k * (ext + liveQ(s))).toFixed(2)} N (force meter)</span>
              <button onClick={() => { logRead('ruler', 'extension', 'Spring extension'); logRead('force-meter', 'spring', 'Spring tension') }}>Log</button>
            </div>
          )}
          <figure className="mini-graph" aria-label={pendulum ? 'Angle against time' : 'Displacement against time'}>
            <svg viewBox="0 0 200 90">
              <line x1="20" y1="45" x2="195" y2="45" className="axis" />
              <line x1="20" y1="5" x2="20" y2="85" className="axis" />
              {trace.length > 1 && <polyline className="trace" points={trace.map((p) => `${20 + ((p.t - tStart) / tSpan) * 175},${45 - (p.q / qMax) * 38}`).join(' ')} />}
              <text x="100" y="89" className="ax-label">time</text>
              <text x="3" y="10" className="ax-label">{pendulum ? 'θ' : 'y'}</text>
            </svg>
          </figure>
        </div>
      </div>
    </div>
  )
}
