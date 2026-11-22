import { useRef, useState } from 'react'
import type { LabEvent } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import type { PhysicsState } from '../engine'
import { BUMPERS, GLIDER_W, type Bumper, type TrackState } from '../rigs/track'
import { PLANETS, type Planet } from '../world'
import { usePlayback } from './usePlayback'
import './physics-bench.css'

const W = 900
const H = 300
const TRACK_Y = 190
const X0 = 50
const PX_PER_M = 400
const COLOR = { A: '#e1a32a', B: '#2e86ab' }
const SPEEDS = [[1, 'Real time'], [0.25, 'Slow ×¼'], [0.1, 'Slow ×⅒']] as const
const px = (x: number) => X0 + x * PX_PER_M

export function TrackBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as PhysicsState
  const s = state.rig.state as TrackState
  const { log } = useLabSession()
  const svg = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<null | { glider: 'A' | 'B'; what: 'pos' | 'push' }>(null)
  const [trace, setTrace] = useState<{ t: number; vA: number; vB: number }[]>([])
  const t0 = useRef(0)

  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const st = (r.state as PhysicsState).rig.state as TrackState
    setTrace((tr) => [...tr, { t: (r.state as PhysicsState).time - t0.current, vA: st.gliders[0].v, vB: st.gliders[1].v }])
    return st.gliders.some((g) => g.v !== 0) && !r.error
  })

  const launch = () => {
    t0.current = state.time
    const r = act({ type: 'track-launch' })
    const st = (r.state as PhysicsState).rig.state as TrackState
    setTrace([{ t: 0, vA: st.gliders[0].v, vB: st.gliders[1].v }])
    pb.setPlaying(true)
  }
  const reset = () => {
    pb.setPlaying(false)
    setTrace([])
    act({ type: 'track-reset' })
  }

  // Drag a glider to place it; drag its arrow tip to set its push.
  const toX = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect()
    return ((e.clientX - r.left) / r.width) * W
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag || s.launched) return
    const x = toX(e)
    if (drag.what === 'pos') {
      const m = Math.round(Math.max(0.1, Math.min(1.9, (x - X0) / PX_PER_M)) * 20) / 20
      act({ type: 'track-set', [drag.glider === 'A' ? 'xA' : 'xB']: m }, true)
    } else {
      const g = s.gliders.find((gg) => gg.id === drag.glider)!
      const v = Math.round(Math.max(-2, Math.min(2, (x - px(g.x)) / 100)) * 10) / 10
      act({ type: 'track-set', [drag.glider === 'A' ? 'vA' : 'vB']: v }, true)
    }
    setTrace([])
  }
  const endDrag = () => {
    if (drag) log([{ kind: 'action', text: drag.what === 'pos' ? `Moved glider ${drag.glider}.` : `Set glider ${drag.glider}'s push to ${s.push[drag.glider]} m/s.`, action: { type: 'track-set' } }])
    setDrag(null)
  }

  const read = (inst: string, target: string) => sandbox.domain.engine.measure(state, inst, target)
  const logRead = (inst: string, target: string, label: string) => {
    const m = read(inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }
  const fmt = (v: number | undefined, unit: string, dp = 3) => (v === undefined ? '—' : `${v.toFixed(dp)} ${unit}`)
  const running = s.launched && s.gliders.some((g) => g.v !== 0)
  const tMax = Math.max(1, ...trace.map((p) => p.t))
  const vMax = Math.max(0.3, ...trace.flatMap((p) => [Math.abs(p.vA), Math.abs(p.vB)]))

  return (
    <div className="phys-bench">
      <div className="stage">
        <svg ref={svg} viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag} aria-label="Collision track">
          <rect x={X0 - 10} y={TRACK_Y} width={2 * PX_PER_M + 20} height="14" rx="3" className="rail" />
          {[0, 2].map((e) => <rect key={e} x={px(e) - (e ? 0 : 8)} y={TRACK_Y - 30} width="8" height="44" className="stop" />)}
          {[...Array(41)].map((_, i) => (
            <line key={i} x1={px(i * 0.05)} x2={px(i * 0.05)} y1={TRACK_Y + 14} y2={TRACK_Y + (i % 2 ? 19 : 24)} className="tick" />
          ))}
          {[0, 0.5, 1, 1.5, 2].map((m) => <text key={m} x={px(m)} y={TRACK_Y + 38} className="scale">{m} m</text>)}
          {s.gliders.map((g) => {
            const w = GLIDER_W * PX_PER_M
            const h = 26 + g.m * 14
            const push = s.mode === 'push' ? s.push[g.id] : 0
            return (
              <g key={g.id}>
                <g className="glider" onPointerDown={(e) => { e.preventDefault(); if (!s.launched && s.mode === 'push') setDrag({ glider: g.id, what: 'pos' }) }}
                  role="slider" aria-label={`Glider ${g.id} position`} aria-valuenow={g.x}>
                  <rect x={px(g.x) - w / 2} y={TRACK_Y - h} width={w} height={h} rx="4" fill={COLOR[g.id]} />
                  <text x={px(g.x)} y={TRACK_Y - h / 2 + 5} className="glider-label">{g.id} · {g.m} kg</text>
                  {s.bumper === 'sticky' && <rect x={px(g.x) + (g.id === 'A' ? w / 2 - 3 : -w / 2 - 3)} y={TRACK_Y - h + 6} width="6" height={h - 12} className="velcro" />}
                  {s.bumper !== 'sticky' && <path d={g.id === 'A' ? `M ${px(g.x) + w / 2} ${TRACK_Y - h / 2 - 8} q 8 8 0 16` : `M ${px(g.x) - w / 2} ${TRACK_Y - h / 2 - 8} q -8 8 0 16`} className="spring" />}
                </g>
                {!s.launched && s.mode === 'push' && (
                  <g className="push" onPointerDown={(e) => { e.preventDefault(); setDrag({ glider: g.id, what: 'push' }) }} role="slider" aria-label={`Glider ${g.id} push`} aria-valuenow={push}>
                    <line x1={px(g.x)} y1={TRACK_Y - h - 18} x2={px(g.x) + push * 100} y2={TRACK_Y - h - 18} stroke={COLOR[g.id]} />
                    <circle cx={px(g.x) + push * 100} cy={TRACK_Y - h - 18} r="8" fill={COLOR[g.id]} />
                    <text x={px(g.x) + push * 100} y={TRACK_Y - h - 32} className="scale">{push.toFixed(1)} m/s</text>
                  </g>
                )}
              </g>
            )
          })}
          {!s.launched && s.mode === 'push' && !drag && <text x={W / 2} y={30} className="hint" textAnchor="middle">drag a glider to place it · drag its arrow to set its push</text>}
          {s.mode === 'explode' && !s.launched && <text x={W / 2} y={30} className="hint" textAnchor="middle">a compressed spring sits between the gliders</text>}
        </svg>
      </div>

      <div className="controls">
        <div className="row">
          <button className="primary" onClick={launch} disabled={s.launched}>{s.mode === 'explode' ? 'Release spring' : 'Launch'}</button>
          <button onClick={() => pb.setPlaying(!pb.playing)} disabled={!running}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={reset}>Reset</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => (
              <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>
            ))}
          </div>
        </div>
        <div className="row">
          <label>Mode
            <select value={s.mode} onChange={(e) => act({ type: 'track-set', mode: e.target.value as 'push' | 'explode' })} aria-label="Mode">
              <option value="push">Push and collide</option>
              <option value="explode">Spring explosion</option>
            </select>
          </label>
          {(['A', 'B'] as const).map((id, i) => (
            <label key={id}>Glider {id}
              <select value={s.gliders[i].m} onChange={(e) => act({ type: 'track-set', [id === 'A' ? 'mA' : 'mB']: Number(e.target.value) })} aria-label={`Glider ${id} mass`}>
                {[0.25, 0.5, 0.75, 1, 1.5, 2].map((m) => <option key={m} value={m}>{m} kg</option>)}
              </select>
            </label>
          ))}
          {s.mode === 'push' ? (
            <>
              {(['A', 'B'] as const).map((id) => (
                <label key={id}>Push {id} <input type="range" min="-2" max="2" step="0.1" value={s.push[id]} onChange={(e) => act({ type: 'track-set', [id === 'A' ? 'vA' : 'vB']: Number(e.target.value) })} aria-label={`Push ${id}`} /> {s.push[id].toFixed(1)} m/s</label>
              ))}
              <label>Bumpers
                <select value={s.bumper} onChange={(e) => act({ type: 'track-set', bumper: e.target.value as Bumper })} aria-label="Bumpers">
                  {(Object.keys(BUMPERS) as Bumper[]).map((b) => <option key={b} value={b}>{BUMPERS[b].name}</option>)}
                </select>
              </label>
              {s.bumper === 'custom' && <label>Bounciness <input type="range" min="0" max="1" step="0.05" value={s.e} onChange={(e) => act({ type: 'track-set', e: Number(e.target.value) })} aria-label="Bounciness" /> {s.e.toFixed(2)}</label>}
            </>
          ) : (
            <label>Spring energy <input type="range" min="0.02" max="1" step="0.02" value={s.springJ} onChange={(e) => act({ type: 'track-set', springJ: Number(e.target.value) })} aria-label="Spring energy" /> {s.springJ.toFixed(2)} J</label>
          )}
        </div>
        <div className="row world-settings">
          <label>World
            <select value={state.world.planet} onChange={(e) => act({ type: 'set-world', planet: e.target.value as Planet })}>
              {(Object.keys(PLANETS) as Planet[]).map((p) => <option key={p} value={p}>{PLANETS[p].name}</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={state.world.friction} onChange={(e) => act({ type: 'set-world', friction: e.target.checked })} /> Friction</label>
        </div>

        <div className="readouts">
          {s.gliders.map((g) => (
            <div key={g.id} className="readout">
              <span className="lbl">Glider {g.id}</span>
              <span className="val">{fmt(g.v, 'm/s', 2)}</span>
              <span className="sub">p = {(g.m * g.v).toFixed(3)} kg·m/s</span>
              <button onClick={() => logRead('velocity', g.id, `Glider ${g.id} velocity`)}>Log</button>
            </div>
          ))}
          <div className="readout">
            <span className="lbl">Momentum before → after</span>
            <span className="val">{fmt(s.before?.p, '', 3)} → {fmt(s.after?.p, '', 3)}</span>
            <span className="sub">kg·m/s</span>
            <button disabled={!s.after} onClick={() => { logRead('momentum', 'before', 'Total momentum before'); logRead('momentum', 'after', 'Total momentum after') }}>Log</button>
          </div>
          <div className="readout">
            <span className="lbl">Kinetic energy before → after</span>
            <span className="val">{fmt(s.before?.ke, '', 3)} → {fmt(s.after?.ke, '', 3)}</span>
            <span className="sub">J</span>
            <button disabled={!s.after} onClick={() => { logRead('kinetic-energy', 'before', 'Total KE before'); logRead('kinetic-energy', 'after', 'Total KE after') }}>Log</button>
          </div>
          <figure className="mini-graph" aria-label="Velocity of each glider against time">
            <svg viewBox="0 0 200 100">
              <line x1="20" y1="50" x2="195" y2="50" className="axis" />
              <line x1="20" y1="5" x2="20" y2="95" className="axis" />
              {trace.length > 1 && (['A', 'B'] as const).map((id) => (
                <g key={id}>
                  <polyline className="trace-multi" stroke={COLOR[id]} points={trace.map((p) => `${20 + (p.t / tMax) * 165},${50 - ((id === 'A' ? p.vA : p.vB) / vMax) * 42}`).join(' ')} />
                  <text x={188} y={50 - ((id === 'A' ? trace.at(-1)!.vA : trace.at(-1)!.vB) / vMax) * 42 + 3} className="ax-label">{id}</text>
                </g>
              ))}
              <text x="100" y="99" className="ax-label">time</text>
              <text x="3" y="10" className="ax-label">v</text>
            </svg>
          </figure>
        </div>
      </div>
    </div>
  )
}
