import { createRigEngine, rigDomain, type RigAction, type RigCheck, type RigSetup, type RigState } from '../../core'
import type { AnyRig } from './rig'
import { DEFAULT_WORLD, PLANETS, WorldSchema, type World } from './world'

/** Physics rigs integrate at 1 ms (the shared engine's default) and wait up to 10 minutes. */
export const DT = 0.001
export const MAX_WAIT = 600

export type PhysicsState = RigState<World>
export type PhysicsSetup = RigSetup<World>
export type PhysicsAction = RigAction
export type PhysicsCheck = RigCheck

const PHYSICS_WORLD = {
  schema: WorldSchema,
  defaults: DEFAULT_WORLD,
  describe: (w: World) => `${PLANETS[w.planet].name}, air resistance ${w.air ? 'on' : 'off'}, friction ${w.friction ? 'on' : 'off'}`,
}

/** Build the physics engine around a set of rigs (shared rig engine + the physics world). */
export const createPhysicsEngine = (rigs: AnyRig[]) => createRigEngine(rigs, PHYSICS_WORLD)

/** Build the physics Domain from rigs. */
export const physicsDomain = (rigs: AnyRig[]) =>
  rigDomain(
    { id: 'physics', name: 'Physics', description: 'Motion, forces, energy and momentum: ramps, collisions, pendulums, projectiles and free fall.' },
    rigs,
    PHYSICS_WORLD,
  )
