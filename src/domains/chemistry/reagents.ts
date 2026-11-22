import type { Hazard } from '../../core'

/** A bottle on the shelf. Solutions are measured in mL, solids/metals in g, indicators in drops. */
export interface Reagent {
  id: string
  name: string
  kind: 'liquid' | 'solution' | 'solid' | 'metal' | 'indicator'
  unit: 'mL' | 'g' | 'drops'
  /** Solid/metal/liquid: the species in the bottle. Solution: the dissolved species. */
  species: string
  molarity?: number
  /** Stock kept slightly acidic so it doesn't slowly hydrolyse and go cloudy (as real labs do). */
  acidified?: { species: string; molarity: number }
  hazards: Hazard[]
}

const H = (...kinds: Hazard['kind'][]): Hazard[] => kinds.map((kind) => ({ kind }))
const sol = (id: string, name: string, species: string, molarity: number, hazards: Hazard[] = []): Reagent => ({
  id, name: `${molarity} M ${name}`, kind: 'solution', unit: 'mL', species, molarity, hazards,
})
const solid = (id: string, name: string, species: string, hazards: Hazard[] = []): Reagent => ({ id, name, kind: 'solid', unit: 'g', species, hazards })
const metal = (id: string, name: string, species: string, hazards: Hazard[] = []): Reagent => ({ id, name, kind: 'metal', unit: 'g', species, hazards })
const ind = (id: string, name: string): Reagent => ({ id, name, kind: 'indicator', unit: 'drops', species: id, hazards: [] })

export const REAGENTS: Reagent[] = [
  { id: 'water', name: 'Distilled water', kind: 'liquid', unit: 'mL', species: 'H2O', hazards: [] },
  // acids
  sol('hcl-0.1m', 'hydrochloric acid', 'HCl', 0.1, H('irritant')),
  sol('hcl-1m', 'hydrochloric acid', 'HCl', 1, H('corrosive')),
  sol('hcl-2m', 'hydrochloric acid', 'HCl', 2, H('corrosive')),
  sol('h2so4-0.5m', 'sulfuric acid', 'H2SO4', 0.5, H('corrosive')),
  sol('hno3-1m', 'nitric acid', 'HNO3', 1, H('corrosive', 'oxidizer')),
  sol('acetic-0.1m', 'acetic acid', 'CH3COOH', 0.1),
  sol('acetic-1m', 'acetic acid', 'CH3COOH', 1, H('irritant')),
  // bases
  sol('naoh-0.1m', 'sodium hydroxide', 'NaOH', 0.1, H('irritant')),
  sol('naoh-1m', 'sodium hydroxide', 'NaOH', 1, H('corrosive')),
  sol('koh-1m', 'potassium hydroxide', 'KOH', 1, H('corrosive')),
  sol('nh3-1m', 'ammonia solution', 'NH3aq', 1, H('irritant')),
  sol('limewater', 'limewater (calcium hydroxide)', 'Ca(OH)2aq', 0.02, H('irritant')),
  sol('na2co3-0.5m', 'sodium carbonate', 'Na2CO3', 0.5, H('irritant')),
  sol('nahco3-0.5m', 'sodium hydrogen carbonate', 'NaHCO3', 0.5),
  sol('naac-1m', 'sodium acetate', 'NaAc', 1),
  // salts
  sol('nacl-0.1m', 'sodium chloride', 'NaCl', 0.1),
  sol('kcl-0.1m', 'potassium chloride', 'KCl', 0.1),
  sol('kbr-0.1m', 'potassium bromide', 'KBr', 0.1),
  sol('ki-0.1m', 'potassium iodide', 'KI', 0.1),
  sol('licl-0.5m', 'lithium chloride', 'LiCl', 0.5, H('irritant')),
  sol('cacl2-0.5m', 'calcium chloride', 'CaCl2', 0.5, H('irritant')),
  sol('srcl2-0.5m', 'strontium chloride', 'SrCl2', 0.5, H('irritant')),
  sol('bacl2-0.1m', 'barium chloride', 'BaCl2', 0.1, H('toxic')),
  sol('agno3-0.1m', 'silver nitrate', 'AgNO3', 0.1, H('corrosive', 'oxidizer')),
  sol('pbno3-0.1m', 'lead(II) nitrate', 'Pb(NO3)2', 0.1, H('toxic')),
  sol('cuso4-0.5m', 'copper(II) sulfate', 'CuSO4', 0.5, H('irritant', 'toxic')),
  sol('feso4-0.1m', 'iron(II) sulfate', 'FeSO4', 0.1, H('irritant')),
  { ...sol('fecl3-0.1m', 'iron(III) chloride', 'FeCl3', 0.1, H('corrosive')), acidified: { species: 'HCl', molarity: 0.05 } },
  sol('znso4-0.5m', 'zinc sulfate', 'ZnSO4', 0.5, H('irritant')),
  sol('mgso4-0.5m', 'magnesium sulfate', 'MgSO4', 0.5),
  sol('nicl2-0.1m', 'nickel(II) chloride', 'NiCl2', 0.1, H('toxic')),
  sol('cocl2-0.1m', 'cobalt(II) chloride', 'CoCl2', 0.1, H('toxic')),
  sol('kmno4-0.01m', 'potassium permanganate', 'KMnO4', 0.01, H('oxidizer')),
  sol('k2cro4-0.1m', 'potassium chromate', 'K2CrO4', 0.1, H('toxic', 'oxidizer')),
  sol('h2o2-3pct', 'hydrogen peroxide (3%)', 'H2O2', 0.88, H('irritant', 'oxidizer')),
  // solids
  solid('nacl', 'Sodium chloride', 'NaCl'),
  solid('naoh', 'Sodium hydroxide pellets', 'NaOH', H('corrosive')),
  solid('nh4no3', 'Ammonium nitrate', 'NH4NO3', H('oxidizer')),
  solid('nh4cl', 'Ammonium chloride', 'NH4Cl', H('irritant')),
  solid('kno3', 'Potassium nitrate', 'KNO3', H('oxidizer')),
  solid('cacl2', 'Calcium chloride (anhydrous)', 'CaCl2', H('irritant')),
  solid('cuso4-5h2o', 'Copper(II) sulfate crystals (blue)', 'CuSO4.5H2O', H('irritant', 'toxic')),
  solid('cuso4-anhydrous', 'Anhydrous copper(II) sulfate (white)', 'CuSO4', H('irritant', 'toxic')),
  solid('caco3', 'Marble chips (calcium carbonate)', 'CaCO3'),
  solid('nahco3', 'Baking soda (sodium hydrogen carbonate)', 'NaHCO3'),
  solid('na2co3', 'Sodium carbonate', 'Na2CO3', H('irritant')),
  solid('cuco3', 'Copper(II) carbonate', 'CuCO3', H('irritant')),
  solid('cuo', 'Copper(II) oxide', 'CuO', H('irritant')),
  solid('mno2', 'Manganese(IV) oxide', 'MnO2', H('irritant')),
  solid('kmno4', 'Potassium permanganate crystals', 'KMnO4', H('oxidizer')),
  // metals
  metal('mg-ribbon', 'Magnesium ribbon', 'Mg', H('flammable')),
  metal('zn-granules', 'Zinc granules', 'Zn'),
  metal('fe-filings', 'Iron filings', 'Fe'),
  metal('cu-turnings', 'Copper turnings', 'Cu'),
  metal('na-metal', 'Sodium (under oil)', 'Na', H('flammable', 'corrosive')),
  metal('k-metal', 'Potassium (under oil)', 'K', H('flammable', 'corrosive')),
  metal('li-metal', 'Lithium (under oil)', 'Li', H('flammable', 'corrosive')),
  metal('ca-granules', 'Calcium granules', 'Ca', H('flammable')),
  // indicators
  ind('phenolphthalein', 'Phenolphthalein'),
  ind('methyl-orange', 'Methyl orange'),
  ind('bromothymol-blue', 'Bromothymol blue'),
  ind('universal-indicator', 'Universal indicator'),
  ind('red-cabbage', 'Red cabbage indicator'),
  ind('litmus', 'Litmus solution'),
]

export const reagent = (id: string): Reagent => {
  const r = REAGENTS.find((x) => x.id === id)
  if (!r) throw new Error(`Unknown reagent "${id}"`)
  return r
}

export const DROP_ML = 0.05
/** Indicator stock: moles of indicator per drop (≈0.1% solutions). */
export const INDICATOR_MOL_PER_DROP = 1.5e-7
