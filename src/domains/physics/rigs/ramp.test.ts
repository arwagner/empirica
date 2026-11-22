import { physics } from '..'
import type { PhysicsAction, PhysicsSetup } from '../engine'

const E = physics.engine
const run = (setup: PhysicsSetup, actions: PhysicsAction[]) => {
  let s = E.create(setup)
  const text: string[] = []
  for (const a of actions) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text }
}
const ramp = (params: object, world: object = {}): PhysicsSetup => ({ rig: { kind: 'ramp', params }, world })
const go: PhysicsAction[] = [{ type: 'ramp-release' }, { type: 'wait', seconds: 5 }]

test('frictionless, airless: x = ½ g sinθ t² at both gates', () => {
  const { s } = run(ramp({ angleDeg: 10 }, { air: false, friction: false }), go)
  const a = 9.81 * Math.sin((10 * Math.PI) / 180)
  for (const [id, x] of [['A', 0.5], ['B', 1.5]] as const) {
    expect(E.measure(s, 'light-gate', id)!.value).toBeCloseTo(Math.sqrt((2 * (x - 0.05)) / a), 2)
    expect(E.measure(s, 'gate-speed', id)!.value).toBeCloseTo(Math.sqrt(2 * a * (x - 0.05)), 2)
  }
  expect(E.check(s, { type: 'observed', tag: 'bottom' })).toBe(true)
})

test('friction slows it: a = g(sinθ − μcosθ)', () => {
  const { s } = run(ramp({ angleDeg: 20, surface: 'wood' }, { air: false }), go)
  const th = (20 * Math.PI) / 180
  const a = 9.81 * (Math.sin(th) - 0.2 * Math.cos(th))
  expect(E.measure(s, 'light-gate', 'B')!.value).toBeCloseTo(Math.sqrt((2 * 1.45) / a), 2)
})

test('mass doesn\'t matter without air resistance', () => {
  const t = (mass: number) => E.measure(run(ramp({ angleDeg: 15, mass, surface: 'wood' }, { air: false }), go).s, 'light-gate', 'B')!.value
  expect(t(0.2)).toBeCloseTo(t(4), 4)
})

test('too shallow for the surface: friction holds it', () => {
  const { s, text } = run(ramp({ angleDeg: 8, surface: 'felt' }), go)
  expect(text.join(' ')).toMatch(/friction holds it/)
  expect(E.measure(s, 'ruler', 'cart')!.value).toBeCloseTo(0.05)
})

test('moving a gate and changing settings resets the run', () => {
  const { s } = run(ramp({}), [...go, { type: 'ramp-move-gate', gate: 'B', x: 1 }, ...go])
  expect(E.measure(s, 'ruler', 'B')!.value).toBe(1)
  expect(E.measure(s, 'light-gate', 'B')).not.toBeNull()
})

test('pulley on a flat frictionless track: a = mg / (M + m) (Newton\'s second law)', () => {
  let { s } = run(ramp({ angleDeg: 0, mass: 0.9, hanging: 0.1 }, { air: false, friction: false }), [{ type: 'ramp-release' }, { type: 'wait', seconds: 0.5 }])
  expect(E.measure(s, 'accelerometer', 'cart')!.value).toBeCloseTo((0.1 * 9.81) / 1.0, 3)
  s = E.apply(s, { type: 'wait', seconds: 5 }).state
  const a = 0.981
  expect(E.measure(s, 'light-gate', 'B')!.value).toBeCloseTo(Math.sqrt((2 * 1.45) / a), 2)
})

test('a small hanging mass can\'t beat static friction on felt', () => {
  const { text } = run(ramp({ angleDeg: 0, mass: 1, hanging: 0.2, surface: 'felt' }), go)
  expect(text.join(' ')).toMatch(/friction holds it/)
})
