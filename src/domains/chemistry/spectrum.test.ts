import { chemistry } from '.'
import { indicatorColor } from './appearance'
import { INDICATOR_MOL_PER_DROP } from './reagents'
import { SPECIES } from './species'
import { formFractions, lightName, peak, spectrum, spectrumOf, transmittedColor } from './spectrum'

const E = chemistry.engine

/** Hue (degrees) and saturation of a hex color. */
function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return { h: (h * 60 + 360) % 360, s }
}
const hueGap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

test('white light through nothing stays white', () => {
  expect(transmittedColor(new Array(276).fill(0))).toBe('#ffffff')
})

test('speciation fractions sum to 1 and follow pKa', () => {
  const ind = { forms: [{ name: 'a', looks: '', bands: [] }, { name: 'b', looks: '', bands: [] }], pKas: [7] }
  expect(formFractions(ind, 7)).toEqual([0.5, 0.5])
  expect(formFractions(ind, 9)[1]).toBeCloseTo(0.99, 2)
})

test('red cabbage absorption peak moves to longer wavelengths as pH rises, then jumps to the violet', () => {
  const c = { 'red-cabbage': 1.4e-4 }
  const at = (ph: number) => peak(spectrumOf(c, ph))!.nm
  expect(at(1)).toBeGreaterThan(515)
  expect(at(1)).toBeLessThan(535)
  expect(at(7)).toBeGreaterThan(at(1))
  expect(at(9)).toBeGreaterThan(at(7))
  expect(at(13)).toBeLessThan(440)
  expect(lightName(at(1))).toBe('green')
})

test('red cabbage in acid: the flavylium cation does nearly all the absorbing', () => {
  const s = spectrumOf({ 'red-cabbage': 1.4e-4 }, 1)
  expect(s.components).toHaveLength(1)
  expect(s.components[0].name).toBe('flavylium cation')
  expect(s.components[0].share).toBeGreaterThan(0.99)
})

// The bench draws liquids from per-band hex colors; the spectrometer must agree with them.
const CASES: [string, number][] = [
  ['red-cabbage', 1], ['red-cabbage', 3.5], ['red-cabbage', 7], ['red-cabbage', 8], ['red-cabbage', 11.5], ['red-cabbage', 13.5],
  ['phenolphthalein', 11], ['methyl-orange', 2], ['methyl-orange', 6], ['bromothymol-blue', 5], ['bromothymol-blue', 9],
  ['litmus', 3], ['litmus', 10], ['universal-indicator', 1], ['universal-indicator', 4], ['universal-indicator', 7], ['universal-indicator', 9],
  ['universal-indicator', 12],
]
test.each(CASES)('%s at pH %d: color predicted from the spectrum matches the bench color', (id, ph) => {
  const conc = (5 * INDICATOR_MOL_PER_DROP) / 0.005
  const predicted = hsl(transmittedColor(spectrumOf({ [id]: conc }, ph).absorbance))
  const shown = hsl(indicatorColor(id, ph).hex)
  expect(predicted.s).toBeGreaterThan(0.15)
  expect(hueGap(predicted.h, shown.h)).toBeLessThan(40)
})

const ION_CONC: Record<string, number> = { 'Cu2+': 0.5, 'Fe2+': 1, 'Fe3+': 0.002, 'Ni2+': 0.5, 'Co2+': 0.3, 'MnO4-': 5e-4, 'CrO42-': 5e-3 }
test.each(Object.entries(ION_CONC))('%s: color predicted from the spectrum matches the bench color', (id, conc) => {
  const predicted = hsl(transmittedColor(spectrumOf({ [id]: conc }, 7).absorbance))
  const shown = hsl(SPECIES[id].color!.hex)
  expect(hueGap(predicted.h, shown.h)).toBeLessThan(40)
})

test('copper sulfate solution peaks in the near-infrared', () => {
  const s = E.create({ vessels: [{ id: 'A', kind: 'beaker-250', contents: [{ reagent: 'cuso4-0.5m', amount: 50 }] }] })
  const sp = spectrum(s.vessels.A.contents)!
  expect(peak(sp)!.nm).toBeGreaterThan(780)
  expect(E.measure(s, 'spectrometer', 'A')).toMatchObject({ quantity: 'peak absorbance', unit: 'nm' })
})

test('plain water: nothing to measure', () => {
  const s = E.create({ vessels: [{ id: 'A', kind: 'beaker-250', contents: [{ reagent: 'water', amount: 50 }] }] })
  expect(E.measure(s, 'spectrometer', 'A')).toBeNull()
})
