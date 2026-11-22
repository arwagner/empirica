import type { z } from 'zod'
import type { Equipment, LabEvent, Material, Measurement } from './lab'
import type { Experiment } from './experiment'

export interface StepResult<State> {
  state: State
  events: LabEvent[]
}

/**
 * A deterministic simulation. Same state + same action = same result, always.
 * State must be treated as immutable: `apply` returns a new state.
 */
export interface Engine<State, Action, Check, Setup> {
  create(setup: Setup): State
  apply(state: State, action: Action): StepResult<State>
  /** Read an instrument. Returns null when the instrument cannot read that target. */
  measure(state: State, instrumentId: string, target: string): Measurement | null
  /** Has this (data-described) condition been met? Used by guided procedures. */
  check(state: State, check: Check): boolean
}

/**
 * A domain plugin: chemistry, physics, biology... The core knows nothing beyond this contract.
 * The schemas let experiments stay plain data while still being validated against the domain.
 */
export interface Domain<State = unknown, Action = unknown, Check = unknown, Setup = unknown> {
  id: string
  name: string
  description: string
  materials: Material[]
  equipment: Equipment[]
  schemas: {
    action: z.ZodType<Action>
    check: z.ZodType<Check>
    setup: z.ZodType<Setup>
  }
  engine: Engine<State, Action, Check, Setup>
  experiments: Experiment<Action, Check, Setup>[]
}

export type AnyDomain = Domain<any, any, any, any>
