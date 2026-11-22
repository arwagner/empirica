import { biology } from '..'
import type { RigAction } from '../../../core'
import { chiSquare, predict, type GeneticsState } from './genetics'

const E = biology.engine
const run = (actions: RigAction[], organism = 'pea', seed = 7) => {
  let s = E.create({ rig: { kind: 'genetics', params: { organism, seed } } })
  const text: string[] = []
  for (const a of actions) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, rs: s.rig.state as GeneticsState, text, m: (i: string, t: string) => E.measure(s, i, t)?.value }
}
const roundXwrinkled: RigAction[] = [
  { type: 'gen-stock', slot: 0, traits: { R: 'dominant' } },
  { type: 'gen-stock', slot: 1, traits: { R: 'recessive' } },
  { type: 'gen-cross' },
]

test('Mendel: true-breeding round × wrinkled gives all round F1', () => {
  const r = run(roundXwrinkled)
  expect(r.text[0]).toMatch(/^F1: 400 round\.$/)
  expect(E.check(r.s, { type: 'observed', tag: 'uniform' })).toBe(true)
})

test('F1 × F1 gives about 3 round : 1 wrinkled, and χ² says it fits', () => {
  const r = run([...roundXwrinkled,
    { type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant' } },
    { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant' } },
    { type: 'gen-cross', n: 1000 }])
  expect(r.rs.generations.at(-1)!.label).toBe('F2')
  expect(r.m('proportion', 'class:wrinkled')!).toBeGreaterThan(0.21)
  expect(r.m('proportion', 'class:wrinkled')!).toBeLessThan(0.29)
  expect(r.m('p-value', 'latest')!).toBeGreaterThan(0.01)
  expect(r.rs.parents[0]!.known).toBe(true) // every F1 round plant is Rr
})

test('same seed → same counts; different seed → different counts', () => {
  const a = run([...roundXwrinkled, { type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-cross' }], 'pea', 3)
  const b = run([...roundXwrinkled, { type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-cross' }], 'pea', 3)
  const c = run([...roundXwrinkled, { type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-cross' }], 'pea', 4)
  expect(a.text).toEqual(b.text)
  expect(a.text.at(-1)).not.toEqual(c.text.at(-1))
})

test('dihybrid prediction is 9:3:3:1; picking an F2 round plant leaves its genotype unknown', () => {
  const p = predict('pea', { R: 'Rr', Y: 'Yy', P: 'PP', T: 'TT' }, { R: 'Rr', Y: 'Yy', P: 'PP', T: 'TT' }, ['R', 'Y'])
  expect(p['round yellow']).toBeCloseTo(9 / 16)
  expect(p['wrinkled green']).toBeCloseTo(1 / 16)
  const r = run([...roundXwrinkled,
    { type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant' } },
    { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant' } },
    { type: 'gen-cross' },
    { type: 'gen-pick', slot: 0, generation: 2, phenotype: { R: 'dominant' } }])
  expect(r.rs.parents[0]!.known).toBe(false)
})

test('flies: white eyes are X-linked (Morgan): red female × white male, F2 white eyes only in males', () => {
  const r = run([
    { type: 'gen-score', genes: ['W'] },
    { type: 'gen-stock', slot: 0, traits: { W: 'dominant' }, sex: 'F' },
    { type: 'gen-stock', slot: 1, traits: { W: 'recessive' }, sex: 'M' },
    { type: 'gen-cross' },
    { type: 'gen-pick', slot: 0, generation: 1, phenotype: { W: 'dominant' }, sex: 'F' },
    { type: 'gen-pick', slot: 1, generation: 1, phenotype: { W: 'dominant' }, sex: 'M' },
    { type: 'gen-cross', n: 1000 },
  ], 'fly')
  expect(r.text[0]).toMatch(/red-eyed female/)
  expect(r.text[0]).not.toMatch(/white/)
  expect(r.m('count', 'class:white-eyed female')).toBe(0)
  expect(r.m('proportion', 'class:white-eyed male')!).toBeCloseTo(0.25, 1)
})

test('chi-square: a perfect fit has p = 1; a bad fit has tiny p', () => {
  expect(chiSquare({ a: 75, b: 25 }, { a: 0.75, b: 0.25 }).p).toBeCloseTo(1)
  expect(chiSquare({ a: 50, b: 50 }, { a: 0.75, b: 0.25 }).p).toBeLessThan(0.001)
  expect(chiSquare({ a: 70, b: 30 }, { a: 0.75, b: 0.25 }).chi).toBeCloseTo(1.333, 2)
})

test('crossing explains dominance and segregation from the actual parents', () => {
  let s = E.create({ rig: { kind: 'genetics', params: { organism: 'pea' } } })
  for (const a of roundXwrinkled.slice(0, 2)) s = E.apply(s, a).state
  const r = E.apply(s, { type: 'gen-cross' })
  const why = r.events.find((e) => e.kind === 'observation' && e.why)
  expect(why?.kind === 'observation' && why.why?.simple).toMatch(/passes on just one copy/)
  expect(why?.kind === 'observation' && why.why?.intermediate).toMatch(/RR × rr/)
})
