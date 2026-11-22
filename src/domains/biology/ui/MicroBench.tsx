import { useState } from 'react'
import type { LabEvent, RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { usePlayback } from '../../../ui/usePlayback'
import { useLabSession } from '../../../ui/useLabSession'
import { ANTIBIOTICS, lawn, ORGANISMS, zoneDiameter, type Antibiotic, type MicroState, type Organism } from '../rigs/microbiology'
import './biology-bench.css'

const SPEEDS = [[600, '10 min/s'], [3600, '1 h/s'], [14400, '4 h/s']] as const
const DISH_R = 160
const PX_PER_MM = (2 * DISH_R) / 90
const DISC_POS = [[-70, -70], [70, -70], [-70, 70], [70, 70]] as const

export function MicroBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as RigState<object>
  const s = state.rig.state as MicroState
  const { log } = useLabSession()
  const [trace, setTrace] = useState<{ h: number; n: number }[]>([])
  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs }, true)
    const st = (r.state as RigState<object>).rig.state as MicroState
    if (st.mode === 'broth') setTrace((t) => [...t, { h: st.hours, n: st.n }])
    return st.incubating && st.hours < 72 && !r.error
  })
  const set = (patch: Record<string, unknown>) => {
    pb.setPlaying(false)
    setTrace([])
    act({ type: 'micro-set', ...patch })
  }
  const logRead = (inst: string, target: string, label: string) => {
    const m = sandbox.domain.engine.measure(state, inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }
  const density = s.inoculated && s.mode !== 'broth' ? lawn(s.organism, s.tempC, s.hours) : 0
  const org = ORGANISMS[s.organism]
  const real = s.colonies.filter((c) => !c.contaminant).length
  const colonyR = Math.min(2.5, density * 3) * PX_PER_MM
  const od = s.mode === 'broth' && s.inoculated ? Math.min(2.5, s.n / 1e9) : 0
  const hMax = Math.max(24, ...trace.map((p) => p.h))

  return (
    <div className="bio-bench">
      <div className="stage">
        {s.mode === 'broth' ? (
          <svg viewBox="0 0 900 320" aria-label="Broth culture flask">
            <path d="M 400 40 h 40 v 70 l 70 160 a 15 15 0 0 1 -14 20 h -152 a 15 15 0 0 1 -14 -20 l 70 -160 z" fill="#f6efd6" stroke="#7fa9b5" strokeWidth="3" />
            <path d="M 357 200 h 126 l 27 70 a 15 15 0 0 1 -14 20 h -152 a 15 15 0 0 1 -14 -20 z" fill="#d8c88a" opacity={0.15 + Math.min(0.8, od / 2)} />
            <text x="420" y="315" textAnchor="middle" className="hint">{s.inoculated ? `${s.hours.toFixed(0)} h at ${s.tempC} °C` : 'nutrient broth'}</text>
          </svg>
        ) : (
          <svg viewBox="-200 -190 400 380" aria-label="Agar plate">
            <circle r={DISH_R + 10} fill="#f5f7f6" stroke="#9fb0b5" strokeWidth="3" />
            <circle r={DISH_R} fill="#d6bf68" />
            {s.mode === 'antibiotics' && density > 0.02 && <circle r={DISH_R} fill={org.color} opacity={Math.min(0.95, density)} />}
            {s.mode === 'antibiotics' && density > 0.3 && s.discs.map((d, i) => d && (
              <circle key={`z${i}`} cx={DISC_POS[i][0]} cy={DISC_POS[i][1]} r={(zoneDiameter(s.organism, d) / 2) * PX_PER_MM} fill="#d6bf68" />
            ))}
            {s.mode === 'antibiotics' && s.discs.map((d, i) => d && (
              <g key={i}>
                <circle cx={DISC_POS[i][0]} cy={DISC_POS[i][1]} r={3 * PX_PER_MM} fill="#fff" stroke="#bbb" />
                <text x={DISC_POS[i][0]} y={DISC_POS[i][1] + 3} textAnchor="middle" className="disc-label">{d === 'blank' ? '—' : d.slice(0, 3).toUpperCase()}</text>
              </g>
            ))}
            {colonyR > 0.4 && s.colonies.slice(0, 1500).map((c, i) => c.contaminant
              ? <circle key={i} cx={c.x * DISH_R} cy={c.y * DISH_R} r={colonyR * 2.2} fill="#7d9c5e" opacity="0.8" stroke="#55703f" strokeDasharray="2 2" />
              : <circle key={i} cx={c.x * DISH_R} cy={c.y * DISH_R} r={colonyR} fill={org.color} stroke="#0002" />)}
            {!s.inoculated && <text textAnchor="middle" className="hint" y="4">fresh nutrient agar</text>}
          </svg>
        )}
      </div>
      <div className="controls">
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="Experiment">
            {(['antibiotics', 'count', 'broth'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={s.mode === m} className={s.mode === m ? 'on' : ''} onClick={() => set({ mode: m })}>{m === 'antibiotics' ? 'Antibiotic discs' : m === 'count' ? 'Colony count' : 'Growth curve'}</button>
            ))}
          </div>
          <label>Bacteria
            <select value={s.organism} onChange={(e) => set({ organism: e.target.value as Organism })} aria-label="Bacteria">
              {(Object.keys(ORGANISMS) as Organism[]).map((o) => <option key={o} value={o}>{ORGANISMS[o].name} (Gram {ORGANISMS[o].gram})</option>)}
            </select>
          </label>
          <label>Incubator <input type="range" min="4" max="50" step="1" value={s.tempC} onChange={(e) => act({ type: 'micro-set', tempC: Number(e.target.value) })} aria-label="Incubator temperature" /> {s.tempC} °C</label>
        </div>
        <div className="row">
          {s.mode === 'antibiotics' && s.discs.map((d, i) => (
            <select key={i} value={d ?? ''} onChange={(e) => { const discs = [...s.discs]; discs[i] = (e.target.value || null) as Antibiotic | null; set({ discs }) }} aria-label={`Disc ${i + 1}`}>
              <option value="">(no disc)</option>
              {(Object.keys(ANTIBIOTICS) as Antibiotic[]).map((a) => <option key={a} value={a}>{ANTIBIOTICS[a]}</option>)}
            </select>
          ))}
          {s.mode === 'count' && (
            <label>Dilution
              <select value={s.dilution} onChange={(e) => set({ dilution: Number(e.target.value) })} aria-label="Dilution">
                {[3, 4, 5, 6, 7, 8].map((d) => <option key={d} value={d}>10⁻{d}</option>)}
              </select>
            </label>
          )}
          {s.mode !== 'broth' && <label><input type="checkbox" checked={s.flamed} onChange={(e) => set({ flamed: e.target.checked })} /> Flame the loop &amp; keep the lid on</label>}
        </div>
        <div className="row">
          <button className="primary" disabled={s.inoculated} onClick={() => act({ type: 'micro-inoculate' })}>Inoculate</button>
          <button disabled={!s.inoculated || s.incubating} onClick={() => { act({ type: 'micro-incubate' }); pb.setPlaying(true) }}>Incubate</button>
          <button disabled={!s.incubating} onClick={() => pb.setPlaying(!pb.playing)}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={() => { pb.setPlaying(false); setTrace([]); act({ type: 'micro-reset' }) }}>Reset</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS.map(([v, label]) => <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>)}
          </div>
          <span className="clock">{s.hours.toFixed(1)} h</span>
        </div>
        <div className="readouts">
          {s.mode === 'antibiotics' && s.discs.map((d, i) => d && (
            <div key={i} className="readout">
              <span className="lbl">{ANTIBIOTICS[d]}</span>
              <span className="val">{density > 0.5 ? `${Math.round(zoneDiameter(s.organism, d))} mm` : '—'}</span>
              <span className="sub">zone diameter</span>
              <button disabled={density <= 0.5} onClick={() => logRead('ruler', `zone:${i}`, `${ANTIBIOTICS[d]} zone (${org.name})`)}>Log</button>
            </div>
          ))}
          {s.mode === 'count' && (
            <div className="readout">
              <span className="lbl">Colonies</span>
              <span className="val">{density > 0.5 ? (real > 300 ? 'too many' : real) : '—'}</span>
              <span className="sub">{density > 0.5 && real <= 300 && real > 0 ? `→ ${(real * 10 ** s.dilution * 10).toExponential(1)} per mL` : '30–300 is countable'}</span>
              <button disabled={density <= 0.5 || real > 300} onClick={() => { logRead('colony-counter', 'plate', `Colonies (10⁻${s.dilution})`); logRead('cells-per-ml', 'culture', 'Cells per mL in the culture') }}>Log</button>
            </div>
          )}
          {s.mode === 'broth' && (
            <>
              <div className="readout">
                <span className="lbl">Optical density</span>
                <span className="val">{od.toFixed(3)}</span>
                <span className="sub">{s.phase ? `${s.phase} phase` : ''}</span>
                <button disabled={!s.inoculated} onClick={() => logRead('od-meter', 'broth', `OD₆₀₀ at ${s.hours.toFixed(0)} h`)}>Log</button>
              </div>
              <figure className="mini-graph" aria-label="Bacteria per mL (log scale) against time">
                <svg viewBox="0 0 200 90">
                  <line x1="20" y1="80" x2="195" y2="80" className="axis" />
                  <line x1="20" y1="5" x2="20" y2="80" className="axis" />
                  {trace.length > 1 && <polyline className="trace" points={trace.map((p) => `${20 + (p.h / hMax) * 175},${80 - ((Math.log10(Math.max(1e6, p.n)) - 6) / 3.5) * 75}`).join(' ')} />}
                  <text x="100" y="89" className="ax-label">hours</text>
                  <text x="23" y="10" className="ax-label">log cells/mL</text>
                </svg>
              </figure>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
