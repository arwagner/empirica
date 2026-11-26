import { useRef, useState } from 'react'
import type { LabEvent, RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { usePlayback } from '../../../ui/usePlayback'
import { useLabSession } from '../../../ui/useLabSession'
import { HitArea } from '../../../ui/HitArea'
import { useHitRadius } from '../../../ui/touch'
import { bubbleRate, FILTERS, lightLevel, type Filter, type PhotoState } from '../rigs/photosynthesis'
import './biology-bench.css'

const SPEEDS = [[1, '×1'], [10, '×10'], [30, '×30']] as const
const TANK_X = 160
const PX_PER_CM = 6
const FILTER_COLOR: Record<Filter, string> = { white: 'transparent', red: '#e0404066', blue: '#3a6fe066', green: '#3aa04a66' }

export function PhotoBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as RigState<object>
  const s = state.rig.state as PhotoState
  const { log } = useLabSession()
  const svg = useRef<SVGSVGElement>(null)
  const hitR = useHitRadius(svg, 900)
  const [drag, setDrag] = useState(false)
  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    return !!((r.state as RigState<object>).rig.state as PhotoState).counting && !r.error
  })
  const rate = bubbleRate(s)
  const lampX = TANK_X + 200 + s.distance * PX_PER_CM
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return
    const r = svg.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 900
    const d = Math.round(Math.max(5, Math.min(100, (x - TANK_X - 200) / PX_PER_CM)))
    if (d !== s.distance) act({ type: 'photo-set', distance: d }, true)
  }
  const endDrag = () => {
    if (drag) log([{ kind: 'action', text: `Moved the lamp to ${s.distance} cm.`, action: { type: 'photo-set' } }])
    setDrag(false)
  }
  const last = s.counts.at(-1)
  const maxLux = Math.max(10000, ...s.counts.map((c) => c.lux))
  const maxN = Math.max(20, ...s.counts.map((c) => c.n))
  const sec = s.counting ? Math.min(60, s.counting.since) : 0

  return (
    <div className="bio-bench">
      <div className="stage">
        <svg ref={svg} className="drag-surface" viewBox="0 0 900 320" onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag} aria-label="Pondweed tank and lamp">
          <rect x={TANK_X} y="70" width="200" height="200" rx="6" fill="#d8ecf2" stroke="#7fa9b5" strokeWidth="3" />
          <path d={`M ${TANK_X + 90} 250 V 120 M ${TANK_X + 90} 140 l -20 -14 M ${TANK_X + 90} 170 l 22 -12 M ${TANK_X + 90} 200 l -18 -12 M ${TANK_X + 90} 225 l 20 -10`} stroke="#3f8f3a" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d={`M ${TANK_X + 70} 80 L ${TANK_X + 110} 80 L ${TANK_X + 100} 118 L ${TANK_X + 80} 118 Z`} fill="#ffffff88" stroke="#7fa9b5" strokeWidth="2" />
          {rate > 0.5 && [...Array(Math.min(12, Math.ceil(rate / 5)))].map((_, i) => (
            <circle key={i} className="bubble-up" cx={TANK_X + 86 + (i % 3) * 4} cy={120} r="2.5" style={{ animationDelay: `${((i * 60) / Math.max(rate, 1) / 4) % 2}s`, animationDuration: `${Math.max(0.6, 3 - rate / 25)}s` }} />
          ))}
          {s.filter !== 'white' && <rect x={TANK_X + 215} y="80" width="10" height="180" fill={FILTER_COLOR[s.filter]} stroke="#0002" />}
          {s.lamp && <polygon points={`${lampX - 20},150 ${TANK_X + 200},90 ${TANK_X + 200},250 ${lampX - 20},190`} fill="#fff3a8" opacity={Math.min(0.5, lightLevel(s) * 0.6 + 0.05)} />}
          <g className="lamp" onPointerDown={(e) => { e.preventDefault(); setDrag(true) }} role="slider" aria-label="Lamp distance" aria-valuenow={s.distance} aria-valuemin={5} aria-valuemax={100} style={{ cursor: 'ew-resize' }}>
            <HitArea cx={lampX - 5} cy={170} r={hitR} />
            <path d={`M ${lampX + 12} 150 L ${lampX - 22} 125 L ${lampX - 22} 215 L ${lampX + 12} 190 Z`} fill="#c0392b" />
            <circle cx={lampX - 18} cy="170" r="13" fill={s.lamp ? '#fff3c4' : '#ccc'} stroke="#999" />
            <rect x={lampX + 10} y="160" width="10" height="110" fill="#555" />
          </g>
          <line x1={TANK_X + 200} x2={lampX - 20} y1="295" y2="295" stroke="#7d776f" strokeWidth="1.5" markerEnd="" />
          <text x={(TANK_X + 200 + lampX) / 2} y="312" textAnchor="middle" className="scale-s">{s.distance} cm</text>
          {!drag && <text x={lampX + 30} y="130" className="hint">drag the lamp</text>}
          {s.counting && <text x={TANK_X + 100} y="50" textAnchor="middle" className="hint">counting… {Math.floor(sec)} s · {s.counting.n} bubbles</text>}
        </svg>
      </div>
      <div className="controls">
        <div className="row">
          <button className="primary" disabled={!!s.counting} onClick={() => { act({ type: 'photo-count' }); pb.setPlaying(true) }}>Count bubbles for 1 minute</button>
          <button disabled={!s.counting} onClick={() => pb.setPlaying(!pb.playing)}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>)}
          </div>
          <label><input type="checkbox" checked={s.lamp} onChange={(e) => act({ type: 'photo-set', lamp: e.target.checked })} /> Lamp on</label>
        </div>
        <div className="row">
          <label>Lamp distance <input type="range" min="5" max="100" value={s.distance} onChange={(e) => act({ type: 'photo-set', distance: Number(e.target.value) }, true)} aria-label="Lamp distance slider" /> {s.distance} cm</label>
          <label>Hydrogen carbonate
            <select value={s.co2} onChange={(e) => act({ type: 'photo-set', co2: Number(e.target.value) })} aria-label="Hydrogen carbonate">
              {[0, 0.05, 0.1, 0.25, 0.5, 1, 2].map((c) => <option key={c} value={c}>{c}%</option>)}
            </select>
          </label>
          <label>Water <input type="range" min="5" max="45" step="5" value={s.tempC} onChange={(e) => act({ type: 'photo-set', tempC: Number(e.target.value) })} aria-label="Water temperature" /> {s.tempC} °C</label>
          <label>Light
            <select value={s.filter} onChange={(e) => act({ type: 'photo-set', filter: e.target.value as Filter })} aria-label="Light filter">
              {(Object.keys(FILTERS) as Filter[]).map((f) => <option key={f} value={f}>{FILTERS[f].name}</option>)}
            </select>
          </label>
        </div>
        <div className="readouts">
          <div className="readout">
            <span className="lbl">Light meter</span>
            <span className="val">{Math.round(lightLevel(s) * 10000)} lux</span>
            <span className="sub">at the plant</span>
          </div>
          <div className="readout">
            <span className="lbl">Last count</span>
            <span className="val">{last ? `${last.n} /min` : '—'}</span>
            <span className="sub">{last ? `${last.lamp ? `${last.distance} cm` : 'dark'}, ${last.co2}%, ${last.tempC} °C` : 'press Count'}</span>
            <button disabled={!last} onClick={() => last && log([{ kind: 'measurement', text: `Bubbles per minute (lamp ${last.distance} cm, ${last.lux} lux, ${last.co2}% HCO₃⁻, ${last.tempC} °C, ${FILTERS[last.filter].name})`, measurement: { quantity: 'bubbles per minute', value: last.n, unit: '/min', instrument: 'bubble-count' } } as LabEvent])}>Log</button>
          </div>
          <figure className="mini-graph" aria-label="Bubbles per minute against light intensity">
            <svg viewBox="0 0 200 90">
              <line x1="20" y1="80" x2="195" y2="80" className="axis" />
              <line x1="20" y1="5" x2="20" y2="80" className="axis" />
              {s.counts.map((c, i) => <circle key={i} cx={20 + (c.lux / maxLux) * 170} cy={80 - (c.n / maxN) * 72} r="3" fill="var(--ui-accent, #2f7d6d)" />)}
              <text x="100" y="89" className="ax-label">light (lux)</text>
              <text x="23" y="10" className="ax-label">bubbles/min</text>
            </svg>
          </figure>
        </div>
      </div>
    </div>
  )
}
