import { pH, waterLitres, hasWater, type Contents } from './equilibrium'
import { INDICATORS, SPECIES } from './species'

type Band = [maxPH: number, name: string, hex: string]
const COLORLESS = 'colorless'

/** Indicator color bands: the first band whose maxPH is above the pH wins. */
const BANDS: Record<string, Band[]> = {
  phenolphthalein: [[8.2, COLORLESS, '#ffffff'], [9.5, 'pale pink', '#f7a8cf'], [99, 'pink', '#ff3d9a']],
  'methyl-orange': [[3.1, 'red', '#e0302a'], [4.4, 'orange', '#f07d1e'], [99, 'yellow', '#f2c81e']],
  'bromothymol-blue': [[6.0, 'yellow', '#e8d21d'], [7.6, 'green', '#3a9e4a'], [99, 'blue', '#2457c5']],
  'universal-indicator': [
    [2.5, 'red', '#e0262b'], [3.5, 'orange-red', '#ed5527'], [4.5, 'orange', '#f39a1e'], [5.5, 'yellow', '#f0d91c'],
    [6.5, 'yellow-green', '#a8cf38'], [7.5, 'green', '#3faa4f'], [8.5, 'teal', '#21948a'], [9.5, 'blue', '#2563c9'],
    [10.5, 'indigo', '#3f3fb0'], [99, 'violet', '#6a2c91'],
  ],
  'red-cabbage': [
    [2.5, 'red', '#d81f3c'], [4.5, 'pink', '#d64f8c'], [7.5, 'purple', '#7d3c98'], [8.5, 'blue', '#3a5fcd'],
    [10.5, 'blue-green', '#1f9c8f'], [12.5, 'green', '#4caf50'], [99, 'yellow', '#e3cf2a'],
  ],
  litmus: [[4.5, 'red', '#d6303a'], [8.3, 'purple', '#8a4a9e'], [99, 'blue', '#2a5bc4']],
}

export function indicatorColor(id: string, ph: number) {
  const band = BANDS[id].find(([max]) => ph < max)!
  return { name: band[1], hex: band[2] }
}

const INDICATOR_STRENGTH = 1.2e5

export interface SolutionColor {
  name: string
  hex: string
  /** The species contributing most of the color (an ion or an indicator), if any. */
  dominant?: string
  pH?: number
  /** 0 = clear, 1 = opaque color */
  alpha: number
}

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const rgbToHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

/** The color of the liquid, from colored ions and indicators (Beer–Lambert-ish blend). */
export function solutionColor(c: Contents): SolutionColor {
  if (!hasWater(c)) return { name: COLORLESS, hex: '#ffffff', alpha: 0 }
  const V = waterLitres(c)
  const ph = pH(c)!
  const parts: { id: string; name: string; hex: string; w: number }[] = []
  for (const [id, n] of Object.entries(c)) {
    const s = SPECIES[id]
    if (!s || s.phase !== 'aq') continue
    if (INDICATORS.includes(id)) {
      const col = indicatorColor(id, ph)
      if (col.name !== COLORLESS) parts.push({ id, ...col, w: (n / V) * INDICATOR_STRENGTH })
    } else if (s.color) parts.push({ id, name: s.color.name, hex: s.color.hex, w: (n / V) * s.color.strength })
  }
  const total = parts.reduce((a, p) => a + p.w, 0)
  const alpha = 1 - Math.exp(-total)
  if (alpha < 0.12) return { name: COLORLESS, hex: '#ffffff', alpha, pH: ph }
  const rgb = [0, 0, 0]
  for (const p of parts) hexToRgb(p.hex).forEach((v, i) => (rgb[i] += (v * p.w) / total))
  const dominant = parts.reduce((a, b) => (b.w > a.w ? b : a))
  const name = alpha < 0.35 ? `pale ${dominant.name.replace(/^pale /, '')}` : dominant.name
  return { name, hex: rgbToHex(rgb), alpha, dominant: dominant.id, pH: ph }
}

/** Flame-test color from whatever cations the sample holds (dissolved, in solids, or metal). */
export function flameColor(c: Contents): { ion: string; name: string; hex: string } | null {
  const amounts = new Map<string, number>()
  const bump = (ion: string, n: number) => SPECIES[ion]?.flame && amounts.set(ion, (amounts.get(ion) ?? 0) + n)
  for (const [id, n] of Object.entries(c)) {
    const s = SPECIES[id]
    if (!s) continue
    bump(id, n)
    for (const [ion, k] of Object.entries(s.ions ?? {})) bump(ion, n * k)
    if (s.metal) bump(s.metal.ion, n)
  }
  if (!amounts.size) return null
  const total = [...amounts.values()].reduce((a, b) => a + b, 0)
  // Sodium's yellow is so intense it masks other colors even as a minor component.
  const pick = (amounts.get('Na+') ?? 0) / total > 0.05 ? 'Na+' : [...amounts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
  return { ion: pick, ...SPECIES[pick].flame! }
}

/** Is this much solid noticeable? Tiny traces (e.g. hydrolysis in salt solutions) aren't. */
export function visibleSolid(n: number, c: Contents): boolean {
  return n > Math.max(5e-6, 3e-4 * waterLitres(c))
}
