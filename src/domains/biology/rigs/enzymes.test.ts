import { biology } from '..'
import type { RigAction } from '../../../core'

const E = biology.engine
const run = (params: object, seconds = 60, more: RigAction[] = []) => {
  let s = E.create({ rig: { kind: 'enzymes', params } })
  const text: string[] = []
  for (const a of [...more, { type: 'enz-start' }, { type: 'wait', seconds }] as RigAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t = 'oxygen') => E.measure(s, i, t)?.value }
}
const rate = (p: object) => run(p, 31).m('initial-rate')!

test('liver catalase makes oxygen; potato much less; water and boiled liver none', () => {
  const liver = rate({})
  expect(liver).toBeGreaterThan(0.2)
  expect(rate({ source: 'potato' })).toBeLessThan(liver / 5)
  expect(rate({ source: 'none' })).toBe(0)
  const boiled = run({ boiled: true })
  expect(boiled.m('gas-syringe')).toBe(0)
  expect(boiled.text.join(' ')).toMatch(/boiled enzyme/)
})

test('temperature: faster up to ~40 °C, then the enzyme denatures and the run dies', () => {
  expect(rate({ tempC: 20 })).toBeLessThan(rate({ tempC: 37 }))
  const hot = run({ tempC: 65 }, 120)
  expect(hot.text.join(' ')).toMatch(/fizzing dies away/)
  expect(rate({ tempC: 65 })).toBeLessThan(rate({ tempC: 37 }))
})

test('pH optimum near 7', () => {
  const r7 = rate({ pH: 7 })
  expect(rate({ pH: 4 })).toBeLessThan(r7 / 3)
  expect(rate({ pH: 10 })).toBeLessThan(r7 / 3)
})

test('more substrate → faster, but levels off (Michaelis–Menten)', () => {
  const r1 = rate({ substratePct: 1 })
  const r3 = rate({ substratePct: 3 })
  const r6 = rate({ substratePct: 6 })
  expect(r3).toBeGreaterThan(r1)
  expect(r6 - r3).toBeLessThan(r3 - r1)
})

test('double the enzyme, about double the initial rate; total gas set by substrate', () => {
  expect(rate({ amount: 2, substratePct: 1 }) / rate({ amount: 1, substratePct: 1 })).toBeCloseTo(2, 0)
  const done = run({ substratePct: 0.5, amount: 3 }, 600)
  expect(done.text.join(' ')).toMatch(/slows to a stop/)
  expect(done.m('gas-syringe')).toBeCloseTo(0.5 * 0.294 * 0.02 * 0.5 * 24000, 0)
})
