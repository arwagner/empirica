import { physicsDomain } from './engine'
import { rampRig } from './rigs/ramp'
import { trackRig } from './rigs/track'
import { oscillatorRig } from './rigs/oscillator'
import { launcherRig } from './rigs/launcher'
import { dropTowerRig } from './rigs/dropTower'

export const PHYSICS_RIGS = [rampRig, trackRig, oscillatorRig, launcherRig, dropTowerRig]
export const physics = physicsDomain(PHYSICS_RIGS)
export type { PhysicsAction, PhysicsCheck, PhysicsSetup, PhysicsState } from './engine'
