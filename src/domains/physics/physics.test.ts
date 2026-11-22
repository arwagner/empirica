import { crossing, drag, friction, rk4, terminalVelocity } from './mechanics'
import { createPhysicsEngine, physicsDomain } from './engine'
import { dropRig } from './testRig.test-helpers'
import { createRegistry } from '../../core'

describe('mechanics helpers', () => {
  test('RK4 keeps a harmonic oscillator\'s energy for 100 s at 1 ms', () => {
    let y = [1, 0] // x, v with ω = 2π
    const w2 = (2 * Math.PI) ** 2
    for (let i = 0; i < 100000; i++) y = rk4((_, [x, v]) => [v, -w2 * x], i * 0.001, y, 0.001)
    const E = 0.5 * y[1] ** 2 + 0.5 * w2 * y[0] ** 2
    expect(E / (0.5 * w2)).toBeCloseTo(1, 6)
    expect(y[0]).toBeCloseTo(1, 4) // 100 whole periods later
  })

  test('drag opposes motion; terminal velocity formula', () => {
    expect(drag(10, 1.2, 0.5)).toBeCloseTo(-30)
    expect(drag(-10, 1.2, 0.5)).toBeCloseTo(30)
    expect(terminalVelocity(0.1, 9.81, 1.2, 0.01)).toBeCloseTo(Math.sqrt(2 * 0.1 * 9.81 / 0.012))
    expect(terminalVelocity(1, 9.81, 0, 1)).toBe(Infinity)
  })

  test('static friction holds until the applied force exceeds μN, kinetic opposes motion', () => {
    expect(friction(0, 3, 0.5, 10)).toBe(-3)
    expect(friction(0, 8, 0.5, 10)).toBe(-5)
    expect(friction(2, 8, 0.5, 10)).toBe(-5)
    expect(friction(-2, 0, 0.5, 10)).toBe(5)
  })

  test('crossing interpolates within the step', () => {
    expect(crossing(0, 2, 1, 0, 1)).toBeCloseTo(0.5)
    expect(crossing(0, 2, 1, 1.5, 1)).toBeNull()
  })
})

describe('physics engine', () => {
  const { engine: E } = createPhysicsEngine([dropRig])
  const setup = { rig: { kind: 'test-drop', params: { h: 2, gateY: 1 } } }

  test('free fall in a vacuum: gate time matches √(2Δh/g) to the microsecond', () => {
    let s = E.create({ ...setup, world: { air: false } })
    s = E.apply(s, { type: 'drop' }).state
    s = E.apply(s, { type: 'wait', seconds: 2 }).state
    expect(E.measure(s, 'gate-timer', 'gate')!.value).toBeCloseTo(Math.sqrt(2 / 9.81), 3)
    expect(E.check(s, { type: 'observed', tag: 'landed' })).toBe(true)
  })

  test('air resistance makes it later; the Moon makes it much later', () => {
    const run = (world: object) => {
      let s = E.create({ rig: { kind: 'test-drop', params: { h: 2, gateY: 1, cdA: 0.02, m: 0.01 } }, world })
      s = E.apply(s, { type: 'drop' }).state
      s = E.apply(s, { type: 'wait', seconds: 5 }).state
      return E.measure(s, 'gate-timer', 'gate')!.value
    }
    const vacuum = run({ air: false })
    expect(run({ air: true })).toBeGreaterThan(vacuum + 0.01)
    expect(run({ planet: 'moon' })).toBeCloseTo(Math.sqrt(2 / 1.62), 2)
  })

  test('deterministic: same actions, same state', () => {
    const go = () => [{ type: 'drop' }, { type: 'wait', seconds: 0.3337 }].reduce((s, a) => E.apply(s, a).state, E.create(setup))
    expect(go()).toEqual(go())
  })

  test('time skips ahead when nothing moves', () => {
    const s = E.apply(E.create(setup), { type: 'wait', seconds: 600 }).state
    expect(s.time).toBe(600)
  })

  test('set-world and world/reading checks', () => {
    let s = E.apply(E.create(setup), { type: 'set-world', planet: 'mars', air: false }).state
    expect(E.check(s, { type: 'world', planet: 'mars', air: false })).toBe(true)
    s = E.apply(s, { type: 'drop' }).state
    s = E.apply(s, { type: 'wait', seconds: 3 }).state
    expect(E.check(s, { type: 'reading', instrument: 'gate-timer', target: 'gate', min: 0.7, max: 0.8 })).toBe(true)
  })

  test('actions for a different rig get a clear error', () => {
    expect(() => E.apply(E.create(setup), { type: 'launch' })).toThrow(/can't do "launch"/)
  })

  test('the domain validates in a registry with its schemas', () => {
    expect(() => createRegistry([physicsDomain([dropRig])])).not.toThrow()
    const d = physicsDomain([dropRig])
    expect(d.schemas.action.safeParse({ type: 'set-height', h: 3 }).success).toBe(true)
    expect(d.schemas.action.safeParse({ type: 'set-height', h: -3 }).success).toBe(false)
    expect(d.schemas.setup.safeParse({ rig: { kind: 'nope' } }).success).toBe(false)
  })
})
