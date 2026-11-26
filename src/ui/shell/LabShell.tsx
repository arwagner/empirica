import { useEffect, useRef, useState } from 'react'
import type { Experiment } from '../../core'
import { registry } from '../../content/registry'
import { LabWorld, type LabWorldHandle } from '../../world/LabWorld'
import type { Building, Interactable } from '../../world/types'
import { StationFrame } from '../station/StationFrame'
import { StationWorkspace } from '../station/StationWorkspace'
import { BENCHES } from '../benches'
import { LabSessionProvider } from '../session'
import { Menu, type MenuTab } from './Menu'
import '../touch.css'
import './shell.css'

const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

function Shell({ building }: { building: Building }) {
  // Dev aid: ?menu=<tab> opens the menu on load.
  const [menu, setMenu] = useState<MenuTab | null>(() => (new URLSearchParams(location.search).get('menu') as MenuTab | null) || null)
  const world = useRef<LabWorldHandle>(null)
  const [active, setActive] = useState<Experiment | null>(null)
  /** Each station's bench, remembered between visits for this session. */
  const benches = useRef(new Map<string, unknown>())
  const stations = building.rooms.flatMap((r) => r.interactables.filter((i) => i.kind === 'station').map((i) => ({ ...i, room: r.name })))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || e.repeat) return
      if (e.code === 'KeyM') setMenu((m) => (m ? null : 'experiments'))
      else if (e.code === 'KeyN') setMenu((m) => (m === 'notebook' ? null : 'notebook'))
      else if (e.code === 'Escape') setMenu(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const goTo = (id: string) => {
    setMenu(null)
    world.current?.enter(id)
  }
  const stationFor = (e: Experiment) => e.station ?? stations.find((s) => s.domain === e.domain && !s.comingSoon)?.id
  const start = (e: Experiment) => {
    const id = stationFor(e)
    if (!id) return
    setActive(e)
    goTo(id)
  }

  return (
    <>
      <LabWorld
        ref={world}
        building={building}
        suspended={menu !== null}
        onMenu={() => setMenu('experiments')}
        renderStation={(station: Interactable, leave) => (
          <StationFrame station={station} onLeave={leave} onNotebook={() => setMenu('notebook')}>
            {(() => {
              const domain = registry.domain(station.domain ?? '')
              if (!domain) return null
              const exp = active && stationFor(active) === station.id ? active : null
              const key = `${station.id}:${exp?.id ?? 'free'}`
              return <StationWorkspace key={key} domain={domain} setup={station.setup} experiment={exp}
                // Free play resumes where you left off; guided experiments start fresh each time.
                saved={exp ? undefined : benches.current.get(key)} onSave={exp ? undefined : (s) => benches.current.set(key, s)}
                onEndExperiment={() => setActive(null)} Bench={BENCHES[domain.id]} />
            })()}
          </StationFrame>
        )}
      />
      {menu && (
        <Menu
          tab={menu}
          onTab={setMenu}
          onClose={() => setMenu(null)}
          experiments={registry.experiments()}
          domains={registry.domains.map((d) => ({ id: d.id, name: d.name }))}
          stations={stations}
          onStartExperiment={start}
          onGoToStation={goTo}
        />
      )}
    </>
  )
}

/** The whole lab: 3D world, stations, menu, notebook, explanation level. */
export function LabShell({ building }: { building: Building }) {
  return (
    <LabSessionProvider>
      <Shell building={building} />
    </LabSessionProvider>
  )
}
