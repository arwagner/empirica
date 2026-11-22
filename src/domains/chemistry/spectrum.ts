import { hasWater, pH, waterLitres, type Contents } from './equilibrium'
import { SPECIES } from './species'

/**
 * UV-visible absorption spectra. Each colored species (or each pH form of an
 * indicator) has one or more absorption bands; absorbance follows Beer–Lambert,
 * A = ε·c·l, summed over everything dissolved. The color you see is the light
 * that gets through.
 */

export const LAMBDA_MIN = 350
export const LAMBDA_MAX = 900
const STEP = 2
export const WAVELENGTHS = Array.from({ length: (LAMBDA_MAX - LAMBDA_MIN) / STEP + 1 }, (_, i) => LAMBDA_MIN + i * STEP)
/** Cuvette path length, cm. */
export const PATH_CM = 1
/** Above this the detector sees almost no light, so readings stop being trustworthy. */
export const MAX_RELIABLE_A = 3

/** One absorption band: Gaussian in wavelength. eps = molar absorptivity at the peak, L mol⁻¹ cm⁻¹. */
interface Band { peak: number; width: number; eps: number }
/** A light-absorbing form of a species, and the color it gives on its own. */
interface Form { name: string; looks: string; bands: Band[] }
/** An acid–base indicator: forms from most to least protonated; pKas[i] sits between forms i and i+1. */
interface Indicator { forms: Form[]; pKas: number[] }

const b = (peak: number, width: number, eps: number): Band => ({ peak, width, eps })
const form = (name: string, looks: string, ...bands: Band[]): Form => ({ name, looks, bands })
const clear = (name: string) => form(name, 'colorless')

/** Dissolved colored ions. Values are close to literature λmax and ε. */
const IONS: Record<string, Form> = {
  // d–d transition, peak in the near-infrared; its tail eats red light, leaving blue.
  'Cu2+': form('hydrated copper(II) ion', 'blue', b(810, 110, 12)),
  'Fe2+': form('hydrated iron(II) ion', 'pale green', b(960, 120, 1.6), b(340, 40, 5)),
  // Charge transfer in the UV; the tail reaches into the violet and blue.
  'Fe3+': form('iron(III) ion (chloride complexes)', 'yellow-orange', b(340, 40, 2500)),
  'Ni2+': form('hydrated nickel(II) ion', 'green', b(395, 30, 5.2), b(655, 40, 1.8), b(720, 60, 2.1)),
  'Co2+': form('hydrated cobalt(II) ion', 'pink', b(510, 35, 4.8)),
  // Charge transfer with vibrational fine structure: the comb of peaks around 525 nm.
  'MnO4-': form('permanganate ion', 'deep purple', b(490, 11, 700), b(507, 11, 1500), b(526, 11, 2000), b(546, 11, 1950), b(566, 11, 1100)),
  'CrO42-': form('chromate ion', 'yellow', b(372, 30, 4800)),
}

const phenolphthalein: Indicator = { forms: [clear('phenolphthalein (lactone)'), form('phenolphthalein dianion', 'pink', b(553, 25, 30000), b(515, 30, 9000))], pKas: [9.4] }
const methylRed: Indicator = { forms: [form('methyl red (acid form)', 'red', b(520, 40, 40000)), form('methyl red (base form)', 'yellow', b(430, 40, 20000))], pKas: [5.0] }
const bromothymolBlue: Indicator = { forms: [form('bromothymol blue (acid form)', 'yellow', b(430, 38, 18000)), form('bromothymol blue (base form)', 'blue', b(617, 42, 38000))], pKas: [7.1] }
const thymolBlue: Indicator = {
  forms: [form('thymol blue (red form)', 'red', b(544, 38, 30000)), form('thymol blue (yellow form)', 'yellow', b(430, 38, 14000)), form('thymol blue (blue form)', 'blue', b(596, 42, 37000))],
  pKas: [1.65, 8.9],
}

/** Indicators as dosed from the shelf; each is a mix of one or more dyes (weights sum to 1). */
const INDICATOR_DYES: Record<string, { dye: Indicator; weight: number }[]> = {
  phenolphthalein: [{ dye: phenolphthalein, weight: 1 }],
  'methyl-orange': [{ dye: { forms: [form('methyl orange (acid form)', 'red', b(505, 42, 40000)), form('methyl orange (base form)', 'yellow', b(464, 45, 27000))], pKas: [3.47] }, weight: 1 }],
  'bromothymol-blue': [{ dye: bromothymolBlue, weight: 1 }],
  litmus: [{ dye: { forms: [form('litmus (acid form)', 'red', b(505, 50, 15000)), form('litmus (base form)', 'blue', b(590, 50, 15000))], pKas: [6.5] }, weight: 1 }],
  'universal-indicator': [
    { dye: thymolBlue, weight: 0.1 },
    { dye: methylRed, weight: 0.2 },
    { dye: bromothymolBlue, weight: 0.2 },
    { dye: phenolphthalein, weight: 0.5 },
  ],
  // Anthocyanin (cyanidin glycosides). ε is per mole of indicator as dosed: kitchen juice is
  // only part pigment, so it's about a quarter of pure cyanidin-3-glucoside's ~27 000.
  'red-cabbage': [{
    dye: {
      forms: [
        form('flavylium cation', 'red', b(525, 40, 6700)),
        clear('carbinol (hemiketal)'),
        form('quinoidal base', 'purple', b(565, 45, 5500)),
        form('anionic quinoidal base', 'blue', b(600, 45, 6700)),
        form('chalcone (ring opened)', 'yellow', b(420, 45, 6000)),
      ],
      pKas: [3.2, 6.2, 8.0, 11.5],
    },
    weight: 1,
  }],
}

export const SPECTRUM_SPECIES = new Set([...Object.keys(IONS), ...Object.keys(INDICATOR_DYES)])

/** Fraction of an indicator in each form at this pH (polyprotic speciation). */
export function formFractions(ind: Indicator, ph: number): number[] {
  // log of the relative amount of form k: k·pH − Σ pKa(i ≤ k)
  const logs = ind.forms.map((_, k) => k * ph - ind.pKas.slice(0, k).reduce((a, x) => a + x, 0))
  const top = Math.max(...logs)
  const w = logs.map((l) => 10 ** (l - top))
  const sum = w.reduce((a, x) => a + x, 0)
  return w.map((x) => x / sum)
}

const bandAbs = (bands: Band[], conc: number) =>
  WAVELENGTHS.map((l) => bands.reduce((a, { peak, width, eps }) => a + eps * Math.exp(-0.5 * ((l - peak) / width) ** 2), 0) * conc * PATH_CM)

export interface SpectrumComponent {
  /** Species id the absorbing form belongs to. */
  species: string
  name: string
  looks: string
  /** mol/L of this form. */
  conc: number
  /** Share of the parent dye in this form (1 for plain ions). */
  share: number
  /** The dye that share is of: the species itself, or one dye in a mixed indicator. */
  dye: string
  absorbance: number[]
}

export interface Spectrum {
  wavelengths: number[]
  absorbance: number[]
  components: SpectrumComponent[]
  pH: number
}

/** Spectrum for given concentrations (mol/L) at a pH. Forms present at < 0.5% are dropped. */
export function spectrumOf(concs: Record<string, number>, ph: number): Spectrum {
  const components: SpectrumComponent[] = []
  for (const [id, conc] of Object.entries(concs)) {
    if (!(conc > 0)) continue
    const ion = IONS[id]
    if (ion) components.push({ species: id, name: ion.name, looks: ion.looks, conc, share: 1, dye: ion.name, absorbance: bandAbs(ion.bands, conc) })
    const dyes = INDICATOR_DYES[id] ?? []
    for (const { dye, weight } of dyes) {
      const dyeName = dyes.length > 1 ? dye.forms[0].name.replace(/ \(.*\)$/, '') : SPECIES[id].name
      formFractions(dye, ph).forEach((share, k) => {
        const f = dye.forms[k]
        if (share < 0.005 || !f.bands.length) return
        const c = conc * weight * share
        components.push({ species: id, name: f.name, looks: f.looks, conc: c, share, dye: dyeName, absorbance: bandAbs(f.bands, c) })
      })
    }
  }
  const absorbance = WAVELENGTHS.map((_, i) => components.reduce((a, c) => a + c.absorbance[i], 0))
  return { wavelengths: WAVELENGTHS, absorbance, components, pH: ph }
}

/** The spectrum of a vessel's liquid (dissolved species only), or null with no water. */
export function spectrum(c: Contents): Spectrum | null {
  if (!hasWater(c)) return null
  const V = waterLitres(c)
  const concs: Record<string, number> = {}
  for (const [id, n] of Object.entries(c)) if (SPECTRUM_SPECIES.has(id) && SPECIES[id]?.phase === 'aq') concs[id] = n / V
  return spectrumOf(concs, pH(c)!)
}

/** The strongest absorbance and where it is, or null if nothing absorbs noticeably. */
export function peak(s: Pick<Spectrum, 'wavelengths' | 'absorbance'>): { nm: number; A: number } | null {
  let i = 0
  s.absorbance.forEach((a, j) => a > s.absorbance[i] && (i = j))
  return s.absorbance[i] < 0.01 ? null : { nm: s.wavelengths[i], A: s.absorbance[i] }
}

/** Everyday name for a wavelength of light. */
export function lightName(nm: number): string {
  if (nm < 380) return 'ultraviolet'
  if (nm < 450) return 'violet'
  if (nm < 490) return 'blue'
  if (nm < 520) return 'cyan'
  if (nm < 565) return 'green'
  if (nm < 590) return 'yellow'
  if (nm < 625) return 'orange'
  if (nm < 750) return 'red'
  return 'near-infrared'
}

// CIE 1931 colour-matching functions, multi-lobe Gaussian fit (Wyman, Sloan & Shirley 2013).
const g = (x: number, mu: number, s1: number, s2: number) => Math.exp(-0.5 * ((x - mu) / (x < mu ? s1 : s2)) ** 2)
const cmf = (l: number) => [
  1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
  0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
  1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
]
const CMF = WAVELENGTHS.map(cmf)
const XYZ_TO_RGB = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]]
const toRgb = (xyz: number[]) => XYZ_TO_RGB.map((row) => row.reduce((a, k, i) => a + k * xyz[i], 0))
const integrate = (T: (i: number) => number) => [0, 1, 2].map((ch) => CMF.reduce((a, m, i) => a + m[ch] * T(i), 0))
const WHITE_RGB = toRgb(integrate(() => 1))
const gamma = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

/** The color of white light after passing through the sample, as sRGB hex. */
export function transmittedColor(absorbance: number[]): string {
  const rgb = toRgb(integrate((i) => 10 ** -absorbance[i])).map((v, i) => gamma(Math.min(1, Math.max(0, v / WHITE_RGB[i]))))
  return '#' + rgb.map((v) => Math.round(v * 255).toString(16).padStart(2, '0')).join('')
}
