import { biology } from '..'
import type { RigAction } from '../../../core'

const E = biology.engine
const run = (params: object, seconds: number) => {
  let s = E.create({ rig: { kind: 'osmosis', params } })
  const text: string[] = []
  for (const a of [{ type: 'osm-start' }, { type: 'wait', seconds }] as RigAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t: string) => E.measure(s, i, t)?.value }
}

test('potato gains mass in water, loses it in strong sugar; isotonic near 0.3 M', () => {
  const r = run({}, 3600)
  expect(r.m('percent-change', 'tube:0')!).toBeGreaterThan(10)
  expect(r.m('percent-change', 'tube:5')!).toBeLessThan(-25)
  expect(r.m('isotonic', 'potato')).toBeCloseTo(0.3, 1)
  expect(r.text.join(' ')).toMatch(/feel firm and heavier/)
})

test('mass change grows over time towards a limit', () => {
  const early = run({}, 600).m('percent-change', 'tube:0')!
  const late = run({}, 7200).m('percent-change', 'tube:0')!
  const later = run({}, 20000).m('percent-change', 'tube:0')!
  expect(late).toBeGreaterThan(early)
  expect(later - late).toBeLessThan(late - early)
})

test('agar cubes: clearing time ∝ size², faster when warm', () => {
  const r = run({ mode: 'diffusion' }, 3600)
  const t1 = r.m('clear-time', 'cube:0')!
  const t2 = r.m('clear-time', 'cube:1')!
  const t3 = r.m('clear-time', 'cube:2')!
  expect(t2 / t1).toBeCloseTo(4, 0)
  expect(t3 / t1).toBeCloseTo(9, 0)
  expect(r.text.filter((t) => /colourless/.test(t))).toHaveLength(3)
  const warm = run({ mode: 'diffusion', tempC: 40 }, 3600)
  expect(warm.m('clear-time', 'cube:0')!).toBeCloseTo(t1 / 2, 0)
})
