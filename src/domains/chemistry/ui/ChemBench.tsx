import { useEffect, useRef, useState } from 'react'
import type { LabEvent } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { flameColor } from '../appearance'
import { chemistryEngine, VESSEL_KINDS, type ChemState } from '../engine'
import type { ChemAction, VesselKind } from '../schemas'
import { Glassware } from './Glassware'
import { Shelf } from './Shelf'
import { SpectrumPanel } from './SpectrumPanel'
import './bench.css'

const HEAT = [['Off', 0], ['Low', 150], ['Medium', 300], ['High', 600], ['Bunsen', 1000]] as const
const SPEEDS = [1, 10, 60] as const
const TICK_MS = 250
const INSTRUMENTS = [['thermometer', 'Thermometer'], ['ph-meter', 'pH meter'], ['balance', 'Balance'], ['gas-syringe', 'Gas syringe'], ['spectrometer', 'Spectrometer peak']] as const
const SHORT: Record<VesselKind, string> = {
  'beaker-250': 'beaker', 'beaker-100': 'small beaker', 'flask-250': 'flask', 'test-tube': 'test tube',
  'boiling-tube': 'boiling tube', calorimeter: 'cup', crucible: 'crucible',
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const gasTotal = (v: ChemState['vessels'][string]) => Object.values(v.evolved).reduce((a, b) => a + b, 0)

function nextId(state: ChemState, kind: VesselKind) {
  const base = SHORT[kind]
  for (let i = 1; ; i++) {
    const id = i === 1 && !state.vessels[base] ? base : `${base} ${i}`
    if (!state.vessels[id]) return id
  }
}

/** The 2D chemistry workbench. Drives the engine through `apply` (guided or free). */
export function ChemBench({ sandbox, apply: rawApply }: BenchProps) {
  const state = sandbox.state as ChemState
  const { log, notebook } = useLabSession()
  const ids = Object.keys(state.vessels)
  const [sel, setSel] = useState<string | null>(ids[0] ?? null)
  const selected = sel && state.vessels[sel] ? sel : (ids[0] ?? null)
  const v = selected ? state.vessels[selected] : null
  const [error, setError] = useState<string | null>(null)
  const [flame, setFlame] = useState<{ vessel: string; hex: string } | null>(null)
  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(10)
  const [pourTo, setPourTo] = useState('')
  const [pourAmt, setPourAmt] = useState<number | 'all'>('all')
  const [showSpectrum, setShowSpectrum] = useState(false)

  // Fizz for a few seconds whenever an action makes a vessel give off gas.
  const [fizzing, setFizzing] = useState<Record<string, boolean>>({})
  const fizzTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  useEffect(() => () => Object.values(fizzTimers.current).forEach(clearTimeout), [])
  const fizz = (id: string) => {
    setFizzing((f) => ({ ...f, [id]: true }))
    clearTimeout(fizzTimers.current[id])
    fizzTimers.current[id] = setTimeout(() => setFizzing((f) => ({ ...f, [id]: false })), 2500)
  }

  const apply = (a: ChemAction, quiet = false) => {
    const before = sandbox.state as ChemState
    const r = rawApply(a, { quiet })
    setError(r.error ?? null)
    const after = r.state as ChemState
    for (const [id, vs] of Object.entries(after.vessels))
      if (gasTotal(vs) > (before.vessels[id] ? gasTotal(before.vessels[id]) : 0) + 1e-7) fizz(id)
    return r
  }

  // Lab clock.
  const applyRef = useRef(apply)
  useEffect(() => {
    applyRef.current = apply
  })
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => applyRef.current({ type: 'wait', seconds: (speed * TICK_MS) / 1000 }, true), TICK_MS)
    return () => clearInterval(t)
  }, [running, speed])

  const others = ids.filter((id) => id !== selected)
  const recent = notebook.entries.filter((e): e is Extract<typeof e, { kind: 'observation' }> => e.kind === 'observation').slice(-4).reverse()
  const measure = (inst: string) => (selected ? chemistryEngine.measure(state, inst, selected) : null)

  const logReading = (inst: string, label: string) => {
    const m = measure(inst)
    if (!m || !selected) return
    const e: LabEvent = { kind: 'measurement', text: `${label} reading, ${selected}`, measurement: m }
    log([e])
  }

  const doFlameTest = () => {
    if (!v || !selected) return
    const r = apply({ type: 'flame-test', vessel: selected })
    if (r.error) return
    const f = flameColor(v.contents)
    setFlame({ vessel: selected, hex: f?.hex ?? '#6fa8ff' })
    setTimeout(() => setFlame(null), 2600)
  }

  return (
    <div className="chem-bench">
      <Shelf target={selected} onAdd={(r, amount) => selected && apply({ type: 'add', vessel: selected, reagent: r.id, amount })} />

      <div className="bench-main">
        <div className="bench-top">
          <div className="clock" aria-label="Lab clock">
            <span className="t">⏱ {clock(state.time)}</span>
            <button onClick={() => setRunning((x) => !x)} aria-pressed={running}>{running ? 'Pause time' : 'Run time'}</button>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])} aria-label="Time speed">
              {SPEEDS.map((s) => <option key={s} value={s}>×{s}</option>)}
            </select>
            {[10, 60, 300].map((s) => (
              <button key={s} onClick={() => apply({ type: 'wait', seconds: s })}>+{s < 60 ? `${s}s` : `${s / 60} min`}</button>
            ))}
          </div>
          <label className="add-glass">
            <span>Add glassware</span>
            <select value="" onChange={(e) => {
              const kind = e.target.value as VesselKind
              if (!kind) return
              const id = nextId(state, kind)
              if (!apply({ type: 'add-vessel', id, vessel: kind }).error) setSel(id)
            }} aria-label="Add glassware">
              <option value="">+</option>
              {(Object.keys(VESSEL_KINDS) as VesselKind[]).map((k) => <option key={k} value={k}>{VESSEL_KINDS[k].name}</option>)}
            </select>
          </label>
        </div>

        <div className="bench-surface">
          {ids.length === 0 && <p className="hint">Add some glassware to get started.</p>}
          {ids.map((id) => (
            <Glassware key={id} vessel={state.vessels[id]} selected={id === selected} onSelect={() => setSel(id)}
              fizzing={!!fizzing[id]} flame={flame?.vessel === id ? flame.hex : null} />
          ))}
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        {v && selected && (
          <div className="tools" aria-label={`Tools for ${selected}`}>
            <div className="readouts">
              {INSTRUMENTS.map(([inst, label]) => {
                const m = measure(inst)
                return (
                  <div key={inst} className="readout">
                    <span className="lbl">{label}</span>
                    <span className="val">{m ? `${m.value}${m.unit ? ` ${m.unit}` : ''}` : '—'}</span>
                    <button disabled={!m} onClick={() => logReading(inst, label)} aria-label={`Log ${label} reading`}>Log</button>
                  </div>
                )
              })}
            </div>
            <div className="row">
              <button onClick={() => setShowSpectrum((x) => !x)} aria-expanded={showSpectrum}>{showSpectrum ? 'Hide spectrum' : 'Show spectrum'}</button>
            </div>
            {showSpectrum && <SpectrumPanel vessel={selected} contents={v.contents} />}

            <div className="row">
              <span className="lbl">Heat</span>
              <div className="seg" role="radiogroup" aria-label="Heater">
                {HEAT.map(([name, w]) => (
                  <button key={name} role="radio" aria-checked={v.heaterW === w} className={v.heaterW === w ? 'on' : ''}
                    onClick={() => apply({ type: 'heat', vessel: selected, watts: w })}>{name}</button>
                ))}
              </div>
              <button onClick={() => apply({ type: 'stir', vessel: selected })}>Stir</button>
            </div>

            <div className="row">
              <span className="lbl">Transfer</span>
              <select value={pourTo} onChange={(e) => setPourTo(e.target.value)} aria-label="Pour into">
                <option value="">into…</option>
                {others.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <select value={pourAmt} onChange={(e) => setPourAmt(e.target.value === 'all' ? 'all' : Number(e.target.value))} aria-label="Pour amount">
                <option value="all">all</option>
                {[0.5, 1, 5, 10, 25, 50].map((n) => <option key={n} value={n}>{n} mL</option>)}
              </select>
              <button disabled={!pourTo} onClick={() => apply({ type: 'pour', from: selected, to: pourTo, amount: pourAmt === 'all' ? undefined : pourAmt })}>Pour</button>
              <button disabled={!pourTo} onClick={() => apply({ type: 'filter', from: selected, to: pourTo })}>Filter</button>
              <button onClick={() => apply({ type: 'connect-gas', from: selected, to: v.gasOutlet ? null : pourTo || null })} disabled={!v.gasOutlet && !pourTo}>
                {v.gasOutlet ? `Remove tube (→ ${v.gasOutlet})` : 'Delivery tube'}
              </button>
            </div>

            <div className="row">
              <span className="lbl">Test</span>
              <button onClick={doFlameTest}>Flame test</button>
              <button onClick={() => apply({ type: 'splint', vessel: selected, splint: 'burning' })}>Burning splint</button>
              <button onClick={() => apply({ type: 'splint', vessel: selected, splint: 'glowing' })}>Glowing splint</button>
              <button onClick={() => apply({ type: 'burn', vessel: selected })}>Burn in flame</button>
              <button className="danger" onClick={() => apply({ type: 'empty', vessel: selected })}>Empty</button>
              <button className="danger" onClick={() => apply({ type: 'remove-vessel', vessel: selected })}>Put away</button>
            </div>
          </div>
        )}

        <ul className="feed" aria-label="Latest observations" aria-live="polite">
          {recent.map((e) => (
            <li key={e.id}>{e.text}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
