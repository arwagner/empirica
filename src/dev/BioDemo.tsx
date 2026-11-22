import { biology } from '../domains/biology'
import { BiologyBench } from '../domains/biology/ui/BiologyBench'
import { LabSessionProvider } from '../ui/session'
import { StationWorkspace } from '../ui/station/StationWorkspace'
import '../ui/shell/shell.css'
import '../world/world.css'

/** Dev-only: a biology bench on its own. ?demo=bio&rig=microscope (optional &params=<json>, &actions=<json array> applied on load) */
const q = new URLSearchParams(location.search)
const setup = { rig: { kind: q.get('rig') ?? 'microscope', params: JSON.parse(q.get('params') ?? '{}') } }
const actions: { type: string }[] = JSON.parse(q.get('actions') ?? '[]')
const saved = actions.length ? actions.reduce((st, a) => biology.engine.apply(st, a).state, biology.engine.create(setup)) : undefined

export default function BioDemo() {
  return (
    <LabSessionProvider>
      <div className="station shown" style={{ position: 'fixed' }}>
        <div className="station-body">
          <StationWorkspace domain={biology} setup={setup} saved={saved} experiment={null} onEndExperiment={() => {}} Bench={BiologyBench} />
        </div>
      </div>
    </LabSessionProvider>
  )
}
