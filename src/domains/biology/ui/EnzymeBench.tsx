import { useState } from 'react'
import type { LabEvent, RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { usePlayback } from '../../../ui/usePlayback'
import { useLabSession } from '../../../ui/useLabSession'
import { ENZYME_SOURCES, type EnzymeSource, type EnzymeState } from '../rigs/enzymes'
import './biology-bench.css'

const SPEEDS = [[1, '×1'], [5, '×5'], [20, '×20']] as const
const bathColor = (t: number) => {
  const f = Math.min(1, t / 90)
  return `rgb(${Math.round(120 + 135 * f)}, ${Math.round(190 - 60 * f)}, ${Math.round(230 - 150 * f)})`
}

export function EnzymeBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as RigState<object>
  const s = state.rig.state as EnzymeState
  const { log } = useLabSession()
  const [trace, setTrace] = useState<{ t: number; v: number }[]>([])
  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const st = (r.state as RigState<object>).rig.state as EnzymeState
    setTrace((tr) => [...tr, { t: st.elapsed, v: st.o2 }])
    return st.running && !st.stopped && !r.error
  })
  const start = () => {
    setTrace([{ t: 0, v: 0 }])
    act({ type: 'enz-start' })
    pb.setPlaying(true)
  }
  const set = (patch: Record<string, unknown>) => {
    pb.setPlaying(false)
    setTrace([])
    act({ type: 'enz-set', ...patch })
  }
  const logRead = (inst: string, target: string, label: string) => {
    const m = sandbox.domain.engine.measure(state, inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }
  const fizz = s.running && !s.stopped && s.source !== 'none' && !s.boiled
  const plunger = (s.o2 / 100) * 220
  const tMax = Math.max(60, ...trace.map((p) => p.t))

  return (
    <div className="bio-bench">
      <div className="stage">
        <svg viewBox="0 0 900 340" aria-label="Enzyme reaction apparatus">
          <rect x="120" y="150" width="260" height="160" rx="10" fill={bathColor(s.tempC)} opacity="0.55" stroke="#8d969b" strokeWidth="3" />
          <text x="250" y="330" textAnchor="middle" className="hint">water bath {s.tempC} °C</text>
          <path d="M 220 60 V 270 a 30 30 0 0 0 60 0 V 60" fill="#ffffffaa" stroke="#7fa9b5" strokeWidth="3" />
          <rect x="223" y="150" width="54" height="148" fill="#dfeef2" />
          <ellipse cx="250" cy="295" rx="20" ry="8" fill={s.source === 'liver' ? '#7a2c25' : s.source === 'potato' ? '#e8dca8' : 'transparent'} opacity={s.running ? 1 : 0.5} />
          {fizz && [...Array(10)].map((_, i) => (
            <circle key={i} className="bubble-up" cx={232 + (i * 7) % 36} cy={290} r={2 + (i % 3)} style={{ animationDelay: `${(i * 0.13).toFixed(2)}s`, animationDuration: `${Math.max(0.4, 1.6 - s.active)}s` }} />
          ))}
          <rect x="214" y="48" width="72" height="16" rx="3" fill="#7d5a3c" />
          <path d="M 250 48 V 30 H 520 V 110" fill="none" stroke="#7fa9b5" strokeWidth="5" />
          <rect x="500" y="110" width="260" height="44" rx="6" fill="#ffffffaa" stroke="#7fa9b5" strokeWidth="3" />
          {[...Array(11)].map((_, i) => (
            <g key={i}><line x1={510 + i * 22} x2={510 + i * 22} y1="110" y2={i % 5 ? 118 : 124} stroke="#556" /><text x={510 + i * 22} y="170" className="scale-s" textAnchor="middle">{i % 5 === 0 ? i * 10 : ''}</text></g>
          ))}
          <rect x="510" y="116" width={plunger} height="32" fill="#cfe9f0" />
          <rect x={510 + plunger} y="114" width="8" height="36" fill="#555" />
          <line x1={518 + plunger} y1="132" x2={790} y2="132" stroke="#555" strokeWidth="4" />
          <text x="630" y="200" textAnchor="middle" className="hint">gas syringe (mL)</text>
        </svg>
      </div>
      <div className="controls">
        <div className="row">
          <button className="primary" onClick={start} disabled={s.running}>Add enzyme &amp; start</button>
          <button onClick={() => pb.setPlaying(!pb.playing)} disabled={!s.running || s.stopped}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={() => { pb.setPlaying(false); setTrace([]); act({ type: 'enz-reset' }) }}>Reset</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>)}
          </div>
          <span className="clock">t = {s.elapsed.toFixed(1)} s</span>
        </div>
        <div className="row">
          <label>Temperature <input type="range" min="0" max="90" step="5" value={s.tempC} onChange={(e) => set({ tempC: Number(e.target.value) })} aria-label="Temperature" /> {s.tempC} °C</label>
          <label>Buffer
            <select value={s.pH} onChange={(e) => set({ pH: Number(e.target.value) })} aria-label="Buffer pH">
              {[3, 4, 5, 6, 7, 8, 9, 10, 11].map((p) => <option key={p} value={p}>pH {p}</option>)}
            </select>
          </label>
          <label>H₂O₂ <input type="range" min="0.5" max="6" step="0.5" value={s.substratePct} onChange={(e) => set({ substratePct: Number(e.target.value) })} aria-label="Hydrogen peroxide concentration" /> {s.substratePct}%</label>
          <label>Enzyme
            <select value={s.source} onChange={(e) => set({ source: e.target.value as EnzymeSource })} aria-label="Enzyme source">
              {(Object.keys(ENZYME_SOURCES) as EnzymeSource[]).map((k) => <option key={k} value={k}>{ENZYME_SOURCES[k].name}</option>)}
            </select>
          </label>
          <label>Amount
            <select value={s.amount} onChange={(e) => set({ amount: Number(e.target.value) })} aria-label="Enzyme amount">
              {[0.25, 0.5, 1, 2, 3, 5].map((g) => <option key={g} value={g}>{g} g</option>)}
            </select>
          </label>
          <label><input type="checkbox" checked={s.boiled} onChange={(e) => set({ boiled: e.target.checked })} /> Boil it first</label>
        </div>
        <div className="readouts">
          <div className="readout">
            <span className="lbl">Oxygen collected</span>
            <span className="val">{s.o2.toFixed(1)} mL</span>
            <span className="sub">{s.full ? 'syringe full' : s.stopped ? 'reaction over' : ''}</span>
            <button onClick={() => { logRead('gas-syringe', 'oxygen', 'Oxygen collected'); logRead('timer', 'reaction', 'Time') }}>Log</button>
          </div>
          <div className="readout">
            <span className="lbl">Initial rate (first 30 s)</span>
            <span className="val">{s.at30 !== null ? `${(s.at30 / 30).toFixed(3)} mL/s` : '—'}</span>
            <span className="sub">at {s.tempC} °C, pH {s.pH}, {s.substratePct}%</span>
            <button disabled={s.at30 === null} onClick={() => logRead('initial-rate', 'oxygen', `Initial rate (${s.tempC} °C, pH ${s.pH}, ${s.substratePct}% H₂O₂, ${s.amount} g ${ENZYME_SOURCES[s.source].name})`)}>Log</button>
          </div>
          <figure className="mini-graph" aria-label="Oxygen volume against time">
            <svg viewBox="0 0 200 90">
              <line x1="20" y1="80" x2="195" y2="80" className="axis" />
              <line x1="20" y1="5" x2="20" y2="80" className="axis" />
              {trace.length > 1 && <polyline className="trace" points={trace.map((p) => `${20 + (p.t / tMax) * 175},${80 - (p.v / 100) * 75}`).join(' ')} />}
              <text x="100" y="89" className="ax-label">time</text>
              <text x="3" y="10" className="ax-label">O₂</text>
            </svg>
          </figure>
        </div>
      </div>
    </div>
  )
}
