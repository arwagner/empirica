import { useState } from 'react'
import type { LabEvent, RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { chiSquare, classOf, GENES, observed, ORGANISMS, predict, punnett, type GeneticsState, type Organism, type Sex } from '../rigs/genetics'
import './biology-bench.css'

type Pheno = 'dominant' | 'recessive'
const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6']

function ParentCard({ slot, s, apply }: { slot: 0 | 1; s: GeneticsState; apply: BenchProps['apply'] }) {
  const o = s.organism
  const genes = GENES[o]
  const p = s.parents[slot]
  const [traits, setTraits] = useState<Record<string, Pheno>>({})
  const [sex, setSex] = useState<Sex>(slot === 0 ? 'F' : 'M')
  const [genId, setGenId] = useState<number | ''>('')
  const [cls, setCls] = useState('')
  const gen = s.generations.find((g) => g.id === genId) ?? s.generations.at(-1)
  const classes = gen ? Object.keys(observed(o, gen, s.scored)) : []
  const xScored = o === 'fly' && s.scored.some((id) => genes.find((g) => g.id === id)?.xLinked)
  const pick = () => {
    if (!gen) return
    const chosen = cls || classes[0]
    const words = chosen.split(' ')
    const phenotype = Object.fromEntries(s.scored.map((id) => {
      const g = genes.find((x) => x.id === id)!
      return [id, words.includes(g.dominant) ? 'dominant' : 'recessive'] as const
    }))
    const sx = xScored ? (words.includes('male') ? 'M' : 'F') : o === 'fly' ? sex : undefined
    apply({ type: 'gen-pick', slot, generation: gen.id, phenotype, sex: sx })
  }
  const known = p?.known
  return (
    <section className="parent" aria-label={`Parent ${slot + 1}`}>
      <h4>Parent {slot + 1}</h4>
      <p className="who">{p ? p.label : 'none chosen'}</p>
      {p && <p className="gt">Genotype ({s.scored.join(', ')}): <b>{known ? s.scored.map((id) => p.genotype[id].replace('-', '/Y')).join(' ') : s.scored.map((id) => `${id}?`).join(' ')}</b>{!known && <span className="sub"> (unknown: looks {classOf(o, s.scored, p.genotype)})</span>}</p>}
      <details>
        <summary>From a true-breeding stock</summary>
        <div className="row">
          {genes.map((g) => (
            <select key={g.id} value={traits[g.id] ?? 'dominant'} onChange={(e) => setTraits((t) => ({ ...t, [g.id]: e.target.value as Pheno }))} aria-label={`Parent ${slot + 1} ${g.trait}`}>
              <option value="dominant">{g.dominant}</option>
              <option value="recessive">{g.recessive}</option>
            </select>
          ))}
          {o === 'fly' && (
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)} aria-label={`Parent ${slot + 1} sex`}>
              <option value="F">female</option>
              <option value="M">male</option>
            </select>
          )}
          <button onClick={() => apply({ type: 'gen-stock', slot, traits, sex: o === 'fly' ? sex : undefined })}>Use stock</button>
        </div>
      </details>
      {s.generations.length > 0 && (
        <details>
          <summary>From offspring</summary>
          <div className="row">
            <select value={gen?.id ?? ''} onChange={(e) => setGenId(Number(e.target.value))} aria-label={`Parent ${slot + 1} generation`}>
              {s.generations.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
            <select value={cls || classes[0]} onChange={(e) => setCls(e.target.value)} aria-label={`Parent ${slot + 1} offspring type`}>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {o === 'fly' && !xScored && (
              <select value={sex} onChange={(e) => setSex(e.target.value as Sex)} aria-label={`Parent ${slot + 1} offspring sex`}>
                <option value="F">female</option>
                <option value="M">male</option>
              </select>
            )}
            <button onClick={pick}>Pick one</button>
          </div>
        </details>
      )}
    </section>
  )
}

export function GeneticsBench({ sandbox, apply }: BenchProps) {
  const state = sandbox.state as RigState<object>
  const s = state.rig.state as GeneticsState
  const { log } = useLabSession()
  const o = s.organism
  const genes = GENES[o]
  const [p1, p2] = s.parents
  const latest = s.generations.at(-1)
  const obs = latest ? observed(o, latest, s.scored) : {}
  const total = Object.values(obs).reduce((a, b) => a + b, 0)
  const ready = p1 && p2
  const expected = ready ? predict(o, p1.genotype, p2.genotype, s.scored) : null
  const stats = latest && expected ? chiSquare(obs, expected) : null
  const classes = [...new Set([...Object.keys(expected ?? {}), ...Object.keys(obs)])].sort((a, b) => (expected?.[b] ?? 0) - (expected?.[a] ?? 0))
  const square = ready && p1.known && p2.known && s.scored.length <= 2 ? punnett(o, p1.genotype, p2.genotype, s.scored) : null
  const max = Math.max(1, ...Object.values(obs))

  const toggleScore = (id: string) => {
    const next = s.scored.includes(id) ? s.scored.filter((x) => x !== id) : [...s.scored, id].slice(-2)
    if (next.length) apply({ type: 'gen-score', genes: next })
  }
  const logResults = () => {
    if (!latest) return
    const events: LabEvent[] = classes.map((c) => ({ kind: 'measurement', text: `${latest.label}: ${c}`, measurement: { quantity: `${c} offspring`, value: obs[c] ?? 0, unit: '', instrument: 'count' } }))
    if (stats) events.push({ kind: 'measurement', text: `${latest.label}: χ² vs prediction (${stats.df} df)`, measurement: { quantity: 'χ²', value: Math.round(stats.chi * 100) / 100, unit: '', instrument: 'chi-square' } })
    log(events)
  }

  return (
    <div className="bio-bench gen">
      <div className="controls">
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="Organism">
            {(['pea', 'fly'] as Organism[]).map((x) => (
              <button key={x} role="radio" aria-checked={o === x} className={o === x ? 'on' : ''} onClick={() => apply({ type: 'gen-organism', organism: x })}>{ORGANISMS[x].plural}</button>
            ))}
          </div>
          <span className="lbl">Score</span>
          {genes.map((g) => (
            <label key={g.id}><input type="checkbox" checked={s.scored.includes(g.id)} onChange={() => toggleScore(g.id)} /> {g.trait}</label>
          ))}
        </div>
      </div>

      <div className="parents">
        <ParentCard key={`${o}0`} slot={0} s={s} apply={apply} />
        <div className="cross-x">×</div>
        <ParentCard key={`${o}1`} slot={1} s={s} apply={apply} />
      </div>

      <div className="row">
        <button className="primary" disabled={!ready} onClick={() => apply({ type: 'gen-cross', n: s.n })}>Cross ({s.n} offspring)</button>
        <button disabled={!ready} onClick={() => apply({ type: 'gen-cross', n: 1000 })}>Cross 1000</button>
        <button onClick={() => apply({ type: 'gen-clear' })}>Start over</button>
        {s.generations.length > 0 && <span className="sub">Generations: {s.generations.map((g) => g.label).join(' → ')}</span>}
      </div>

      <div className="gen-results">
        <section aria-label="Prediction">
          <h4>Prediction</h4>
          {square ? (
            <table className="punnett">
              <thead><tr><th />{square.cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
              <tbody>
                {square.rows.map((r, i) => (
                  <tr key={i}><th>{r}</th>{square.cells[i].map((cell, j) => <td key={j} title={cell.cls}><b>{cell.genotype}</b><span>{cell.cls}</span></td>)}</tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="sub">{ready ? 'A parent\'s genotype is unknown: cross and see what the offspring tell you!' : 'Choose two parents.'}</p>
          )}
          {expected && <p className="sub">{Object.entries(expected).sort((a, b) => b[1] - a[1]).map(([c, p]) => `${c} ${(p * 100).toFixed(1)}%`).join(' · ')}</p>}
        </section>

        <section aria-label="Offspring">
          <h4>Offspring {latest ? `(${latest.label}, ${total})` : ''}</h4>
          {latest ? (
            <>
              <table className="data">
                <thead><tr><th>type</th><th>observed</th><th>expected</th><th /></tr></thead>
                <tbody>
                  {classes.map((c, i) => (
                    <tr key={c}>
                      <td>{c}</td>
                      <td>{obs[c] ?? 0}</td>
                      <td>{expected ? ((expected[c] ?? 0) * total).toFixed(1) : '—'}</td>
                      <td className="bar-cell"><span className="bar" style={{ width: `${((obs[c] ?? 0) / max) * 100}%`, background: PALETTE[i % PALETTE.length] }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stats && (
                <p className="chi">χ² = {stats.chi.toFixed(2)} ({stats.df} df), p = {stats.p < 0.001 ? '< 0.001' : stats.p.toFixed(3)}: <b>{stats.p > 0.05 ? 'fits the prediction' : 'doesn\'t fit: something else is going on'}</b></p>
              )}
              <button onClick={logResults}>Log counts</button>
            </>
          ) : <p className="sub">No crosses yet.</p>}
        </section>
      </div>
    </div>
  )
}
