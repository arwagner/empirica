import type { z } from 'zod'
import type { LabEvent, Measurement } from '../../core'
import type { World } from './world'

/**
 * A piece of apparatus at a physics station (ramp, pendulum, launcher...). The physics engine
 * owns time and world settings; a rig owns its own state, actions and motion.
 */
export interface Rig<S = unknown, A extends { type: string } = { type: string }, P = unknown> {
  kind: string
  name: string
  /** Zod schemas for this rig's setup parameters and actions (action types must be unique across rigs). */
  schemas: { params: z.ZodType<P>; actions: z.ZodType<A>[] }
  create(params: P, world: World): S
  /** Instant actions: adjust apparatus, release, reset... */
  apply(s: S, action: A, world: World, time: number): { state: S; events: LabEvent[] }
  /** Advance by dt seconds. Report anything notable (gate crossings, impacts) as events. */
  step(s: S, dt: number, world: World, time: number): { state: S; events: LabEvent[] }
  /** Nothing is moving, so time can skip ahead safely. */
  atRest(s: S): boolean
  measure(s: S, instrument: string, target: string, world: World, time: number): Measurement | null
  /** Instruments this rig offers, for the UI. */
  instruments: { id: string; name: string; targets: string[] }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRig = Rig<any, any, any>
