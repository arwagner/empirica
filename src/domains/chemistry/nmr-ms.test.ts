import { chemistry } from '.'
import { isotopePattern, massSpec, massSpecOf } from './massSpec'
import { nmr, nmrOf } from './nmr'

const E = chemistry.engine
const tube = (contents: { reagent: string; amount: number }[]) => E.create({ vessels: [{ id: 'T', kind: 'test-tube', contents }] }).vessels.T.contents

describe('NMR', () => {
  const cabbage = (ph: number) => nmrOf({ 'red-cabbage': 1e-3 }, ph).groups.filter((g) => g.species === 'red-cabbage' && g.share !== undefined)

  test('red cabbage at pH 7: integrals give the share of each form', () => {
    const g = cabbage(7)
    const colored = g.find((x) => x.label.startsWith('H-4 of the colored'))!
    const carbinol = g.find((x) => x.label.startsWith('H-4 of the carbinol'))!
    expect(colored.share).toBeCloseTo(0.87, 2)
    expect(carbinol.share).toBeCloseTo(0.13, 2)
  })

  test('the averaged colored-form line slides upfield as pH rises', () => {
    const at = (ph: number) => cabbage(ph).find((x) => x.label.startsWith('H-4 of the colored'))!.ppm
    expect(at(1)).toBeCloseTo(8.95, 1)
    expect(at(9)).toBeLessThan(at(7))
    expect(at(7)).toBeLessThan(at(1))
  })

  test('acetic acid: one CH₃ line whose position tracks the acid/acetate ratio', () => {
    const at = (ph: number) => nmrOf({ ac: 0.1 }, ph).groups[0].ppm
    expect(at(2)).toBeCloseTo(2.08, 2)
    expect(at(8)).toBeCloseTo(1.91, 2)
    expect(at(4.74)).toBeCloseTo(2.0, 1)
  })

  test('ions without hydrogen are invisible; paramagnetic copper broadens lines', () => {
    const s = nmrOf({ 'Na+': 0.1, 'Cl-': 0.1, ac: 0.1 }, 7)
    expect(s.invisible.map((x) => x.species)).toEqual(['Na+', 'Cl-'])
    const sharp = Math.max(...s.intensity)
    const broad = nmrOf({ ac: 0.1, 'Cu2+': 0.01 }, 7)
    expect(broad.broadening).toBeGreaterThan(10)
    expect(Math.max(...broad.intensity)).toBeLessThan(sharp / 10)
  })

  test('from a vessel', () => {
    const s = nmr(tube([{ reagent: 'acetic-0.1m', amount: 5 }]))!
    expect(s.groups[0].label).toMatch(/acetic acid/)
  })
})

describe('mass spec', () => {
  test('chlorine isotopes: Cl⁻ shows as 35 and 37 in a 3:1 ratio', () => {
    const s = massSpec(tube([{ reagent: 'hcl-0.1m', amount: 5 }]), 'negative')!
    const [a, b] = s.peaks
    expect(a.mz).toBeCloseTo(34.97, 1)
    expect(b.mz).toBeCloseTo(36.97, 1)
    expect(a.intensity / b.intensity).toBeCloseTo(3.1, 1)
    expect(massSpec(tube([{ reagent: 'hcl-0.1m', amount: 5 }]), 'positive')!.peaks).toHaveLength(0)
  })

  test('a 2+ ion appears at half its mass', () => {
    const s = massSpecOf({ 'Cu2+': 0.1 }, 5, 'positive')
    expect(s.peaks[0].mz).toBeCloseTo(31.46, 1)
  })

  test('bromothymol blue: two bromines make a 1:2:1 triplet', () => {
    const p = isotopePattern('C27H28Br2O5S')
    const at = (nominal: number) => p.find(([m]) => Math.round(m) === nominal)![1]
    expect(at(624) / at(622)).toBeGreaterThan(1.7)
    expect(at(626) / at(622)).toBeGreaterThan(0.8)
    expect(at(626) / at(622)).toBeLessThan(1.2)
  })

  test('red cabbage: many pigments sharing one 287 core, whatever the pH', () => {
    for (const ph of [1, 7, 13]) {
      const s = massSpecOf({ 'red-cabbage': 1e-4 }, ph, 'positive')
      const mzs = s.ions.map((i) => Math.round(i.mz))
      expect(mzs).toEqual(expect.arrayContaining([287, 773, 919, 949, 979, 1185]))
    }
  })

  test('things that never become ions are listed as unseen', () => {
    expect(massSpecOf({ H2O2: 0.1 }, 7, 'positive').unseen).toEqual(['H2O2'])
  })
})
