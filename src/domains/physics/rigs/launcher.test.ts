import { physics } from '..'
import type { PhysicsAction, PhysicsSetup } from '../engine'

const E = physics.engine
const ideal = { air: false, friction: false }
const fire = (params: object, world: object = ideal) => {
  let s = E.create({ rig: { kind: 'launcher', params }, world } as PhysicsSetup)
  const text: string[] = []
  for (const a of [{ type: 'launch-fire' }, { type: 'wait', seconds: 10 }] as PhysicsAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t = 'range') => E.measure(s, i, t)!.value }
}
const g = 9.81

test('no air: R = v² sin2θ / g, H = v² sin²θ / 2g, T = 2v sinθ / g', () => {
  const { m } = fire({ speed: 10, angleDeg: 30 })
  const th = Math.PI / 6
  expect(m('tape')).toBeCloseTo((100 * Math.sin(2 * th)) / g, 2)
  expect(m('height-gauge', 'ball')).toBeCloseTo((100 * Math.sin(th) ** 2) / (2 * g), 2)
  expect(m('flight-timer', 'ball')).toBeCloseTo((20 * Math.sin(th)) / g, 2)
})

test('no air: 45° goes furthest, and complementary angles land together', () => {
  const r = (a: number) => fire({ speed: 10, angleDeg: a }).m('tape')
  expect(r(45)).toBeGreaterThan(r(40))
  expect(r(45)).toBeGreaterThan(r(50))
  expect(r(30)).toBeCloseTo(r(60), 2)
})

test('with air, the ping-pong ball falls far short and the best angle drops below 45°', () => {
  const air = { air: true, friction: false }
  const steel = fire({ speed: 12, angleDeg: 45, ball: 'steel' }, air).m('tape')
  const pp = fire({ speed: 12, angleDeg: 45, ball: 'pingpong' }, air).m('tape')
  expect(pp).toBeLessThan(steel * 0.6)
  const pr = (a: number) => fire({ speed: 12, angleDeg: a, ball: 'pingpong' }, air).m('tape')
  expect(pr(38)).toBeGreaterThan(pr(45))
})

test('launching from a height goes further; hitting the target is announced', () => {
  expect(fire({ speed: 8, angleDeg: 45, height: 1.5 }).m('tape')).toBeGreaterThan(fire({ speed: 8, angleDeg: 45 }).m('tape'))
  const { text } = fire({ speed: Math.sqrt(6 * g), angleDeg: 45, targetX: 6 })
  expect(text.join(' ')).toMatch(/Bullseye/)
})

test('landing marks accumulate until cleared', () => {
  let s = fire({ speed: 8 }).s
  s = E.apply(s, { type: 'launch-set', angleDeg: 30 }).state
  s = E.apply(E.apply(s, { type: 'launch-fire' }).state, { type: 'wait', seconds: 5 }).state
  expect((s.rig.state as { shots: unknown[] }).shots).toHaveLength(2)
  s = E.apply(s, { type: 'launch-clear' }).state
  expect((s.rig.state as { shots: unknown[] }).shots).toHaveLength(0)
})
