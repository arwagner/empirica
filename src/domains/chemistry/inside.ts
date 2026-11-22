import { carbonateFractions, hasWater, hydrogenIon, KW, waterLitres, type Contents } from './equilibrium'
import { INDICATORS, SPECIES } from './species'

/** One kind of particle in a vessel, as a learner would want it described. */
export interface Particle {
  id: string
  name: string
  formula: string
  /** mol/L for dissolved particles; null for solids. */
  conc: number | null
  mol: number
  note: string
  solid?: boolean
  color?: string
}

const KA_ACETIC = 1.8e-5
const KA_NH4 = 5.6e-10

const NOTES: Record<string, string> = {
  'H+': 'Hydrogen ions. The more of these, the more acidic the liquid.',
  'OH-': 'Hydroxide ions. The more of these, the more alkaline (basic) the liquid.',
  'Na+': 'Sodium ions. Usually a "spectator": it rarely reacts with anything.',
  'K+': 'Potassium ions. Usually a spectator ion.',
  'Cl-': 'Chloride ions, from dissolved chloride salts or hydrochloric acid.',
  'NO3-': 'Nitrate ions. Nearly every nitrate dissolves, so these are almost always spectators.',
  'SO42-': 'Sulfate ions.',
  'Ag+': 'Silver ions. They pair up with chloride, bromide and iodide into solids that won\'t dissolve.',
  'Cu2+': 'Copper(II) ions. These are what make the solution blue.',
  'Ca2+': 'Calcium ions.',
  'Ba2+': 'Barium ions. They form an insoluble solid with sulfate.',
  'Pb2+': 'Lead ions.',
  'Fe2+': 'Iron(II) ions (pale green).',
  'Fe3+': 'Iron(III) ions (yellow-orange).',
  'Mg2+': 'Magnesium ions.',
  'Zn2+': 'Zinc ions.',
  CH3COOH: 'Acetic acid molecules (vinegar\'s acid). Most of them stay whole; only a few let go of a hydrogen ion.',
  'CH3COO-': 'Acetate ions: acetic acid molecules that have let go of their hydrogen ion.',
  NH3: 'Ammonia molecules. They pick up hydrogen ions, which makes the liquid alkaline.',
  'NH4+': 'Ammonium ions: ammonia that has picked up a hydrogen ion.',
  'CO2(aq)': 'Dissolved carbon dioxide (as in fizzy drinks), partly as carbonic acid.',
  'HCO3-': 'Hydrogen carbonate (bicarbonate) ions, as in baking soda.',
  'CO32-': 'Carbonate ions.',
  H2O2: 'Hydrogen peroxide molecules.',
}

/**
 * Every kind of particle in the vessel, including the ones the engine doesn't store directly
 * (H⁺/OH⁻ from the charge balance; the separate forms of weak acids and bases).
 */
export function particles(c: Contents): Particle[] {
  const out: Particle[] = []
  const wet = hasWater(c)
  const V = wet ? waterLitres(c) : 0
  const h = wet ? hydrogenIon(c)! : 0
  const add = (id: string, name: string, formula: string, mol: number, solid = false) => {
    if (mol <= 0) return
    out.push({ id, name, formula, mol, conc: solid || !wet ? null : mol / V, note: NOTES[id] ?? '', solid })
  }
  if (wet) {
    add('H+', 'hydrogen ions', 'H⁺', h * V)
    add('OH-', 'hydroxide ions', 'OH⁻', (KW / h) * V)
  }
  for (const [id, n] of Object.entries(c)) {
    const s = SPECIES[id]
    if (!s || id === 'H2O') continue
    if (id === 'ac') {
      add('CH3COOH', 'acetic acid', 'CH₃COOH', (n * h) / (h + KA_ACETIC))
      add('CH3COO-', 'acetate ions', 'CH₃COO⁻', (n * KA_ACETIC) / (h + KA_ACETIC))
    } else if (id === 'nh3') {
      add('NH4+', 'ammonium ions', 'NH₄⁺', (n * h) / (h + KA_NH4))
      add('NH3', 'ammonia', 'NH₃', (n * KA_NH4) / (h + KA_NH4))
    } else if (id === 'co3') {
      const f = carbonateFractions(h)
      add('CO2(aq)', 'dissolved carbon dioxide', 'CO₂', n * f.h2co3)
      add('HCO3-', 'hydrogen carbonate ions', 'HCO₃⁻', n * f.hco3)
      add('CO32-', 'carbonate ions', 'CO₃²⁻', n * f.co3)
    } else if (s.phase === 's') {
      add(id, s.name, s.formula, n, true)
    } else if (INDICATORS.includes(id)) {
      add(id, `${s.name} (indicator dye)`, '', n)
      out[out.length - 1].note = 'A dye that changes color depending on how acidic or alkaline the liquid is. A tiny amount is enough.'
    } else {
      add(id, s.name.replace(/ ion$/, ' ions'), s.formula, n)
    }
  }
  const dissolved = out.filter((p) => !p.solid).sort((a, b) => (b.conc ?? 0) - (a.conc ?? 0))
  const solids = out.filter((p) => p.solid).sort((a, b) => b.mol - a.mol)
  for (const p of solids) p.color = SPECIES[p.id]?.color?.hex
  return [...dissolved, ...solids]
}
