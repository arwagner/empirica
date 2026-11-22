import { useMemo, useState } from 'react'
import { explain, type Experiment } from '../../core'
import { useLabSession } from '../useLabSession'
import { EMPTY_FILTER, filterExperiments, topicsOf, type CatalogFilter } from './catalogFilter'

interface Props {
  experiments: Experiment[]
  domains: { id: string; name: string }[]
  onStart: (e: Experiment) => void
}

export function Catalog({ experiments, domains, onStart }: Props) {
  const { level } = useLabSession()
  const [f, setF] = useState<CatalogFilter>(EMPTY_FILTER)
  const shown = useMemo(() => filterExperiments(experiments, f), [experiments, f])
  const topics = useMemo(() => topicsOf(experiments), [experiments])
  const set = (patch: Partial<CatalogFilter>) => setF((x) => ({ ...x, ...patch }))

  return (
    <div className="catalog">
      <div className="filters">
        <input type="search" placeholder="Search experiments…" aria-label="Search experiments" value={f.query}
          onChange={(e) => set({ query: e.target.value })} />
        <select aria-label="Domain" value={f.domain ?? ''} onChange={(e) => set({ domain: e.target.value || null })}>
          <option value="">All domains</option>
          {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select aria-label="Topic" value={f.topic ?? ''} onChange={(e) => set({ topic: e.target.value || null })}>
          <option value="">All topics</option>
          {topics.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select aria-label="Difficulty" value={f.difficulty ?? ''} onChange={(e) => set({ difficulty: (e.target.value || null) as CatalogFilter['difficulty'] })}>
          <option value="">Any difficulty</option>
          <option value="intro">Intro</option>
          <option value="core">Core</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {experiments.length === 0 ? (
        <p className="empty">No guided experiments yet: the first chemistry pack is on its way. Meanwhile, use the Stations tab to experiment freely.</p>
      ) : shown.length === 0 ? (
        <p className="empty">Nothing matches those filters.</p>
      ) : (
        <ul className="cards">
          {shown.map((e) => (
            <li key={e.id} className="card-exp">
              <div className="meta">
                <span className="chip">{domains.find((d) => d.id === e.domain)?.name ?? e.domain}</span>
                <span>{e.difficulty}</span>
                <span>~{e.minutes} min</span>
              </div>
              <h3>{e.title}</h3>
              <p>{explain(e.intro, level)}</p>
              <div className="topics">{e.topics.map((t) => <span key={t}>#{t}</span>)}</div>
              <button onClick={() => onStart(e)}>Start</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
