import { IMPLICIT_IONS, PRECIPITATES, SPECIES, species, type Species } from './species'

/** Moles of each species in a vessel. */
export type Contents = Record<string, number>

export const KW = 1e-14
const KA_ACETIC = 1.8e-5
const KA_NH4 = 5.6e-10
const K1_CO2 = 4.3e-7
const K2_CO2 = 4.7e-11
/**
 * Dissolved CO2 an open vessel holds before the excess fizzes out (mol/L). Equilibrium with
 * air is far lower (~1e-5 M) but degassing takes time; this is the "visible fizzing" threshold.
 */
export const CO2_SOLUBILITY = 0.002
const EPS = 1e-12

/** Density of water at room temperature, g/mL. */
export const WATER_G_PER_ML = 0.997
export const waterMol = (mL: number) => (mL * WATER_G_PER_ML) / 18.015
export const waterLitres = (c: Contents) => (c.H2O ?? 0) * 18.015 / WATER_G_PER_ML / 1000
export const hasWater = (c: Contents) => waterLitres(c) > 1e-4

/** Fractions of the carbonate total as H2CO3*, HCO3-, CO3^2- at a given [H+]. */
export function carbonateFractions(h: number) {
  const d = h * h + h * K1_CO2 + K1_CO2 * K2_CO2
  return { h2co3: (h * h) / d, hco3: (h * K1_CO2) / d, co3: (K1_CO2 * K2_CO2) / d }
}

/** Net charge (mol/L) at [H+] = h. Zero at the true pH. Increases monotonically with h. */
function chargeBalance(c: Contents, V: number, h: number) {
  let q = h - KW / h
  for (const [id, n] of Object.entries(c)) {
    const z = SPECIES[id]?.charge
    if (z) q += (z * n) / V
  }
  const ac = (c.ac ?? 0) / V
  const nh3 = (c.nh3 ?? 0) / V
  const co3 = (c.co3 ?? 0) / V
  q -= (ac * KA_ACETIC) / (h + KA_ACETIC)
  q += (nh3 * h) / (h + KA_NH4)
  const f = carbonateFractions(h)
  q -= co3 * (f.hco3 + 2 * f.co3)
  return q
}

/** [H+] in mol/L, or null with no water. Bisection on log10 [H+] over pH -1..15. */
export function hydrogenIon(c: Contents): number | null {
  if (!hasWater(c)) return null
  const V = waterLitres(c)
  let lo = -15
  let hi = 1
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (chargeBalance(c, V, 10 ** mid) > 0) hi = mid
    else lo = mid
  }
  return 10 ** ((lo + hi) / 2)
}

export function pH(c: Contents): number | null {
  const h = hydrogenIon(c)
  return h === null ? null : -Math.log10(h)
}

const add = (c: Contents, id: string, n: number) => {
  const v = (c[id] ?? 0) + n
  if (v <= EPS) delete c[id]
  else c[id] = v
}

/** Put the ions of `n` mol of compound into solution (H+/OH- implicit; water released). */
export function addIons(c: Contents, compound: Species, n: number) {
  for (const [ion, k] of Object.entries(compound.ions ?? {})) if (!IMPLICIT_IONS.has(ion)) add(c, ion, k * n)
}

function removeIons(c: Contents, compound: Species, n: number) {
  for (const [ion, k] of Object.entries(compound.ions ?? {})) if (!IMPLICIT_IONS.has(ion) && ion !== 'H2O') add(c, ion, -k * n)
}

/** Moles of +1 charge (strong base) needed to bring the solution to pH 7. Negative = needs acid. */
export function titratableAcidity(c: Contents): number {
  if (!hasWater(c)) return 0
  const probe = { ...c }
  const pHWith = (d: number) => {
    probe['Na+'] = (c['Na+'] ?? 0) + d
    if (probe['Na+'] < 0) {
      probe['Cl-'] = (c['Cl-'] ?? 0) - probe['Na+']
      probe['Na+'] = 0
    } else probe['Cl-'] = c['Cl-'] ?? 0
    return pH(probe)!
  }
  let lo = -10
  let hi = 10
  for (let i = 0; i < 90; i++) {
    const mid = (lo + hi) / 2
    if (pHWith(mid) > 7) hi = mid
    else lo = mid
  }
  return (lo + hi) / 2
}

/** Ion activity product for a compound at current conditions (concentrations in mol/L). */
function ionProduct(c: Contents, s: Species): number {
  const V = waterLitres(c)
  let needsH = false
  for (const ion of Object.keys(s.ions!)) if (ion === 'OH-' || ion === 'co3') needsH = true
  const h = needsH ? hydrogenIon(c)! : 0
  let ip = 1
  for (const [ion, k] of Object.entries(s.ions!)) {
    if (ion === 'H2O') continue
    const conc = ion === 'OH-' ? KW / h : ion === 'co3' ? ((c.co3 ?? 0) / V) * carbonateFractions(h).co3 : (c[ion] ?? 0) / V
    ip *= conc ** k
  }
  return ip
}

/**
 * Bring every sparingly-soluble compound to its solubility equilibrium: precipitate where the
 * ion product exceeds Ksp, redissolve where a solid is present below it.
 */
export function precipitate(c: Contents): void {
  if (!hasWater(c)) return
  for (let pass = 0; pass < 12; pass++) {
    let changed = false
    for (const s of PRECIPITATES) {
      const ip = ionProduct(c, s)
      const solid = c[s.id] ?? 0
      const canForm = s.precipitates !== false
      let lo: number
      let hi: number
      if (ip > s.ksp! * 1.0001 && canForm) {
        lo = 0
        hi = Math.min(
          ...Object.entries(s.ions!)
            .filter(([ion]) => !IMPLICIT_IONS.has(ion) && ion !== 'H2O')
            .map(([ion, k]) => (c[ion] ?? 0) / k),
        )
      } else if (solid > EPS && ip < s.ksp! * 0.9999) {
        lo = -solid
        hi = 0
      } else continue
      const target = Math.log(s.ksp!)
      const f = (x: number) => {
        const t = { ...c }
        removeIons(t, s, x)
        return Math.log(Math.max(ionProduct(t, s), 1e-300)) - target
      }
      // f falls as x rises. Dissolving branch: if even full dissolution stays unsaturated, dissolve it all.
      if (lo < 0 && f(lo) <= 0) {
        removeIons(c, s, lo)
        delete c[s.id]
        changed = true
        continue
      }
      for (let i = 0; i < 70; i++) {
        const mid = (lo + hi) / 2
        if (f(mid) > 0) lo = mid
        else hi = mid
      }
      const x = (lo + hi) / 2
      if (Math.abs(x) > EPS) {
        removeIons(c, s, x)
        add(c, s.id, x)
        changed = true
      }
    }
    if (!changed) break
  }
}

/** Dissolved CO2 above its solubility leaves as gas. Returns mol released. */
export function releaseCO2(c: Contents): number {
  if (!hasWater(c) || !c.co3) return 0
  let released = 0
  for (let i = 0; i < 20; i++) {
    const h = hydrogenIon(c)!
    const excess = (c.co3 ?? 0) * carbonateFractions(h).h2co3 - CO2_SOLUBILITY * waterLitres(c)
    if (excess <= 1e-9) break
    add(c, 'co3', -excess)
    released += excess
  }
  return released
}

/** Largest x in [0, max] with g(x) <= limit, for g increasing in x. */
export function solveUpTo(max: number, limit: number, g: (x: number) => number) {
  if (g(max) <= limit) return max
  let lo = 0
  let hi = max
  for (let i = 0; i < 70; i++) {
    const mid = (lo + hi) / 2
    if (g(mid) <= limit) lo = mid
    else hi = mid
  }
  return lo
}

/** Copy with every freely-soluble compound split into its ions (no heat accounting). */
export function asDissolved(c: Contents): Contents {
  const out: Contents = {}
  for (const [id, n] of Object.entries(c)) {
    const s = SPECIES[id]
    if (s?.ions && s.ksp === undefined) addIons(out, s, n)
    else out[id] = (out[id] ?? 0) + n
  }
  return out
}

export { species }
