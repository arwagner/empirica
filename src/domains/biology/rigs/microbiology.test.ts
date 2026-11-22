import { biology } from '..'
import type { RigAction } from '../../../core'
import { zoneDiameter } from './microbiology'

const E = biology.engine
const grow = (params: object, hours: number) => {
  let s = E.create({ rig: { kind: 'microbiology', params } })
  const text: string[] = []
  for (const a of [{ type: 'micro-inoculate' }, { type: 'micro-incubate' }, { type: 'wait', seconds: hours * 3600 }] as RigAction[]) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t: string) => E.measure(s, i, t)?.value }
}

test('Gram-positive B. subtilis: big penicillin zone; Gram-negative E. coli: almost none', () => {
  expect(zoneDiameter('b-subtilis', 'penicillin')).toBeGreaterThan(30)
  expect(zoneDiameter('e-coli', 'penicillin')).toBeLessThan(10)
  expect(zoneDiameter('e-coli', 'tetracycline')).toBeGreaterThan(20)
  expect(zoneDiameter('e-coli', 'blank')).toBe(6)
  const r = grow({ organism: 'e-coli', tempC: 37 }, 24)
  expect(r.text.join(' ')).toMatch(/clear zones/)
  expect(r.m('ruler', 'zone:2')).toBeGreaterThan(20)
})

test('zones only appear once the lawn has grown', () => {
  expect(grow({ tempC: 30 }, 4).m('ruler', 'zone:0')).toBeUndefined()
  expect(grow({ tempC: 30 }, 24).m('ruler', 'zone:0')).toBeGreaterThan(30)
})

test('dilution plating: 10⁻⁶ gives a countable plate, 10⁻⁴ is too many', () => {
  const ok = grow({ mode: 'count', dilution: 6, tempC: 30 }, 24)
  expect(ok.m('colony-counter', 'plate')).toBeGreaterThan(70)
  expect(ok.m('colony-counter', 'plate')).toBeLessThan(130)
  expect(ok.m('cells-per-ml', 'culture')).toBeGreaterThan(5e8)
  expect(grow({ mode: 'count', dilution: 4, tempC: 30 }, 24).text.join(' ')).toMatch(/too many to count/)
})

test('skipping the flame lets contaminants in; same seed, same plate', () => {
  const dirty = grow({ mode: 'count', dilution: 6, flamed: false }, 24)
  expect(dirty.m('colony-counter', 'contaminants')).toBeGreaterThan(0)
  expect(dirty.text.join(' ')).toMatch(/contamination/)
  expect(grow({ mode: 'count', dilution: 6, flamed: false }, 24).m('colony-counter', 'plate')).toBe(dirty.m('colony-counter', 'plate'))
})

test('broth growth curve: lag, log, stationary, death; nothing grows in the fridge', () => {
  const r = grow({ mode: 'broth', organism: 'e-coli', tempC: 37 }, 48)
  expect(r.text.join(' ')).toMatch(/turn cloudy[\s\S]*stopped increasing[\s\S]*falling/)
  const early = grow({ mode: 'broth', organism: 'e-coli', tempC: 37 }, 1).m('od-meter', 'broth')!
  const mid = grow({ mode: 'broth', organism: 'e-coli', tempC: 37 }, 8).m('od-meter', 'broth')!
  expect(mid).toBeGreaterThan(early * 50)
  expect(grow({ tempC: 4 }, 48).text.join(' ')).toMatch(/Nothing is growing/)
})
