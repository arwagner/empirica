import { biology } from '..'
import type { RigAction } from '../../../core'
import { YEAR } from './ecology'

const E = biology.engine
const run = (params: object, years: number, more: RigAction[] = []) => {
  let s = E.create({ rig: { kind: 'ecology', params } })
  const text: string[] = []
  for (const a of [{ type: 'eco-run' }, { type: 'wait', seconds: years * YEAR }, ...more] as RigAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t: string) => E.measure(s, i, t)?.value }
}

test('rabbits and foxes cycle, with the fox peak lagging the rabbits', () => {
  const r = run({}, 30)
  expect(r.text.join(' ')).toMatch(/foxes peaked \d+ months after the rabbits/)
  expect(r.m('peak-lag', 'cycle')!).toBeGreaterThan(1)
  // damped towards the coexistence equilibrium R* = m/(ba) = 1500, F* = r(1 − R*/K)/a ≈ 244
  const late = run({}, 200)
  expect(late.m('census', 'rabbits')!).toBeGreaterThan(1200)
  expect(late.m('census', 'rabbits')!).toBeLessThan(1800)
})

test('no foxes: rabbits grow logistically to the carrying capacity', () => {
  const r = run({ foxes: 0, rabbits: 20, K: 3000 }, 20)
  expect(r.m('census', 'rabbits')!).toBeGreaterThan(2850)
  expect(r.text.join(' ')).toMatch(/level off/)
})

test('too little grass: the foxes starve out', () => {
  expect(run({ K: 1000 }, 60).text.join(' ')).toMatch(/foxes have died out/)
})

test('peppered moths: dark moths take over on sooty bark, retreat when it is cleaned', () => {
  const sooty = run({ mode: 'selection', environment: 'sooty', darkAllele: 0.02 }, 60)
  expect(sooty.m('dark-percent', 'moths')!).toBeGreaterThan(80)
  expect(sooty.text.join(' ')).toMatch(/dark moths are now the majority/)
  const cleaned = run({ mode: 'selection', environment: 'sooty', darkAllele: 0.02 }, 60, [{ type: 'eco-set', environment: 'clean' }, { type: 'wait', seconds: 80 * YEAR }])
  expect(cleaned.m('dark-percent', 'moths')!).toBeLessThan(50)
  expect(cleaned.text.join(' ')).toMatch(/light moths are the majority again/)
})

test('same seed, same moth history', () => {
  const a = run({ mode: 'selection', darkAllele: 0.1, popSize: 100 }, 30).m('allele-frequency', 'moths')
  const b = run({ mode: 'selection', darkAllele: 0.1, popSize: 100 }, 30).m('allele-frequency', 'moths')
  expect(a).toBe(b)
})
