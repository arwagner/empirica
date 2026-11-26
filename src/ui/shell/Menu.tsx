import type { Experiment } from '../../core'
import type { Interactable } from '../../world/types'
import { NotebookPanel } from '../notebook/NotebookPanel'
import { ProfessorPanel } from '../professor/ProfessorPanel'
import { useLabSession } from '../useLabSession'
import { Catalog } from './Catalog'
import { LevelToggle } from './LevelToggle'

export type MenuTab = 'experiments' | 'stations' | 'notebook' | 'professor'
const TABS: { id: MenuTab; label: string; key: string }[] = [
  { id: 'experiments', label: 'Experiments', key: '' },
  { id: 'stations', label: 'Stations', key: '' },
  { id: 'notebook', label: 'Notebook', key: 'N' },
  { id: 'professor', label: 'Professor', key: '' },
]

interface Props {
  tab: MenuTab
  onTab: (t: MenuTab) => void
  onClose: () => void
  experiments: Experiment[]
  domains: { id: string; name: string }[]
  stations: (Interactable & { room: string })[]
  onStartExperiment: (e: Experiment) => void
  onGoToStation: (id: string) => void
  /** The station the student is at, for the professor. */
  here?: { id: string; name: string }
}

export function Menu({ tab, onTab, onClose, experiments, domains, stations, onStartExperiment, onGoToStation, here }: Props) {
  const { notebook, note } = useLabSession()
  return (
    <div className="menu-veil" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="menu" role="dialog" aria-modal="true" aria-label="Lab menu">
        <header>
          <nav role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => onTab(t.id)}>
                {t.label}
                {t.key && <kbd>{t.key}</kbd>}
              </button>
            ))}
          </nav>
          <LevelToggle />
          <button className="close" onClick={onClose} aria-label="Close menu">
            <kbd>M</kbd> ✕
          </button>
        </header>
        <div className="menu-body">
          {tab === 'experiments' && <Catalog experiments={experiments} domains={domains} onStart={onStartExperiment} />}
          {tab === 'stations' && (
            <div className="stations-list">
              {[...new Set(stations.map((s) => s.room))].map((room) => (
                <section key={room} aria-label={room}>
                  <h3 className="room-name">{room}</h3>
                  <ul>
                    {stations.filter((s) => s.room === room).map((s) => (
                      <li key={s.id}>
                        <div>
                          <h3>{s.name}</h3>
                          <p>{s.blurb}</p>
                        </div>
                        {s.comingSoon ? <span className="soon">Coming soon</span> : <button onClick={() => onGoToStation(s.id)}>Go there</button>}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          {tab === 'notebook' && <NotebookPanel notebook={notebook} onAddNote={note} />}
          {tab === 'professor' && <ProfessorPanel station={here} />}
        </div>
      </div>
    </div>
  )
}
