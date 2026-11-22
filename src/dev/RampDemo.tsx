import { physics } from '../domains/physics'
import { PhysicsBench } from '../domains/physics/ui/PhysicsBench'
import { LabSessionProvider } from '../ui/session'
import { StationWorkspace } from '../ui/station/StationWorkspace'
import '../ui/shell/shell.css'
import '../world/world.css'

/** Dev-only: a physics bench on its own. ?demo=ramp, or ?demo=ramp&rig=track */
const params = new URLSearchParams(location.search)
const rig = params.get('rig') ?? 'ramp'
const setup = rig !== 'ramp' ? { rig: { kind: rig } } : { rig: { kind: 'ramp', params: { hanging: Number(params.get('hanging') ?? 0), angleDeg: Number(params.get('angle') ?? 10) } } }

export default function RampDemo() {
  return (
    <LabSessionProvider>
      <div className="station shown" style={{ position: 'fixed' }}>
        <div className="station-body">
          <StationWorkspace domain={physics} setup={setup} experiment={null} onEndExperiment={() => {}} Bench={PhysicsBench} />
        </div>
      </div>
    </LabSessionProvider>
  )
}
