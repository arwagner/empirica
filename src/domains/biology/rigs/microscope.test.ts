import { biology } from '..'
import type { RigAction } from '../../../core'

const E = biology.engine
const run = (actions: RigAction[]) => {
  let s = E.create({ rig: { kind: 'microscope' } })
  const text: string[] = []
  for (const a of actions) {
    const r = E.apply(s, a)
    s = r.state
    text.push(...r.events.filter((e) => e.kind === 'observation').map((e) => e.text))
  }
  return { s, text, m: (i: string, t = 'microscope') => E.measure(s, i, t)?.value }
}

test('onion at 40× total: cells visible once focused; nucleus only with stain', () => {
  const blurry = run([{ type: 'mic-load', specimen: 'onion' }])
  expect(blurry.text).toEqual([])
  const sharp = run([{ type: 'mic-load', specimen: 'onion' }, { type: 'mic-focus', focus: 42 }])
  expect(sharp.text.join(' ')).toMatch(/brick-shaped cells/)
  expect(sharp.text.join(' ')).not.toMatch(/nucleus/)
  const stained = run([{ type: 'mic-load', specimen: 'onion' }, { type: 'mic-stain', stain: 'iodine' }, { type: 'mic-objective', objective: 10 }, { type: 'mic-focus', focus: 43.5 }])
  expect(stained.text.join(' ')).toMatch(/nucleus/)
})

test('field of view shrinks as magnification grows; graticule measures cells', () => {
  const r = run([{ type: 'mic-load', specimen: 'onion' }, { type: 'mic-objective', objective: 10 }, { type: 'mic-focus', focus: 43.5 }])
  expect(r.m('magnification')).toBe(100)
  expect(r.m('field-of-view')).toBe(1800)
  expect(r.m('graticule', 'cell')).toBeCloseTo(252, -1)
})

test('higher power needs finer focus (depth of field)', () => {
  const at40 = run([{ type: 'mic-load', specimen: 'cheek' }, { type: 'mic-objective', objective: 40 }, { type: 'mic-focus', focus: 42 }]) // 1.5 units off at 40×
  expect(at40.m('sharpness')).toBeLessThan(40)
  const at4 = run([{ type: 'mic-load', specimen: 'cheek' }, { type: 'mic-focus', focus: 41 }])
  expect(at4.m('sharpness')).toBeGreaterThan(95)
})

test('bacteria need 100×, oil and crystal violet', () => {
  const base: RigAction[] = [{ type: 'mic-load', specimen: 'bacteria' }, { type: 'mic-stain', stain: 'crystal-violet' }, { type: 'mic-objective', objective: 100 }, { type: 'mic-focus', focus: 48 }]
  const noOil = run(base)
  expect(noOil.text.join(' ')).toMatch(/dim and fuzzy/)
  expect(noOil.text.join(' ')).not.toMatch(/purple rods/)
  const oil = run([...base, { type: 'mic-oil' }])
  expect(oil.text.join(' ')).toMatch(/purple rods/)
  expect(E.check(oil.s, { type: 'observed', tag: 'seen:bacteria:bacteria' })).toBe(true)
})

test('red blood cells need high power; seen features carry a why', () => {
  const low = run([{ type: 'mic-load', specimen: 'blood' }, { type: 'mic-focus', focus: 44 }])
  expect(low.text).toEqual([])
  let s = E.create({ rig: { kind: 'microscope' } })
  for (const a of [{ type: 'mic-load', specimen: 'blood' }, { type: 'mic-objective', objective: 40 }] as RigAction[]) s = E.apply(s, a).state
  const r = E.apply(s, { type: 'mic-focus', focus: 47.5 })
  const seen = r.events.find((e) => e.kind === 'observation')
  expect(seen?.kind === 'observation' && seen.why?.simple).toMatch(/carry oxygen/)
})

test('staining pond life kills it', () => {
  expect(run([{ type: 'mic-load', specimen: 'pond' }, { type: 'mic-stain', stain: 'methylene-blue' }]).text.join(' ')).toMatch(/stop moving/)
})
