import type { Experiment } from '../../core'
import type { PhysicsAction, PhysicsCheck, PhysicsSetup } from '../../domains/physics'

export type PhysicsExperiment = Experiment<PhysicsAction, PhysicsCheck, PhysicsSetup>
export { X } from '../chemistry/helpers'

export const saw = (tag: string): PhysicsCheck => ({ type: 'observed', tag })
export const reading = (instrument: string, target: string, min?: number, max?: number): PhysicsCheck => ({ type: 'reading', instrument, target, min, max })
export const all = (...checks: PhysicsCheck[]): PhysicsCheck => ({ type: 'all', checks })
export const wait = (seconds: number): PhysicsAction => ({ type: 'wait', seconds })
