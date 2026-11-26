import { useRef, useState } from 'react'
import type { LabEvent } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { HitArea } from '../../../ui/HitArea'
import { useHitRadius } from '../../../ui/touch'
import type { PhysicsState } from '../engine'
import { BALLS, type Ball, type LauncherState } from '../rigs/launcher'
import { PLANETS, type Planet } from '../world'
import { usePlayback } from '../../../ui/usePlayback'
import './physics-bench.css'

const W = 900
const H = 420
const FLOOR = 380
const X0 = 50
const PX = 32 // px per metre
const SPEEDS = [[1, 'Real time'], [0.25, 'Slow ×¼'], [0.1, 'Slow ×⅒']] as const
const sx = (x: number) => X0 + x * PX
const sy = (y: number) => FLOOR - y * PX

export function LauncherBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as PhysicsState
  const s = state.rig.state as LauncherState
  const { log } = useLabSession()
  const svg = useRef<SVGSVGElement>(null)
  const hitR = useHitRadius(svg, W)
  const [drag, setDrag] = useState<null | 'angle' | 'target'>(null)
  const [trail, setTrail] = useState<[number, number][]>([])

  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const st = (r.state as PhysicsState).rig.state as LauncherState
    setTrail((t) => [...t, [st.x, st.y]])
    return st.flying && !r.error
  })
  const fire = () => {
    setTrail([[0, s.height]])
    act({ type: 'launch-fire' })
    pb.setPlaying(true)
  }

  const toLocal = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag || s.flying) return
    const p = toLocal(e)
    if (drag === 'angle') {
      const deg = Math.round(Math.max(0, Math.min(90, (Math.atan2(sy(s.height) - p.y, p.x - X0) * 180) / Math.PI)))
      if (deg !== s.angleDeg) act({ type: 'launch-set', angleDeg: deg }, true)
    } else {
      const x = Math.round(Math.max(1, Math.min(25, (p.x - X0) / PX)) * 4) / 4
      if (x !== s.targetX) act({ type: 'launch-set', targetX: x }, true)
    }
  }
  const endDrag = () => {
    if (drag) log([{ kind: 'action', text: drag === 'angle' ? `Aimed the launcher at ${s.angleDeg}°.` : `Moved the target to ${s.targetX} m.`, action: { type: 'launch-set' } }])
    setDrag(null)
  }
  const logRead = (inst: string, target: string, label: string) => {
    const m = sandbox.domain.engine.measure(state, inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }

  const th = (s.angleDeg * Math.PI) / 180
  const base = { x: X0, y: sy(s.height) }
  const tip = { x: base.x + Math.cos(th) * 46, y: base.y - Math.sin(th) * 46 }
  const ballR = Math.max(3, BALLS[s.ball].r * 260)

  return (
    <div className="phys-bench">
      <div className="stage">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag} aria-label={`Launcher aimed at ${s.angleDeg} degrees`}>
          <line x1="0" y1={FLOOR} x2={W} y2={FLOOR} className="floor" />
          {[...Array(26)].map((_, i) => (
            <g key={i}>
              <line x1={sx(i)} x2={sx(i)} y1={FLOOR} y2={FLOOR + (i % 5 ? 5 : 10)} className="tick" />
              {i % 5 === 0 && <text x={sx(i)} y={FLOOR + 24} className="scale">{i} m</text>}
            </g>
          ))}
          <g className="target" onPointerDown={(e) => { e.preventDefault(); setDrag('target') }} role="slider" aria-label="Target position" aria-valuenow={s.targetX}>
            <HitArea cx={sx(s.targetX)} cy={FLOOR} r={hitR} />
            <ellipse cx={sx(s.targetX)} cy={FLOOR} rx={0.25 * PX} ry="5" fill="#c0392b" />
            <ellipse cx={sx(s.targetX)} cy={FLOOR} rx={0.15 * PX} ry="3" fill="#f4f1e8" />
            <ellipse cx={sx(s.targetX)} cy={FLOOR} rx={0.06 * PX} ry="1.5" fill="#c0392b" />
            <text x={sx(s.targetX)} y={FLOOR - 10} className="scale">target</text>
          </g>
          {s.shots.map((sh, i) => (
            <g key={i} opacity={0.35 + (0.65 * (i + 1)) / s.shots.length}>
              <line x1={sx(sh.range)} x2={sx(sh.range)} y1={FLOOR - 8} y2={FLOOR} className="mark" />
              <text x={sx(sh.range)} y={FLOOR - 12} className="mark-label">{sh.angleDeg}°</text>
            </g>
          ))}
          {trail.length > 1 && <polyline className="trajectory" points={trail.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} />}
          {s.height > 0 && <rect x={X0 - 22} y={sy(s.height)} width="44" height={s.height * PX} className="platform" />}
          <line x1={base.x} y1={base.y} x2={tip.x} y2={tip.y} className="barrel" />
          <circle cx={base.x} cy={base.y} r="12" className="launcher-base" />
          <g onPointerDown={(e) => { e.preventDefault(); setDrag('angle') }}
            role="slider" aria-label="Launch angle handle" aria-valuenow={s.angleDeg} aria-valuemin={0} aria-valuemax={90}>
            <HitArea cx={tip.x} cy={tip.y} r={hitR} />
            <circle cx={tip.x} cy={tip.y} r="9" className="handle" />
          </g>
          <text x={base.x + 20} y={base.y + 26} className="angle-label">{s.angleDeg}°</text>
          {(s.flying || s.landed) && <circle cx={sx(s.x)} cy={sy(s.y) - ballR} r={ballR} className="ball" />}
          {!s.flying && !s.landed && !drag && <text x={tip.x + 16} y={tip.y - 8} className="hint">drag to aim · drag the target</text>}
        </svg>
      </div>

      <div className="controls">
        <div className="row">
          <button className="primary" onClick={fire} disabled={s.flying}>Fire</button>
          <button onClick={() => pb.setPlaying(!pb.playing)} disabled={!s.flying}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={() => { pb.setPlaying(false); setTrail([]); act({ type: 'launch-clear' }) }}>Clear marks</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => (
              <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="row">
          <label>Angle <input type="range" min="0" max="90" value={s.angleDeg} onChange={(e) => act({ type: 'launch-set', angleDeg: Number(e.target.value) })} aria-label="Angle" /> {s.angleDeg}°</label>
          <label>Speed <input type="range" min="1" max="15" step="0.5" value={s.speed} onChange={(e) => act({ type: 'launch-set', speed: Number(e.target.value) })} aria-label="Speed" /> {s.speed} m/s</label>
          <label>Launch height <input type="range" min="0" max="2" step="0.25" value={s.height} onChange={(e) => act({ type: 'launch-set', height: Number(e.target.value) })} aria-label="Launch height" /> {s.height} m</label>
          <label>Ball
            <select value={s.ball} onChange={(e) => act({ type: 'launch-set', ball: e.target.value as Ball })} aria-label="Ball">
              {(Object.keys(BALLS) as Ball[]).map((b) => <option key={b} value={b}>{BALLS[b].name}</option>)}
            </select>
          </label>
        </div>
        <div className="row world-settings">
          <label>World
            <select value={state.world.planet} onChange={(e) => act({ type: 'set-world', planet: e.target.value as Planet })}>
              {(Object.keys(PLANETS) as Planet[]).map((p) => <option key={p} value={p}>{PLANETS[p].name}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={state.world.air} onChange={(e) => act({ type: 'set-world', air: e.target.checked })} /> Air resistance</label>
        </div>
        <div className="readouts">
          <div className="readout">
            <span className="lbl">Range (tape)</span>
            <span className="val">{s.landed ? `${s.landed.range.toFixed(2)} m` : '—'}</span>
            <span className="sub">target at {s.targetX} m</span>
            <button disabled={!s.landed} onClick={() => logRead('tape', 'range', 'Range')}>Log</button>
          </div>
          <div className="readout">
            <span className="lbl">Highest point · flight time</span>
            <span className="val">{s.landed || s.flying ? `${s.maxHeight.toFixed(2)} m` : '—'}</span>
            <span className="sub">{s.landed ? `${s.landed.time.toFixed(2)} s in the air` : ''}</span>
            <button disabled={!s.landed} onClick={() => { logRead('height-gauge', 'ball', 'Highest point'); logRead('flight-timer', 'ball', 'Flight time') }}>Log</button>
          </div>
          <table className="shots" aria-label="Recent shots">
            <thead><tr><th>angle</th><th>speed</th><th>ball</th><th>range</th></tr></thead>
            <tbody>
              {s.shots.slice(-5).reverse().map((sh, i) => (
                <tr key={i}><td>{sh.angleDeg}°</td><td>{sh.speed}</td><td>{BALLS[sh.ball].name.split(' ')[0]}</td><td>{sh.range.toFixed(2)} m</td></tr>
              ))}
              {s.shots.length === 0 && <tr><td colSpan={4} className="none">no shots yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
