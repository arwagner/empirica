import type { RigState } from '../../../core'
import type { BenchProps } from '../../../ui/station/StationWorkspace'
import { EcoBench } from './EcoBench'
import { EnzymeBench } from './EnzymeBench'
import { GeneticsBench } from './GeneticsBench'
import { MicroBench } from './MicroBench'
import { MicroscopeBench } from './MicroscopeBench'
import { OsmosisBench } from './OsmosisBench'
import { PhotoBench } from './PhotoBench'

const BY_RIG: Record<string, (p: BenchProps) => React.ReactNode> = { microscope: MicroscopeBench, genetics: GeneticsBench, enzymes: EnzymeBench, osmosis: OsmosisBench, photosynthesis: PhotoBench, microbiology: MicroBench, ecology: EcoBench }

/** Picks the bench UI for whichever rig this biology station has. */
export function BiologyBench(props: BenchProps) {
  const kind = (props.sandbox.state as RigState<object>).rig.kind
  const Bench = BY_RIG[kind]
  return Bench ? <Bench {...props} /> : <p>No bench for the {kind} rig yet.</p>
}
