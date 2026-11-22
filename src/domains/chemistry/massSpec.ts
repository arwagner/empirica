import { carbonateFractions, hasWater, KA_ACETIC, KA_NH4, pH, waterLitres, type Contents } from './equilibrium'
import { SPECIES } from './species'

/**
 * Electrospray mass spectrometry (direct infusion). Ions already in solution are
 * sprayed into a vacuum and sorted by mass-to-charge ratio (m/z). Each element's
 * isotopes split a peak into a pattern. Intensities are relative (base peak = 100%)
 * and only roughly track concentration: different ions spray with different efficiency.
 */

/** Isotopes: [exact mass, natural abundance]. */
const ISOTOPES: Record<string, [number, number][]> = {
  H: [[1.007825, 0.99988], [2.014102, 0.00012]],
  Li: [[6.015123, 0.0759], [7.016003, 0.9241]],
  C: [[12, 0.9893], [13.003355, 0.0107]],
  N: [[14.003074, 0.99636], [15.000109, 0.00364]],
  O: [[15.994915, 0.99757], [16.999132, 0.00038], [17.99916, 0.00205]],
  Na: [[22.98977, 1]],
  Mg: [[23.985042, 0.7899], [24.985837, 0.1], [25.982593, 0.1101]],
  S: [[31.972071, 0.9499], [32.971459, 0.0075], [33.967867, 0.0425]],
  Cl: [[34.968853, 0.7576], [36.965903, 0.2424]],
  K: [[38.963707, 0.932581], [40.961826, 0.067302]],
  Ca: [[39.962591, 0.96941], [41.958618, 0.00647], [42.958767, 0.00135], [43.955482, 0.02086]],
  Cr: [[49.946044, 0.04345], [51.940507, 0.83789], [52.940649, 0.09501], [53.938880, 0.02365]],
  Mn: [[54.938045, 1]],
  Fe: [[53.939611, 0.05845], [55.934937, 0.91754], [56.935394, 0.02119], [57.933276, 0.00282]],
  Co: [[58.933195, 1]],
  Ni: [[57.935343, 0.68077], [59.930786, 0.26223], [60.931056, 0.011399], [61.928345, 0.036346], [63.927966, 0.009255]],
  Cu: [[62.929598, 0.6915], [64.92779, 0.3085]],
  Zn: [[63.929142, 0.4917], [65.926033, 0.2773], [66.927127, 0.0404], [67.924844, 0.1845], [69.925319, 0.0061]],
  Br: [[78.918337, 0.5069], [80.916291, 0.4931]],
  Sr: [[83.913425, 0.0056], [85.909260, 0.0986], [86.908877, 0.07], [87.905612, 0.8258]],
  Ag: [[106.905097, 0.51839], [108.904752, 0.48161]],
  I: [[126.904473, 1]],
  Ba: [[133.904508, 0.02417], [134.905689, 0.06592], [135.904576, 0.07854], [136.905827, 0.11232], [137.905247, 0.71698]],
  Pb: [[203.973044, 0.014], [205.974465, 0.241], [206.975897, 0.221], [207.976652, 0.524]],
}
const ELECTRON = 0.000549

export function parseFormula(f: string): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [, el, n] of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (!ISOTOPES[el]) throw new Error(`No isotope data for ${el}`)
    out[el] = (out[el] ?? 0) + (n ? +n : 1)
  }
  return out
}

type Dist = [mass: number, p: number][]
/** Combine peaks closer than this (Da): roughly unit-resolution instrument. */
const MERGE = 0.3
function convolve(a: Dist, b: Dist): Dist {
  const out: Dist = []
  for (const [ma, pa] of a) for (const [mb, pb] of b) out.push([ma + mb, pa * pb])
  out.sort((x, y) => x[0] - y[0])
  const merged: Dist = []
  for (const [m, p] of out) {
    if (p < 1e-6) continue
    const last = merged[merged.length - 1]
    if (last && m - last[0] < MERGE) {
      last[0] = (last[0] * last[1] + m * p) / (last[1] + p)
      last[1] += p
    } else merged.push([m, p])
  }
  return merged
}

const cache = new Map<string, Dist>()
/** Isotope pattern of a neutral formula: masses and probabilities. */
export function isotopePattern(formula: string): Dist {
  let d = cache.get(formula)
  if (d) return d
  d = [[0, 1]]
  for (const [el, n] of Object.entries(parseFormula(formula))) for (let i = 0; i < n; i++) d = convolve(d, ISOTOPES[el])
  cache.set(formula, d)
  return d
}

export type Mode = 'positive' | 'negative'
/** One ion the instrument can see. weight: share of the parent species × how well it sprays. */
interface IonDef { formula: string; z: number; label: string; weight: number; note?: string }

const ion = (formula: string, z: number, label: string, weight = 1, note?: string): IonDef => ({ formula, z, label, weight, note })
const SIMPLE: Record<string, IonDef> = {
  'Li+': ion('Li', 1, 'Li⁺'), 'Na+': ion('Na', 1, 'Na⁺'), 'K+': ion('K', 1, 'K⁺'),
  'Mg2+': ion('Mg', 2, 'Mg²⁺'), 'Ca2+': ion('Ca', 2, 'Ca²⁺'), 'Sr2+': ion('Sr', 2, 'Sr²⁺'), 'Ba2+': ion('Ba', 2, 'Ba²⁺'),
  'Fe2+': ion('Fe', 2, 'Fe²⁺'), 'Fe3+': ion('Fe', 3, 'Fe³⁺'), 'Cu2+': ion('Cu', 2, 'Cu²⁺'), 'Zn2+': ion('Zn', 2, 'Zn²⁺'),
  'Ag+': ion('Ag', 1, 'Ag⁺'), 'Pb2+': ion('Pb', 2, 'Pb²⁺'), 'Ni2+': ion('Ni', 2, 'Ni²⁺'), 'Co2+': ion('Co', 2, 'Co²⁺'), 'Mn2+': ion('Mn', 2, 'Mn²⁺'),
  'Cl-': ion('Cl', -1, 'Cl⁻'), 'Br-': ion('Br', -1, 'Br⁻'), 'I-': ion('I', -1, 'I⁻'), 'NO3-': ion('NO3', -1, 'NO₃⁻'),
  'SO42-': ion('SO4', -2, 'SO₄²⁻'), 'MnO4-': ion('MnO4', -1, 'MnO₄⁻'), 'CrO42-': ion('CrO4', -2, 'CrO₄²⁻'),
}

// Red cabbage: a dozen or so cyanidin glycosides, many acylated. Approximate relative amounts.
// In the spray every form becomes the flavylium cation, so MS can't tell pH forms apart.
const CY = 'cyanidin'
const RED_CABBAGE: IonDef[] = [
  ion('C33H41O21', 1, `${CY}-3-diglucoside-5-glucoside`, 15),
  ion('C42H47O23', 1, `${CY}-3-(p-coumaroyl)diglucoside-5-glucoside`, 10),
  ion('C43H49O24', 1, `${CY}-3-(feruloyl)diglucoside-5-glucoside`, 12),
  ion('C44H51O25', 1, `${CY}-3-(sinapoyl)diglucoside-5-glucoside`, 25),
  ion('C53H57O27', 1, `${CY}-3-(p-coumaroyl)(sinapoyl)triglucoside`, 8),
  ion('C54H59O28', 1, `${CY}-3-(feruloyl)(sinapoyl)triglucoside`, 10),
  ion('C55H61O29', 1, `${CY}-3-(sinapoyl)(sinapoyl)triglucoside`, 20),
  ion('C27H31O16', 1, `${CY}-3-glucoside-5-glucoside`, 4),
  ion('C15H11O6', 1, `${CY} core (fragment: sugars broken off in the spray)`, 14, 'Every pigment above shares this core, so it shows up as a fragment of all of them.'),
].map((d) => ({ ...d, weight: d.weight / 100 }))

const DYES: Record<string, IonDef[]> = {
  phenolphthalein: [ion('C20H13O4', -1, 'phenolphthalein − H⁺')],
  'methyl-orange': [ion('C14H14N3O3S', -1, 'methyl orange anion')],
  'bromothymol-blue': [ion('C27H27Br2O5S', -1, 'bromothymol blue − H⁺', 1, 'Two bromines (⁷⁹Br and ⁸¹Br, about 50:50) give a 1:2:1 triplet two units apart.')],
  'universal-indicator': [
    ion('C27H29O5S', -1, 'thymol blue − H⁺', 0.1), ion('C15H14N3O2', -1, 'methyl red − H⁺', 0.2),
    ion('C27H27Br2O5S', -1, 'bromothymol blue − H⁺', 0.2), ion('C20H13O4', -1, 'phenolphthalein − H⁺', 0.5),
    ion('C15H16N3O2', 1, 'methyl red + H⁺', 0.2),
  ],
}
/** Pre-charged organic ions spray far better than small metal ions. */
const ORGANIC_RESPONSE = 50

function ionsFor(id: string, ph: number): IonDef[] {
  const h = 10 ** -ph
  if (SIMPLE[id]) return [SIMPLE[id]]
  if (id === 'red-cabbage') return RED_CABBAGE.map((d) => ({ ...d, weight: d.weight * ORGANIC_RESPONSE }))
  if (DYES[id]) return DYES[id].map((d) => ({ ...d, weight: d.weight * ORGANIC_RESPONSE }))
  if (id === 'ac') return [ion('C2H3O2', -1, 'acetate CH₃COO⁻', Math.max(0.05, KA_ACETIC / (h + KA_ACETIC)))]
  if (id === 'nh3') return [ion('NH4', 1, 'ammonium NH₄⁺', Math.max(0.05, h / (h + KA_NH4)))]
  if (id === 'co3') return [ion('HCO3', -1, 'hydrogen carbonate HCO₃⁻', Math.max(0.05, carbonateFractions(h).hco3))]
  return []
}

export interface MsPeak { mz: number; intensity: number; label: string; species: string }
export interface MsIon { species: string; label: string; formula: string; z: number; mz: number; intensity: number; note?: string }
export interface MassSpectrum { mode: Mode; peaks: MsPeak[]; ions: MsIon[]; unseen: string[]; pH: number }

const MIN_REL = 0.005
const MZ_MIN = 5

/** Mass spectrum for given concentrations (mol/L), in one polarity. */
export function massSpecOf(concs: Record<string, number>, ph: number, mode: Mode): MassSpectrum {
  const peaks: MsPeak[] = []
  const ions: MsIon[] = []
  const unseen: string[] = []
  for (const [id, conc] of Object.entries(concs)) {
    if (!(conc > 0) || id === 'H2O') continue
    const defs = ionsFor(id, ph)
    if (!defs.length) {
      if (SPECIES[id]) unseen.push(id)
      continue
    }
    for (const d of defs) {
      if ((d.z > 0) !== (mode === 'positive')) continue
      const pattern = isotopePattern(d.formula)
      const amount = conc * d.weight
      let best = { mz: 0, p: 0 }
      for (const [m, p] of pattern) {
        const mz = (m - d.z * ELECTRON) / Math.abs(d.z)
        if (mz < MZ_MIN) continue
        peaks.push({ mz, intensity: amount * p, label: d.label, species: id })
        if (p > best.p) best = { mz, p }
      }
      ions.push({ species: id, label: d.label, formula: d.formula, z: d.z, mz: best.mz, intensity: amount * best.p, note: d.note })
    }
  }
  const top = Math.max(0, ...peaks.map((p) => p.intensity))
  const rel = (x: number) => (top ? x / top : 0)
  return {
    mode,
    peaks: peaks.map((p) => ({ ...p, intensity: rel(p.intensity) })).filter((p) => p.intensity >= MIN_REL).sort((a, b) => a.mz - b.mz),
    ions: ions.map((i) => ({ ...i, intensity: rel(i.intensity) })).filter((i) => i.intensity >= MIN_REL).sort((a, b) => b.intensity - a.intensity),
    unseen,
    pH: ph,
  }
}

export function massSpec(c: Contents, mode: Mode): MassSpectrum | null {
  if (!hasWater(c)) return null
  const V = waterLitres(c)
  const concs: Record<string, number> = {}
  for (const [id, n] of Object.entries(c)) if (SPECIES[id]?.phase === 'aq') concs[id] = n / V
  return massSpecOf(concs, pH(c)!, mode)
}
