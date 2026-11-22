import type { BenchProps } from './station/StationWorkspace'
import { ChemBench } from '../domains/chemistry/ui/ChemBench'
import { PhysicsBench } from '../domains/physics/ui/PhysicsBench'

/** Each domain's 2D workspace UI. Domains without one get a placeholder. */
export const BENCHES: Record<string, (p: BenchProps) => React.ReactNode> = {
  chemistry: ChemBench,
  physics: PhysicsBench,
}
