import { hasWater, KA_ACETIC, pH, waterLitres, type Contents } from './equilibrium'
import { SPECIES } from './species'
import { dyeForms } from './spectrum'

/**
 * Proton (¹H) NMR, 400 MHz, sample dissolved in D₂O with the water signal suppressed.
 * Every hydrogen in a non-exchanging position gives a line; its area is proportional
 * to how many of those hydrogens there are, so integrals measure amounts directly.
 * Molecules that interconvert faster than NMR can follow show one averaged line.
 * Shifts are approximate literature values.
 */

export const PPM_MIN = 0
export const PPM_MAX = 10
const STEP = 0.005
export const PPM = Array.from({ length: Math.round((PPM_MAX - PPM_MIN) / STEP) + 1 }, (_, i) => +(PPM_MIN + i * STEP).toFixed(3))
const BASE_WIDTH = 0.012
const HDO = 4.79
const NOISE = 4e-7

interface Line { ppm: number; nH: number; width?: number }
/** A labelled set of lines (what the legend explains). share: fraction of the parent, if meaningful. */
export interface NmrGroup { species: string; label: string; ppm: number; nH: number; conc: number; share?: number; note?: string }

const L = (ppm: number, nH: number, width?: number): Line => ({ ppm, nH, width })

// --- anthocyanin (red cabbage). Ring protons of each form; H-4 is the diagnostic one. ---
type Ring = { H4: number; H2p: number; H6p: number; H5p: number; H8: number; H6: number }
const FLAVYLIUM: Ring = { H4: 8.95, H2p: 8.25, H6p: 8.05, H5p: 7.05, H8: 7.0, H6: 6.8 }
const QUINOIDAL: Ring = { H4: 8.3, H2p: 7.95, H6p: 7.8, H5p: 6.85, H8: 6.6, H6: 6.45 }
const QUINOIDAL_ANION: Ring = { H4: 8.1, H2p: 7.75, H6p: 7.6, H5p: 6.7, H8: 6.35, H6: 6.25 }
const CARBINOL: Ring = { H4: 6.1, H2p: 7.45, H6p: 7.3, H5p: 6.9, H8: 6.25, H6: 6.15 }
const CHALCONE: Ring = { H4: 6.7, H2p: 7.4, H6p: 7.2, H5p: 6.85, H8: 6.3, H6: 6.2 }
const ringLines = (r: Ring, f: number) => (Object.keys(r) as (keyof Ring)[]).map((k) => L(r[k], f))
/** Sugars and acyl groups: the same in every form. Per pigment molecule. */
const SUGARS_ACYL = [
  L(7.55, 0.7), L(6.95, 1.4), L(6.4, 0.7), L(5.35, 1), L(5.15, 1), L(4.05, 2), L(3.9, 3), L(3.88, 3.5), L(3.75, 3), L(3.6, 4), L(3.45, 4), L(3.35, 2),
]

function redCabbage(conc: number, ph: number) {
  const f = Object.fromEntries(dyeForms('red-cabbage', ph).map((x) => [x.name, x.share]))
  const colored = f['flavylium cation'] + f['quinoidal base'] + f['anionic quinoidal base']
  // Proton transfer between the colored forms takes microseconds: NMR sees one weighted-average line.
  const avg = (k: keyof Ring) =>
    (FLAVYLIUM[k] * f['flavylium cation'] + QUINOIDAL[k] * f['quinoidal base'] + QUINOIDAL_ANION[k] * f['anionic quinoidal base']) / colored
  const coloredRing = Object.fromEntries((Object.keys(FLAVYLIUM) as (keyof Ring)[]).map((k) => [k, avg(k)])) as Ring
  const carbinol = f['carbinol (hemiketal)'], chalcone = f['chalcone (ring opened)']
  const lines = [...ringLines(coloredRing, colored), ...ringLines(CARBINOL, carbinol), ...ringLines(CHALCONE, chalcone), ...SUGARS_ACYL]
  const id = 'red-cabbage'
  const groups: NmrGroup[] = [
    { species: id, label: 'H-4 of the colored forms (flavylium ⇄ quinoidal, averaged)', ppm: coloredRing.H4, nH: 1, conc: conc * colored, share: colored,
      note: 'These forms swap a proton in microseconds, so NMR sees one line at their weighted-average position. It slides from 8.95 ppm (all flavylium) toward 8.1 ppm as pH rises.' },
    { species: id, label: 'H-4 of the carbinol (colorless)', ppm: CARBINOL.H4, nH: 1, conc: conc * carbinol, share: carbinol,
      note: 'Adding water to the ring takes seconds to minutes, slow enough for NMR to see this form separately.' },
    { species: id, label: 'H-4 of the chalcone (ring opened)', ppm: CHALCONE.H4, nH: 1, conc: conc * chalcone, share: chalcone },
    { species: id, label: 'sugars and acyl side groups (all forms)', ppm: 3.7, nH: 30, conc,
      note: 'Red cabbage pigments carry three glucose units and often sinapic or ferulic acid groups (the 3.88 ppm OCH₃ line).' },
  ]
  return { lines, groups: groups.filter((g) => g.share === undefined || g.share >= 0.005) }
}

/** Fixed line lists for the other dyes (pH changes their shifts a little; ignored here). */
const DYE_LINES: Record<string, { label: string; lines: Line[] }> = {
  phenolphthalein: { label: 'phenolphthalein: aromatic ring hydrogens', lines: [L(7.85, 1), L(7.7, 1), L(7.55, 2), L(7.2, 4), L(6.85, 4)] },
  'methyl-orange': { label: 'methyl orange: aromatic hydrogens + N(CH₃)₂ at 3.1 ppm', lines: [L(7.9, 2), L(7.85, 2), L(7.8, 2), L(6.85, 2), L(3.1, 6)] },
  'bromothymol-blue': { label: 'bromothymol blue: aromatic hydrogens + isopropyl and methyl groups', lines: [L(7.9, 1), L(7.6, 1), L(7.5, 1), L(7.2, 1), L(7.0, 2), L(3.25, 2), L(2.15, 6), L(1.15, 12)] },
  'thymol-blue': { label: 'thymol blue: aromatic hydrogens + isopropyl and methyl groups', lines: [L(7.9, 1), L(7.6, 1), L(7.5, 1), L(7.2, 1), L(6.9, 2), L(6.75, 2), L(3.2, 2), L(2.1, 6), L(1.15, 12)] },
  'methyl-red': { label: 'methyl red: aromatic hydrogens + N(CH₃)₂ at 3.1 ppm', lines: [L(7.95, 1), L(7.85, 4), L(7.6, 1), L(7.45, 2), L(6.85, 2), L(3.1, 6)] },
  litmus: { label: 'litmus: broad humps, because it is a mixture of many related dyes', lines: [L(6.9, 4, 0.35), L(3.7, 6, 0.4), L(2.2, 3, 0.3)] },
}
const UNIVERSAL: [string, number][] = [['thymol-blue', 0.1], ['methyl-red', 0.2], ['bromothymol-blue', 0.2], ['phenolphthalein', 0.5]]

/** Paramagnetic ions speed up relaxation and broaden every line. Factor per mol/L. */
const PARAMAGNETIC: Record<string, number> = { 'Mn2+': 20000, 'Fe3+': 10000, 'Cu2+': 3000, 'Ni2+': 1000, 'Fe2+': 500, 'Co2+': 300 }

const EXCHANGES = 'its hydrogens swap with the D₂O solvent and become deuterium, which ¹H NMR can\'t see'
const INVISIBLE: Record<string, string> = { nh3: EXCHANGES, H2O2: EXCHANGES, co3: 'no hydrogens except the OH of HCO₃⁻, which swaps with D₂O' }

export interface NmrSpectrum {
  ppm: number[]
  intensity: number[]
  groups: NmrGroup[]
  /** Dissolved species that give no signal, and why. */
  invisible: { species: string; reason: string }[]
  /** Line-broadening factor from paramagnetic ions (1 = none). */
  broadening: number
  paramagnetic: string[]
  pH: number
}

/** ¹H NMR for given concentrations (mol/L) at a pH. */
export function nmrOf(concs: Record<string, number>, ph: number): NmrSpectrum {
  const lines: Line[] = []
  const groups: NmrGroup[] = []
  const invisible: NmrSpectrum['invisible'] = []
  const paramagnetic: string[] = []
  let broadening = 1
  const addDye = (key: string, conc: number, species: string) => {
    const d = DYE_LINES[key]
    lines.push(...d.lines.map((l) => ({ ...l, nH: l.nH * conc })))
    const nH = d.lines.reduce((a, l) => a + l.nH, 0)
    groups.push({ species, label: d.label, ppm: d.lines[0].ppm, nH, conc })
  }
  for (const [id, conc] of Object.entries(concs)) {
    if (!(conc > 0) || id === 'H2O') continue
    if (PARAMAGNETIC[id]) {
      broadening += PARAMAGNETIC[id] * conc
      paramagnetic.push(id)
    }
    if (id === 'red-cabbage') {
      const r = redCabbage(conc, ph)
      lines.push(...r.lines.map((l) => ({ ...l, nH: l.nH * conc })))
      groups.push(...r.groups)
    } else if (id === 'ac') {
      const fA = KA_ACETIC / (10 ** -ph + KA_ACETIC)
      const ppm = 2.08 - 0.17 * fA
      lines.push(L(ppm, 3 * conc))
      groups.push({ species: id, label: 'CH₃ of acetic acid ⇄ acetate (averaged)', ppm, nH: 3, conc, share: 1 - fA,
        note: `Acid and acetate swap protons far faster than NMR can follow, so there is one line, between 2.08 ppm (all acid) and 1.91 ppm (all acetate). Here: ${Math.round((1 - fA) * 100)}% acid.` })
    } else if (id === 'universal-indicator') {
      for (const [k, w] of UNIVERSAL) addDye(k, conc * w, id)
    } else if (DYE_LINES[id]) addDye(id, conc, id)
    else if (SPECIES[id]) invisible.push({ species: id, reason: INVISIBLE[id] ?? 'no hydrogen atoms' })
  }
  if (ph < 4 || ph > 10) invisible.push({ species: ph < 4 ? 'H+' : 'OH-', reason: 'swaps with D₂O and merges into the water signal' })

  const intensity = PPM.map((x, i) => {
    let y = noise(i) + hdoLine(x, broadening) / broadening
    for (const l of lines) {
      const w = (l.width ?? BASE_WIDTH) * broadening
      y += (l.nH * (BASE_WIDTH / w)) / (1 + ((x - l.ppm) / w) ** 2)
    }
    return y
  })
  return { ppm: PPM, intensity, groups, invisible, broadening, paramagnetic, pH: ph }
}

/** Residual HDO line (solvent suppression leaves a little). Plots exclude it when scaling. */
const hdoLine = (x: number, broadening = 1) => 3e-4 / (1 + ((x - HDO) / (0.02 * broadening)) ** 2)
export const HDO_PPM = HDO

// Deterministic noise so the baseline doesn't flicker between renders.
const NOISE_TABLE = (() => {
  let s = 12345
  return PPM.map(() => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const u = s / 0x7fffffff
    s = (s * 1103515245 + 12345) & 0x7fffffff
    const v = s / 0x7fffffff
    return Math.sqrt(-2 * Math.log(u + 1e-12)) * Math.cos(2 * Math.PI * v) * NOISE
  })
})()
const noise = (i: number) => NOISE_TABLE[i]

/** NMR of a vessel's dissolved contents, or null without a liquid. */
export function nmr(c: Contents): NmrSpectrum | null {
  if (!hasWater(c)) return null
  const V = waterLitres(c)
  const concs: Record<string, number> = {}
  for (const [id, n] of Object.entries(c)) if (SPECIES[id]?.phase === 'aq') concs[id] = n / V
  return nmrOf(concs, pH(c)!)
}
