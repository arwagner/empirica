import type { Experiment, RigAction, RigCheck, RigSetup } from '../../core'

export type BiologyExperiment = Experiment<RigAction, RigCheck, RigSetup<object>>
export { X } from '../chemistry/helpers'
export { all, reading, saw, wait } from '../physics/helpers'
export const HOUR = 3600
export const YEAR = 365.25 * 86400
