import type { Rig as CoreRig } from '../../core'
import type { World } from './world'

/** A physics rig: a core Rig whose world is the physics world (planet, air, friction). */
export type Rig<S = unknown, A extends { type: string } = { type: string }, P = unknown> = CoreRig<S, A, P, World>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRig = Rig<any, any, any>
