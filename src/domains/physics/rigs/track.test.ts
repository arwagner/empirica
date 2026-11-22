import { physics } from '..'
import type { PhysicsAction, PhysicsSetup } from '../engine'
import { collide } from './track'

const E = physics.engine
const ideal = { air: false, friction: false }
const run = (params: object, world: object = ideal, seconds = 3) => {
  let s = E.create({ rig: { kind: 'track', params }, world } as PhysicsSetup)
  const text: string[] = []
  for (const a of [{ type: 'track-launch' }, { type: 'wait', seconds }] as PhysicsAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  const m = (inst: string, t: string) => E.measure(s, inst, t)!.value
  return { s, text, m }
}

test('collide(): momentum always conserved; e=1 conserves KE; e=0 sticks', () => {
  for (const e of [0, 0.3, 1]) {
    const r = collide(0.4, 1.2, 0.7, -0.3, e)
    expect(0.4 * r.vA + 0.7 * r.vB).toBeCloseTo(0.4 * 1.2 + 0.7 * -0.3)
    expect(r.vB - r.vA).toBeCloseTo(e * (1.2 - -0.3))
  }
})

test('equal masses, elastic: they swap velocities', () => {
  // gap 0.65 m at 0.6 m/s: they meet at ~1.08 s
  const { m, s } = run({ mA: 0.5, mB: 0.5, vA: 0.6, vB: 0, bumper: 'elastic' }, ideal, 1.5)
  expect(m('velocity', 'A')).toBeCloseTo(0, 3)
  expect(m('velocity', 'B')).toBeCloseTo(0.6, 3)
  expect(m('kinetic-energy', 'after')).toBeCloseTo(m('kinetic-energy', 'before'), 4)
  expect(E.check(s, { type: 'observed', tag: 'collision' })).toBe(true)
})

test('sticky: they move off together at mA·vA/(mA+mB), losing kinetic energy', () => {
  const { m } = run({ mA: 0.5, mB: 1.0, vA: 0.9, vB: 0, bumper: 'sticky' }, ideal, 0.8)
  expect(m('velocity', 'A')).toBeCloseTo(0.3, 3)
  expect(m('velocity', 'B')).toBeCloseTo(0.3, 3)
  expect(m('momentum', 'after')).toBeCloseTo(m('momentum', 'before'), 4)
  expect(m('kinetic-energy', 'after')).toBeCloseTo(m('kinetic-energy', 'before') / 3, 4)
})

test('explosion: total momentum stays zero; lighter glider goes faster', () => {
  const { m, text } = run({ mA: 0.25, mB: 1, mode: 'explode', springJ: 0.2 }, ideal, 0.2)
  expect(text.join(' ')).toMatch(/pushes them apart/)
  expect(m('momentum', 'after')).toBeCloseTo(0, 6)
  // readings are rounded to 3 dp, so compare loosely
  expect(Math.abs(m('velocity', 'A')) / m('velocity', 'B')).toBeCloseTo(4, 1)
  expect(m('kinetic-energy', 'after')).toBeCloseTo(0.2, 4)
})

test('everything ends at the end stops (time can skip ahead after)', () => {
  const { s, text } = run({ vA: 0.8, bumper: 'elastic' }, ideal, 60)
  expect(text.join(' ')).toMatch(/end stop/)
  expect(s.time).toBe(60)
})

test('a little friction slows them down', () => {
  const ideal1 = run({ vA: 0.5, vB: 0, xB: 1.8 }, ideal, 0.5).m('velocity', 'A')
  const real = run({ vA: 0.5, vB: 0, xB: 1.8 }, { air: false, friction: true }, 0.5).m('velocity', 'A')
  expect(real).toBeLessThan(ideal1)
  expect(real).toBeGreaterThan(0.47) // only a tiny loss: μ = 0.004 on an air track
})
