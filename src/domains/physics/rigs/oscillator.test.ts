import { physics } from '..'
import type { PhysicsAction, PhysicsSetup } from '../engine'

const E = physics.engine
const ideal = { air: false, friction: false }
const run = (params: object, world: object = ideal, seconds = 30) => {
  let s = E.create({ rig: { kind: 'oscillator', params }, world } as PhysicsSetup)
  const text: string[] = []
  for (const a of [{ type: 'osc-release' }, { type: 'wait', seconds }] as PhysicsAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t = 'bob') => E.measure(s, i, t)?.value }
}

test('small-angle pendulum: T = 2π√(L/g), independent of mass', () => {
  for (const mass of [0.05, 1]) expect(run({ length: 1, angleDeg: 3, mass }).m('period')).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 9.81), 2)
  expect(run({ length: 0.25, angleDeg: 3 }).m('period')).toBeCloseTo(2 * Math.PI * Math.sqrt(0.25 / 9.81), 2)
})

test('large angles swing slower (60° is ~7% longer)', () => {
  const small = run({ length: 1, angleDeg: 3 }).m('period')!
  const big = run({ length: 1, angleDeg: 60 }).m('period')!
  expect(big / small).toBeCloseTo(1.073, 2)
})

test('ten swings are timed and announced', () => {
  const { m, text } = run({ length: 1, angleDeg: 5 }, ideal, 25)
  expect(m('swing-counter')).toBeGreaterThanOrEqual(10)
  expect(m('stopwatch')).toBeCloseTo(10 * 2 * Math.PI * Math.sqrt(1 / 9.81), 1)
  expect(text.join(' ')).toMatch(/10 full swings take/)
})

test('on the Moon the same pendulum is much slower', () => {
  expect(run({ length: 1, angleDeg: 3 }, { ...ideal, planet: 'moon' }, 60).m('period')).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 1.62), 1)
})

test('spring: extension = mg/k (Hooke) and T = 2π√(m/k)', () => {
  const { m, text } = (() => {
    let s = E.create({ rig: { kind: 'oscillator', params: { mode: 'spring', mass: 0.2, k: 20 } }, world: ideal } as PhysicsSetup)
    const r = E.apply(s, { type: 'osc-set', mass: 0.4 })
    s = r.state
    return { m: (i: string, t: string) => E.measure(s, i, t)!.value, text: r.events.map((e) => e.text) }
  })()
  expect(text.join(' ')).toMatch(/stretches 19.6 cm/)
  expect(m('ruler', 'extension')).toBeCloseTo(((0.4 * 9.81) / 20) * 100, 1) // hanging at rest, before the pull
  expect(m('force-meter', 'spring')).toBeCloseTo(0.4 * 9.81, 2) // at rest the spring holds the weight, mg
  expect(run({ mode: 'spring', mass: 0.5, k: 20 }).m('period')).toBeCloseTo(2 * Math.PI * Math.sqrt(0.5 / 20), 2)
})

test('air and friction damp the swing', () => {
  const ideal1 = run({ length: 1, angleDeg: 20 }, ideal, 60).s
  const real = run({ length: 1, angleDeg: 20 }, { air: true, friction: true }, 60).s
  const amp = (s: typeof real) => Math.hypot((s.rig.state as { q: number }).q, (s.rig.state as { w: number }).w / Math.sqrt(9.81))
  expect(amp(real)).toBeLessThan(amp(ideal1) * 0.7)
})
