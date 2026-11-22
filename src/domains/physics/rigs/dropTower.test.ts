import { physics } from '..'
import type { PhysicsAction, PhysicsSetup } from '../engine'

const E = physics.engine
const drop = (params: object, world: object = {}) => {
  let s = E.create({ rig: { kind: 'drop-tower', params }, world } as PhysicsSetup)
  const text: string[] = []
  for (const a of [{ type: 'drop-release' }, { type: 'wait', seconds: 30 }] as PhysicsAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t: string) => E.measure(s, i, t)?.value }
}

test('hammer and feather in a vacuum land together, at √(2h/g)', () => {
  const { m, text } = drop({ height: 4, left: 'hammer', right: 'feather' }, { air: false })
  expect(m('fall-timer', 'left')).toBeCloseTo(Math.sqrt(8 / 9.81), 3)
  expect(m('fall-timer', 'right')).toBeCloseTo(Math.sqrt(8 / 9.81), 3)
  expect(text.join(' ')).toMatch(/same moment/)
})

test('in air the feather drifts down at its terminal velocity (~0.5 m/s)', () => {
  const { m, text } = drop({ height: 4, left: 'hammer', right: 'feather' })
  expect(text.join(' ')).toMatch(/hammer wins/)
  expect(m('fall-timer', 'right')).toBeGreaterThan(7)
  expect(m('speed', 'right')).toBeCloseTo(m('terminal-velocity', 'right')!, 1)
})

test('gates: in a vacuum, distance ∝ t² (time to 4 m is twice time to 1 m)', () => {
  const { m } = drop({ height: 5, left: 'steel', right: null }, { air: false })
  expect(m('gate', 'left:4')! / m('gate', 'left:1')!).toBeCloseTo(2, 2) // readings rounded to 1 ms
})

test('the Moon: everything falls together, slowly', () => {
  const { m } = drop({ height: 2, left: 'pingpong', right: 'hammer' }, { planet: 'moon' })
  expect(m('fall-timer', 'left')).toBeCloseTo(Math.sqrt(4 / 1.62), 3)
  expect(m('fall-timer', 'right')).toBeCloseTo(m('fall-timer', 'left')!, 3)
})
