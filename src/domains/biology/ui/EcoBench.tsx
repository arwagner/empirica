import type { LabEvent, RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { usePlayback } from '../../../ui/usePlayback'
import { useLabSession } from '../../../ui/useLabSession'
import { useEffect } from 'react'
import { darkFraction, YEAR, type EcoState } from '../rigs/ecology'
import './biology-bench.css'

const SPEEDS = { 'predator-prey': [[0.5, '½ yr/s'], [2, '2 yr/s'], [5, '5 yr/s']], selection: [[1, '1 gen/s'], [5, '5 gen/s'], [20, '20 gen/s']] } as const
const RABBIT = '#2a78d6'
const FOX = '#eb6834'

/** Deterministic scatter for drawing animals/moths. */
function spots(n: number, seed: number, w: number, h: number) {
  const out: [number, number][] = []
  let x = seed
  for (let i = 0; i < n; i++) {
    x = (x * 1103515245 + 12345) % 2147483648
    const a = x / 2147483648
    x = (x * 1103515245 + 12345) % 2147483648
    out.push([a * w, (x / 2147483648) * h])
  }
  return out
}

export function EcoBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as RigState<object>
  const s = state.rig.state as EcoState
  const { log } = useLabSession()
  const act = (a: Parameters<typeof apply>[0], quiet = false) => apply(a, { quiet })
  const pb = usePlayback((secs) => {
    const r = act({ type: 'wait', seconds: secs * YEAR }, true)
    const st = (r.state as RigState<object>).rig.state as EcoState
    return st.running && st.years < 200 && !r.error
  })
  const { setSpeed } = pb
  useEffect(() => {
    setSpeed(SPEEDS[s.mode][1][0])
  }, [s.mode, setSpeed])
  const logRead = (inst: string, target: string, label: string) => {
    const m = sandbox.domain.engine.measure(state, inst, target)
    if (m) log([{ kind: 'measurement', text: label, measurement: m } as LabEvent])
  }
  const set = (patch: Record<string, unknown>) => {
    pb.setPlaying(false)
    act({ type: 'eco-set', ...patch })
  }
  const pp = s.mode === 'predator-prey'
  const dark = darkFraction(s.darkAllele)
  const h = s.history
  const tMax = Math.max(pp ? 20 : 50, ...h.map((p) => p.t))
  const yMax = pp ? Math.max(100, ...h.map((p) => p.a)) : 100
  const fMax = Math.max(10, ...h.map((p) => p.b))

  return (
    <div className="bio-bench">
      <div className="stage">
        {pp ? (
          <svg viewBox="0 0 900 300" aria-label="Island with rabbits and foxes">
            <rect width="900" height="300" fill="#bfe3f5" />
            <ellipse cx="450" cy="160" rx="380" ry="120" fill="#9cc56f" stroke="#7aa34f" strokeWidth="4" />
            {spots(Math.min(150, Math.round(s.rabbits / 40)), 7, 560, 150).map(([x, y], i) => <circle key={`r${i}`} cx={170 + x} cy={85 + y} r="4" fill={RABBIT} />)}
            {spots(Math.min(60, Math.round(s.foxes / 4)), 13, 560, 150).map(([x, y], i) => <path key={`f${i}`} d={`M ${170 + x} ${85 + y - 6} l 6 10 h -12 z`} fill={FOX} />)}
            <text x="30" y="30" className="hint">● {Math.round(s.rabbits)} rabbits   ▲ {Math.round(s.foxes)} foxes   (each symbol ≈ 40 rabbits / 4 foxes)</text>
          </svg>
        ) : (
          <svg viewBox="0 0 900 300" aria-label={`Moths on ${s.environment} bark`}>
            <rect width="900" height="300" fill={s.environment === 'sooty' ? '#3b3a36' : '#d9d4c3'} />
            {spots(40, 3, 900, 300).map(([x, y], i) => <path key={i} d={`M ${x} ${y} q 20 30 0 60`} stroke={s.environment === 'sooty' ? '#2a2926' : '#b9b3a0'} strokeWidth="6" fill="none" />)}
            {spots(60, 21, 860, 260).map(([x, y], i) => {
              const isDark = i < Math.round(dark * 60)
              return <path key={`m${i}`} d={`M ${20 + x} ${20 + y} l -12 -6 l 2 10 z M ${20 + x} ${20 + y} l 12 -6 l -2 10 z`} fill={isDark ? '#2d2c29' : '#e8e3d2'} stroke="#0003" />
            })}
            <text x="20" y="290" className="hint" fill={s.environment === 'sooty' ? '#ddd' : undefined}>{(dark * 100).toFixed(1)}% dark · generation {s.generation}</text>
          </svg>
        )}
      </div>
      <div className="controls">
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="Model">
            {(['predator-prey', 'selection'] as const).map((m) => (
              <button key={m} role="radio" aria-checked={s.mode === m} className={s.mode === m ? 'on' : ''} onClick={() => set({ mode: m })}>{m === 'predator-prey' ? 'Rabbits & foxes' : 'Peppered moths'}</button>
            ))}
          </div>
          <button className="primary" disabled={s.running} onClick={() => { act({ type: 'eco-run' }); pb.setPlaying(true) }}>Run</button>
          <button disabled={!s.running} onClick={() => pb.setPlaying(!pb.playing)}>{pb.playing ? 'Pause' : 'Resume'}</button>
          <button onClick={() => { pb.setPlaying(false); act({ type: 'eco-reset' }) }}>Reset</button>
          <div className="seg" role="radiogroup" aria-label="Playback speed">
            {SPEEDS[s.mode].map(([v, label]) => <button key={v} role="radio" aria-checked={pb.speed === v} className={pb.speed === v ? 'on' : ''} onClick={() => pb.setSpeed(v)}>{label}</button>)}
          </div>
          <span className="clock">{pp ? `${s.years.toFixed(1)} yr` : `gen ${s.generation}`}</span>
        </div>
        <div className="row">
          {pp ? (
            <>
              <label>Rabbits <input type="number" min="0" max="10000" value={Math.round(s.rabbits)} disabled={s.running} onChange={(e) => set({ rabbits: Number(e.target.value) })} aria-label="Starting rabbits" style={{ width: 80 }} /></label>
              <label>Foxes <input type="number" min="0" max="1000" value={Math.round(s.foxes)} disabled={s.running} onChange={(e) => set({ foxes: Number(e.target.value) })} aria-label="Starting foxes" style={{ width: 70 }} /></label>
              <label>Grass (carrying capacity) <input type="range" min="500" max="20000" step="500" value={s.K} onChange={(e) => act({ type: 'eco-set', K: Number(e.target.value) }, true)} aria-label="Carrying capacity" /> {s.K}</label>
              <label>Fox hunting skill <input type="range" min="0.001" max="0.01" step="0.0005" value={s.predation} onChange={(e) => act({ type: 'eco-set', predation: Number(e.target.value) }, true)} aria-label="Predation rate" /></label>
            </>
          ) : (
            <>
              <label>Bark
                <select value={s.environment} onChange={(e) => act({ type: 'eco-set', environment: e.target.value as 'clean' | 'sooty' })} aria-label="Bark">
                  <option value="clean">clean, pale lichen</option>
                  <option value="sooty">sooty, dark</option>
                </select>
              </label>
              <label>Starting dark allele <input type="range" min="0" max="1" step="0.01" value={s.darkAllele} disabled={s.running} onChange={(e) => set({ darkAllele: Number(e.target.value) })} aria-label="Starting dark allele frequency" /> {s.darkAllele.toFixed(2)}</label>
              <label>Population
                <select value={s.popSize} disabled={s.running} onChange={(e) => set({ popSize: Number(e.target.value) })} aria-label="Population size">
                  {[50, 100, 1000, 10000].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </>
          )}
        </div>
        <div className="readouts">
          {pp ? (
            <div className="readout">
              <span className="lbl">Census</span>
              <span className="val">{Math.round(s.rabbits)} / {Math.round(s.foxes)}</span>
              <span className="sub">rabbits / foxes{s.lag !== null ? ` · fox peak lag ${s.lag} months` : ''}</span>
              <button onClick={() => { logRead('census', 'rabbits', `Rabbits at ${s.years.toFixed(1)} yr`); logRead('census', 'foxes', `Foxes at ${s.years.toFixed(1)} yr`) }}>Log</button>
            </div>
          ) : (
            <div className="readout">
              <span className="lbl">Dark moths</span>
              <span className="val">{(dark * 100).toFixed(1)}%</span>
              <span className="sub">dark allele {s.darkAllele.toFixed(3)}</span>
              <button onClick={() => { logRead('dark-percent', 'moths', `Dark moths, generation ${s.generation}`); logRead('allele-frequency', 'moths', `Dark allele, generation ${s.generation}`) }}>Log</button>
            </div>
          )}
          <figure className="mini-graph wide" aria-label={pp ? 'Rabbits and foxes over time' : 'Dark moths (%) over generations'}>
            <svg viewBox="0 0 300 100">
              <line x1="24" y1="88" x2="295" y2="88" className="axis" />
              <line x1="24" y1="5" x2="24" y2="88" className="axis" />
              {h.length > 1 && (pp ? (
                <>
                  <polyline fill="none" stroke={RABBIT} strokeWidth="2" points={h.map((p) => `${24 + (p.t / tMax) * 260},${88 - (p.a / yMax) * 80}`).join(' ')} />
                  <polyline fill="none" stroke={FOX} strokeWidth="2" points={h.map((p) => `${24 + (p.t / tMax) * 260},${88 - (p.b / fMax) * 80}`).join(' ')} />
                  <text x="288" y={88 - (h.at(-1)!.a / yMax) * 80} className="ax-label" fill={RABBIT}>rabbits</text>
                  <text x="288" y={88 - (h.at(-1)!.b / fMax) * 80 + 8} className="ax-label" fill={FOX}>foxes</text>
                </>
              ) : (
                <polyline className="trace" points={h.map((p) => `${24 + (p.t / tMax) * 260},${88 - (p.a / 100) * 80}`).join(' ')} />
              ))}
              <text x="150" y="98" className="ax-label">{pp ? 'years' : 'generations'}</text>
              {pp && <text x="2" y="10" className="ax-label">(each scaled)</text>}
            </svg>
          </figure>
        </div>
      </div>
    </div>
  )
}
