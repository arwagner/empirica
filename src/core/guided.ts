import type { AnyDomain } from './domain'
import type { Experiment } from './experiment'

/** Progress through a guided experiment. The sandbox state lives elsewhere; this only tracks steps. */
export interface GuidedRun {
  experimentId: string
  /** Index of the step being worked on; equals steps.length when finished. */
  current: number
  /** Steps completed, in the order they were completed. */
  done: number[]
  hintsUsed: number
  assisted: number
}

export const startRun = (exp: Experiment): GuidedRun => ({ experimentId: exp.id, current: 0, done: [], hintsUsed: 0, assisted: 0 })

export const isFinished = (exp: Experiment, run: GuidedRun) => run.current >= exp.steps.length

/**
 * After the sandbox state changes, complete the current step if its check now holds, and keep
 * going while later steps already hold too (the learner may have run ahead). Returns the steps
 * completed by this change.
 */
export function advance(domain: AnyDomain, exp: Experiment, run: GuidedRun, state: unknown): { run: GuidedRun; completed: number[] } {
  const completed: number[] = []
  let current = run.current
  while (current < exp.steps.length && domain.engine.check(state, exp.steps[current].check)) {
    completed.push(current)
    current++
  }
  if (!completed.length) return { run, completed }
  return { run: { ...run, current, done: [...run.done, ...completed] }, completed }
}

/** A hint: the author's, or a plain description of the canonical action(s) worked out by the engine. */
export function hintFor(domain: AnyDomain, exp: Experiment, run: GuidedRun, state: unknown): string | null {
  const step = exp.steps[run.current]
  if (!step) return null
  if (step.hint) return step.hint
  try {
    let s = state
    const texts: string[] = []
    for (const a of step.action) {
      const r = domain.engine.apply(s, a)
      s = r.state
      const t = r.events.find((e) => e.kind === 'action')?.text
      if (t) texts.push(t)
    }
    return texts.length ? `Try this: ${texts.join(' Then: ')}` : null
  } catch {
    return null
  }
}
