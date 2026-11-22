import { createRegistry, explain, runProcedure } from '.'
import { marbleExperiment, marbles } from './fixtures.test-helpers'

describe('explain', () => {
  it('picks the requested level', () => {
    const e = { simple: 'a', intermediate: 'b', advanced: 'c' }
    expect(explain(e, 'advanced')).toBe('c')
  })
})

describe('createRegistry', () => {
  it('indexes domains and experiments', () => {
    const r = createRegistry([marbles()])
    expect(r.domain('marbles')?.name).toBe('Marbles')
    expect(r.experiments().map((x) => x.id)).toEqual(['fill-the-jar'])
    expect(r.experiment('fill-the-jar')?.domain.id).toBe('marbles')
  })

  it('rejects experiments that fail the domain schemas', () => {
    const bad = marbleExperiment({ setup: { start: 'lots' } as never })
    expect(() => createRegistry([marbles([bad])])).toThrow(/fill-the-jar: setup.start/)
  })

  it('rejects a step whose action is not a valid domain action', () => {
    const exp = marbleExperiment()
    exp.steps[0].action = [{ type: 'shake' } as never]
    expect(() => createRegistry([marbles([exp])])).toThrow(/steps\.0\.action/)
  })

  it('rejects duplicate ids and mismatched domain fields', () => {
    const dup = marbles([marbleExperiment(), marbleExperiment({ domain: 'physics' })])
    expect(() => createRegistry([dup, marbles([])])).toThrow(
      /domain field is "physics"[\s\S]*duplicate experiment id[\s\S]*duplicate domain id/,
    )
  })

  it('rejects non-kebab ids and missing explanation levels', () => {
    const exp = marbleExperiment({ id: 'Fill Jar', intro: { simple: 'x' } as never })
    expect(() => createRegistry([marbles([exp])])).toThrow(/kebab-case[\s\S]*intro.intermediate/)
  })
})

describe('runProcedure', () => {
  it('passes when every step check holds after its canonical actions', () => {
    const run = runProcedure(marbles(), marbleExperiment())
    expect(run.ok).toBe(true)
    expect(run.events).toHaveLength(2)
  })

  it('reports the first step whose check fails', () => {
    const exp = marbleExperiment()
    exp.steps.push({ ...exp.steps[0], check: { atLeast: 100 } })
    expect(runProcedure(marbles(), exp)).toMatchObject({ ok: false, failedStep: 1 })
  })
})
