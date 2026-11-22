import { advance, hintFor, isFinished, startRun } from '.'
import { marbleExperiment, marbles } from './fixtures.test-helpers'

const e = (t: string) => ({ simple: t, intermediate: t, advanced: t })
const exp = marbleExperiment({
  steps: [
    { instruction: 'Add 2', action: [{ type: 'add', count: 2 }], check: { atLeast: 2 }, observation: 'two', explanation: e('2') },
    { instruction: 'Add 3 more', action: [{ type: 'add', count: 3 }], check: { atLeast: 5 }, observation: 'five', explanation: e('5'), hint: 'Three more!' },
    { instruction: 'Reach 6', action: [{ type: 'add', count: 1 }], check: { atLeast: 6 }, observation: 'six', explanation: e('6') },
  ],
})
const d = marbles([exp])

test('a step completes when its check holds, however it was reached', () => {
  const r = advance(d, exp, startRun(exp), 2)
  expect(r.completed).toEqual([0])
  expect(r.run.current).toBe(1)
})

test('nothing changes while the check fails', () => {
  const run = startRun(exp)
  expect(advance(d, exp, run, 1)).toEqual({ run, completed: [] })
})

test('running ahead completes several steps at once, and the run can finish', () => {
  const r = advance(d, exp, startRun(exp), 6)
  expect(r.completed).toEqual([0, 1, 2])
  expect(isFinished(exp, r.run)).toBe(true)
})

test('hints: author hint when present, else the canonical action described by the engine', () => {
  expect(hintFor(d, exp, startRun(exp), 0)).toBe('Try this: Added 2 marbles.')
  const r = advance(d, exp, startRun(exp), 2)
  expect(hintFor(d, exp, r.run, 2)).toBe('Three more!')
  expect(hintFor(d, exp, advance(d, exp, startRun(exp), 6).run, 6)).toBeNull()
})
