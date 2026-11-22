import type { BenchProps } from '../../../ui/station/StationWorkspace'
import type { PhysicsState } from '../engine'
import { RampBench } from './RampBench'
import { TrackBench } from './TrackBench'
import { OscBench } from './OscBench'
import { LauncherBench } from './LauncherBench'
import { DropBench } from './DropBench'

const BY_RIG: Record<string, (p: BenchProps) => React.ReactNode> = { ramp: RampBench, track: TrackBench, oscillator: OscBench, launcher: LauncherBench, 'drop-tower': DropBench }

/** Picks the bench UI for whichever rig this station has. */
export function PhysicsBench(props: BenchProps) {
  const kind = (props.sandbox.state as PhysicsState).rig.kind
  const Bench = BY_RIG[kind]
  return Bench ? <Bench {...props} /> : <p>No bench for the {kind} rig yet.</p>
}
