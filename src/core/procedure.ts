import type { AnyDomain } from './domain'
import type { Experiment } from './experiment'
import type { LabEvent } from './lab'

export interface ProcedureRun {
  ok: boolean
  /** Index of the first step whose check failed after its canonical actions, if any. */
  failedStep?: number
  events: LabEvent[]
}

/**
 * Plays an experiment's canonical actions through the engine and confirms every step's check
 * passes. This is how we know written content matches the simulation.
 */
export function runProcedure(domain: AnyDomain, exp: Experiment): ProcedureRun {
  let state = domain.engine.create(exp.setup)
  const events: LabEvent[] = []
  for (const [i, step] of exp.steps.entries()) {
    for (const action of step.action) {
      const r = domain.engine.apply(state, action)
      state = r.state
      events.push(...r.events)
    }
    if (!domain.engine.check(state, step.check)) return { ok: false, failedStep: i, events }
  }
  return { ok: true, events }
}
