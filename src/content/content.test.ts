import { runProcedure } from '../core'
import { registry } from './registry'

// Every guided experiment must validate (registry) and actually work in its engine, step by step.
describe.each(registry.experiments().map((e) => [e.id, e] as const))('%s', (id) => {
  test('every step completes when its canonical actions are played', () => {
    const { domain, experiment } = registry.experiment(id)!
    const run = runProcedure(domain, experiment)
    if (!run.ok) {
      const step = experiment.steps[run.failedStep!]
      const seen = run.events.filter((e) => e.kind === 'observation').map((e) => e.text)
      throw new Error(`Step ${run.failedStep! + 1} "${step.instruction}" did not complete.\nObservations so far:\n- ${seen.join('\n- ')}`)
    }
  })

  test('no step is already complete before its actions (would skip itself)', () => {
    const { domain, experiment } = registry.experiment(id)!
    let state = domain.engine.create(experiment.setup)
    for (const step of experiment.steps) {
      expect(domain.engine.check(state, step.check), step.instruction).toBe(false)
      for (const a of step.action) state = domain.engine.apply(state, a).state
    }
  })
})

test('there are at least a dozen chemistry experiments', () => {
  expect(registry.experiments().filter((e) => e.domain === 'chemistry').length).toBeGreaterThanOrEqual(12)
})

test('there are at least a dozen physics experiments', () => {
  expect(registry.experiments().filter((e) => e.domain === 'physics').length).toBeGreaterThanOrEqual(12)
})

test('there are at least twenty biology experiments', () => {
  expect(registry.experiments().filter((e) => e.domain === 'biology').length).toBeGreaterThanOrEqual(20)
})
