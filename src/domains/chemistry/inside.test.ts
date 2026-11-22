import { particles } from './inside'
import type { Contents } from './equilibrium'

const L = 1000 / 18.015
const sol = (ions: Contents): Contents => ({ H2O: L, ...ions })
const find = (c: Contents, id: string) => particles(c).find((p) => p.id === id)

test('hydrochloric acid: lots of H⁺, matching Cl⁻, almost no OH⁻', () => {
  const c = sol({ 'Cl-': 0.1 })
  expect(find(c, 'H+')!.conc).toBeCloseTo(0.1, 3)
  expect(find(c, 'Cl-')!.conc).toBeCloseTo(0.1, 3)
  expect(find(c, 'OH-')!.conc!).toBeLessThan(1e-12)
  expect(particles(c)[0].id).toMatch(/H\+|Cl-/) // most abundant first
})

test('acetic acid is mostly whole molecules; ammonia mostly unprotonated', () => {
  const a = sol({ ac: 0.1 })
  expect(find(a, 'CH3COOH')!.conc! / 0.1).toBeGreaterThan(0.98)
  expect(find(a, 'CH3COO-')!.conc! / 0.1).toBeCloseTo(0.013, 2)
  const n = sol({ nh3: 0.1 })
  expect(find(n, 'NH3')!.conc! / 0.1).toBeGreaterThan(0.98)
})

test('solids are listed separately, after the dissolved particles', () => {
  const ps = particles(sol({ AgCl: 0.001, 'Na+': 0.001, 'NO3-': 0.001 }))
  expect(ps.at(-1)).toMatchObject({ id: 'AgCl', solid: true, conc: null })
  expect(find(sol({ 'Cl-': 0.01 }), 'Cl-')!.note).toMatch(/chloride/)
})
