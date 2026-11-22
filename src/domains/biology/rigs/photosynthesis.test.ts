import { biology } from '..'
import type { RigAction } from '../../../core'

const E = biology.engine
const count = (params: object) => {
  let s = E.create({ rig: { kind: 'photosynthesis', params } })
  const events = []
  for (const a of [{ type: 'photo-count' }, { type: 'wait', seconds: 61 }] as RigAction[]) {
    const r = E.apply(s, a)
    s = r.state
    events.push(...r.events)
  }
  const obs = events.find((e) => e.kind === 'observation')
  return { n: E.measure(s, 'bubble-count', 'latest')!.value, why: obs?.kind === 'observation' ? obs.why!.simple : '', s }
}

test('closer lamp → more bubbles; light follows the inverse square law', () => {
  const far = count({ distance: 40 }).n
  const mid = count({ distance: 20 }).n
  const near = count({ distance: 10 }).n
  expect(near).toBeGreaterThan(mid)
  expect(mid).toBeGreaterThan(far)
  const s = count({ distance: 20 }).s
  expect(E.measure(s, 'light-meter', 'plant')!.value).toBe(2500)
})

test('limiting factors: with a close lamp CO₂ limits; with a far lamp light limits', () => {
  const far = count({ distance: 60, co2: 0.5 })
  expect(far.why).toMatch(/light is what's holding it back/)
  expect(count({ distance: 60, co2: 2 }).n - far.n).toBeLessThan(3)
  const near = count({ distance: 8, co2: 0.05 })
  expect(near.why).toMatch(/carbon dioxide is what's holding it back/)
  expect(count({ distance: 8, co2: 1 }).n).toBeGreaterThan(near.n + 10)
})

test('green light barely works; dark gives ~no bubbles; too hot slows it', () => {
  expect(count({ filter: 'green' }).n).toBeLessThan(count({ filter: 'red' }).n / 2)
  expect(count({ lamp: false }).n).toBeLessThanOrEqual(1)
  expect(count({ tempC: 42 }).n).toBeLessThan(count({ tempC: 28 }).n)
  expect(count({ tempC: 42 }).why).toMatch(/too hot/)
})

test('counts are kept for graphing', () => {
  let s = E.create({ rig: { kind: 'photosynthesis' } })
  for (const d of [10, 20, 40]) {
    s = E.apply(s, { type: 'photo-set', distance: d }).state
    s = E.apply(s, { type: 'photo-count' }).state
    s = E.apply(s, { type: 'wait', seconds: 61 }).state
  }
  expect((s.rig.state as { counts: unknown[] }).counts).toHaveLength(3)
})
