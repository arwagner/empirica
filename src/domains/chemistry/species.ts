/**
 * Substance data. Conventions that make the equilibrium model work:
 * - Strong ions are stored directly by id ('Na+', 'Cl-', ...) with a charge.
 * - H+ and OH- are never stored: they follow from the charge balance (see equilibrium.ts).
 *   That's why HCl "dissolves" into just Cl-, and Cu(OH)2 into just Cu2+.
 * - Weak acid/base systems are stored as totals: 'ac' (acetic acid/acetate), 'nh3'
 *   (ammonia/ammonium), 'co3' (CO2/bicarbonate/carbonate). The solver works out the split.
 * - Compounds list the ions they release. 'H+' / 'OH-' entries are implicit and skipped.
 */

export type Phase = 's' | 'l' | 'aq' | 'g'

export interface Species {
  id: string
  name: string
  formula: string
  phase: Phase
  molarMass: number
  charge?: number
  /** Display color and its everyday name. `strength` ~ how intense per mol/L. */
  color?: { hex: string; name: string; strength: number }
  /** Ionic compound: what it splits into in water. */
  ions?: Record<string, number>
  /** Sparingly soluble: equilibrium with its ions follows this solubility product. */
  ksp?: number
  /** False for solids that dissolve but never form from solution (kinetics: CuO, MgO). */
  precipitates?: boolean
  /** Enthalpy of dissolving a mole of this solid, kJ/mol. */
  dissolveKJ?: number
  metal?: { ion: string; n: number; e0: number; reactsWithWater?: boolean; reactionKJ: number }
  /** Takes no part except as noted (catalyst, etc). */
  inert?: boolean
  flame?: { hex: string; name: string }
}

const S = (s: Species) => s
const c = (hex: string, name: string, strength: number) => ({ hex, name, strength })

export const SPECIES: Record<string, Species> = Object.fromEntries(
  [
    S({ id: 'H2O', name: 'water', formula: 'H₂O', phase: 'l', molarMass: 18.015 }),

    // cations
    S({ id: 'Li+', name: 'lithium ion', formula: 'Li⁺', phase: 'aq', molarMass: 6.94, charge: 1, flame: { hex: '#dc143c', name: 'crimson' } }),
    S({ id: 'Na+', name: 'sodium ion', formula: 'Na⁺', phase: 'aq', molarMass: 22.99, charge: 1, flame: { hex: '#ffb000', name: 'bright yellow-orange' } }),
    S({ id: 'K+', name: 'potassium ion', formula: 'K⁺', phase: 'aq', molarMass: 39.1, charge: 1, flame: { hex: '#c8a2c8', name: 'lilac' } }),
    S({ id: 'Mg2+', name: 'magnesium ion', formula: 'Mg²⁺', phase: 'aq', molarMass: 24.31, charge: 2 }),
    S({ id: 'Ca2+', name: 'calcium ion', formula: 'Ca²⁺', phase: 'aq', molarMass: 40.08, charge: 2, flame: { hex: '#ff5a1f', name: 'orange-red' } }),
    S({ id: 'Sr2+', name: 'strontium ion', formula: 'Sr²⁺', phase: 'aq', molarMass: 87.62, charge: 2, flame: { hex: '#ff1a1a', name: 'scarlet red' } }),
    S({ id: 'Ba2+', name: 'barium ion', formula: 'Ba²⁺', phase: 'aq', molarMass: 137.33, charge: 2, flame: { hex: '#9acd32', name: 'apple green' } }),
    S({ id: 'Fe2+', name: 'iron(II) ion', formula: 'Fe²⁺', phase: 'aq', molarMass: 55.85, charge: 2, color: c('#b5d99c', 'pale green', 3) }),
    S({ id: 'Fe3+', name: 'iron(III) ion', formula: 'Fe³⁺', phase: 'aq', molarMass: 55.85, charge: 3, color: c('#d9902b', 'yellow-orange', 12) }),
    S({ id: 'Cu2+', name: 'copper(II) ion', formula: 'Cu²⁺', phase: 'aq', molarMass: 63.55, charge: 2, color: c('#2b8fd9', 'blue', 8), flame: { hex: '#1fbfa5', name: 'blue-green' } }),
    S({ id: 'Zn2+', name: 'zinc ion', formula: 'Zn²⁺', phase: 'aq', molarMass: 65.38, charge: 2 }),
    S({ id: 'Ag+', name: 'silver ion', formula: 'Ag⁺', phase: 'aq', molarMass: 107.87, charge: 1 }),
    S({ id: 'Pb2+', name: 'lead(II) ion', formula: 'Pb²⁺', phase: 'aq', molarMass: 207.2, charge: 2 }),
    S({ id: 'Ni2+', name: 'nickel(II) ion', formula: 'Ni²⁺', phase: 'aq', molarMass: 58.69, charge: 2, color: c('#3fae5a', 'green', 6) }),
    S({ id: 'Co2+', name: 'cobalt(II) ion', formula: 'Co²⁺', phase: 'aq', molarMass: 58.93, charge: 2, color: c('#e0679a', 'pink', 6) }),
    S({ id: 'Mn2+', name: 'manganese(II) ion', formula: 'Mn²⁺', phase: 'aq', molarMass: 54.94, charge: 2 }),

    // anions
    S({ id: 'Cl-', name: 'chloride ion', formula: 'Cl⁻', phase: 'aq', molarMass: 35.45, charge: -1 }),
    S({ id: 'Br-', name: 'bromide ion', formula: 'Br⁻', phase: 'aq', molarMass: 79.9, charge: -1 }),
    S({ id: 'I-', name: 'iodide ion', formula: 'I⁻', phase: 'aq', molarMass: 126.9, charge: -1 }),
    S({ id: 'NO3-', name: 'nitrate ion', formula: 'NO₃⁻', phase: 'aq', molarMass: 62.0, charge: -1 }),
    S({ id: 'SO42-', name: 'sulfate ion', formula: 'SO₄²⁻', phase: 'aq', molarMass: 96.06, charge: -2 }),
    S({ id: 'MnO4-', name: 'permanganate ion', formula: 'MnO₄⁻', phase: 'aq', molarMass: 118.94, charge: -1, color: c('#7a1fa2', 'deep purple', 2500) }),
    S({ id: 'CrO42-', name: 'chromate ion', formula: 'CrO₄²⁻', phase: 'aq', molarMass: 115.99, charge: -2, color: c('#f2c300', 'yellow', 60) }),

    // weak systems (stored as totals)
    S({ id: 'ac', name: 'acetic acid / acetate', formula: 'CH₃COOH', phase: 'aq', molarMass: 60.05 }),
    S({ id: 'nh3', name: 'ammonia / ammonium', formula: 'NH₃', phase: 'aq', molarMass: 17.03 }),
    S({ id: 'co3', name: 'dissolved carbon dioxide / carbonate', formula: 'CO₂', phase: 'aq', molarMass: 44.01 }),

    // molecular
    S({ id: 'H2O2', name: 'hydrogen peroxide', formula: 'H₂O₂', phase: 'aq', molarMass: 34.01 }),
    S({ id: 'HCl', name: 'hydrogen chloride', formula: 'HCl', phase: 'aq', molarMass: 36.46, ions: { 'H+': 1, 'Cl-': 1 } }),
    S({ id: 'HNO3', name: 'nitric acid', formula: 'HNO₃', phase: 'aq', molarMass: 63.01, ions: { 'H+': 1, 'NO3-': 1 } }),
    S({ id: 'H2SO4', name: 'sulfuric acid', formula: 'H₂SO₄', phase: 'aq', molarMass: 98.08, ions: { 'H+': 2, 'SO42-': 1 } }),
    S({ id: 'CH3COOH', name: 'acetic acid', formula: 'CH₃COOH', phase: 'aq', molarMass: 60.05, ions: { ac: 1 } }),
    S({ id: 'NH3aq', name: 'ammonia', formula: 'NH₃', phase: 'aq', molarMass: 17.03, ions: { nh3: 1 } }),

    // gases
    S({ id: 'H2', name: 'hydrogen', formula: 'H₂', phase: 'g', molarMass: 2.016 }),
    S({ id: 'O2', name: 'oxygen', formula: 'O₂', phase: 'g', molarMass: 32.0 }),
    S({ id: 'CO2', name: 'carbon dioxide', formula: 'CO₂', phase: 'g', molarMass: 44.01 }),

    // soluble salts / bases
    S({ id: 'NaCl', name: 'sodium chloride', formula: 'NaCl', phase: 's', molarMass: 58.44, ions: { 'Na+': 1, 'Cl-': 1 }, dissolveKJ: 3.9 }),
    S({ id: 'KCl', name: 'potassium chloride', formula: 'KCl', phase: 's', molarMass: 74.55, ions: { 'K+': 1, 'Cl-': 1 }, dissolveKJ: 17.2 }),
    S({ id: 'KBr', name: 'potassium bromide', formula: 'KBr', phase: 's', molarMass: 119.0, ions: { 'K+': 1, 'Br-': 1 }, dissolveKJ: 19.9 }),
    S({ id: 'KI', name: 'potassium iodide', formula: 'KI', phase: 's', molarMass: 166.0, ions: { 'K+': 1, 'I-': 1 }, dissolveKJ: 20.3 }),
    S({ id: 'LiCl', name: 'lithium chloride', formula: 'LiCl', phase: 's', molarMass: 42.39, ions: { 'Li+': 1, 'Cl-': 1 }, dissolveKJ: -37.0 }),
    S({ id: 'NaOH', name: 'sodium hydroxide', formula: 'NaOH', phase: 's', molarMass: 40.0, ions: { 'Na+': 1, 'OH-': 1 }, dissolveKJ: -44.5 }),
    S({ id: 'KOH', name: 'potassium hydroxide', formula: 'KOH', phase: 's', molarMass: 56.11, ions: { 'K+': 1, 'OH-': 1 }, dissolveKJ: -57.6 }),
    S({ id: 'NH4NO3', name: 'ammonium nitrate', formula: 'NH₄NO₃', phase: 's', molarMass: 80.04, ions: { nh3: 1, 'H+': 1, 'NO3-': 1 }, dissolveKJ: 25.7 }),
    S({ id: 'NH4Cl', name: 'ammonium chloride', formula: 'NH₄Cl', phase: 's', molarMass: 53.49, ions: { nh3: 1, 'H+': 1, 'Cl-': 1 }, dissolveKJ: 14.8 }),
    S({ id: 'KNO3', name: 'potassium nitrate', formula: 'KNO₃', phase: 's', molarMass: 101.1, ions: { 'K+': 1, 'NO3-': 1 }, dissolveKJ: 34.9 }),
    S({ id: 'CaCl2', name: 'calcium chloride', formula: 'CaCl₂', phase: 's', molarMass: 110.98, ions: { 'Ca2+': 1, 'Cl-': 2 }, dissolveKJ: -82.8 }),
    S({ id: 'SrCl2', name: 'strontium chloride', formula: 'SrCl₂', phase: 's', molarMass: 158.53, ions: { 'Sr2+': 1, 'Cl-': 2 }, dissolveKJ: -52 }),
    S({ id: 'BaCl2', name: 'barium chloride', formula: 'BaCl₂', phase: 's', molarMass: 208.23, ions: { 'Ba2+': 1, 'Cl-': 2 }, dissolveKJ: -13 }),
    S({ id: 'CuSO4', name: 'anhydrous copper(II) sulfate', formula: 'CuSO₄', phase: 's', molarMass: 159.61, ions: { 'Cu2+': 1, 'SO42-': 1 }, dissolveKJ: -66.5, color: c('#eef1f0', 'white', 1) }),
    S({ id: 'CuSO4.5H2O', name: 'copper(II) sulfate pentahydrate', formula: 'CuSO₄·5H₂O', phase: 's', molarMass: 249.69, ions: { 'Cu2+': 1, 'SO42-': 1, H2O: 5 }, dissolveKJ: 11.5, color: c('#1f6fd1', 'blue', 1) }),
    S({ id: 'FeSO4', name: 'iron(II) sulfate', formula: 'FeSO₄', phase: 's', molarMass: 151.91, ions: { 'Fe2+': 1, 'SO42-': 1 }, dissolveKJ: -62 }),
    S({ id: 'FeCl3', name: 'iron(III) chloride', formula: 'FeCl₃', phase: 's', molarMass: 162.2, ions: { 'Fe3+': 1, 'Cl-': 3 }, dissolveKJ: -132 }),
    S({ id: 'ZnSO4', name: 'zinc sulfate', formula: 'ZnSO₄', phase: 's', molarMass: 161.47, ions: { 'Zn2+': 1, 'SO42-': 1 }, dissolveKJ: -82 }),
    S({ id: 'MgSO4', name: 'magnesium sulfate', formula: 'MgSO₄', phase: 's', molarMass: 120.37, ions: { 'Mg2+': 1, 'SO42-': 1 }, dissolveKJ: -91 }),
    S({ id: 'AgNO3', name: 'silver nitrate', formula: 'AgNO₃', phase: 's', molarMass: 169.87, ions: { 'Ag+': 1, 'NO3-': 1 }, dissolveKJ: 22.6 }),
    S({ id: 'Pb(NO3)2', name: 'lead(II) nitrate', formula: 'Pb(NO₃)₂', phase: 's', molarMass: 331.2, ions: { 'Pb2+': 1, 'NO3-': 2 }, dissolveKJ: 37 }),
    S({ id: 'NiCl2', name: 'nickel(II) chloride', formula: 'NiCl₂', phase: 's', molarMass: 129.6, ions: { 'Ni2+': 1, 'Cl-': 2 }, dissolveKJ: -82 }),
    S({ id: 'CoCl2', name: 'cobalt(II) chloride', formula: 'CoCl₂', phase: 's', molarMass: 129.84, ions: { 'Co2+': 1, 'Cl-': 2 }, dissolveKJ: -79 }),
    S({ id: 'KMnO4', name: 'potassium permanganate', formula: 'KMnO₄', phase: 's', molarMass: 158.03, ions: { 'K+': 1, 'MnO4-': 1 }, dissolveKJ: 43.6, color: c('#4b1060', 'dark purple', 1) }),
    S({ id: 'K2CrO4', name: 'potassium chromate', formula: 'K₂CrO₄', phase: 's', molarMass: 194.19, ions: { 'K+': 2, 'CrO42-': 1 }, dissolveKJ: 18, color: c('#f2c300', 'yellow', 1) }),
    S({ id: 'Na2CO3', name: 'sodium carbonate', formula: 'Na₂CO₃', phase: 's', molarMass: 105.99, ions: { 'Na+': 2, co3: 1 }, dissolveKJ: -26.7 }),
    S({ id: 'NaHCO3', name: 'sodium hydrogen carbonate', formula: 'NaHCO₃', phase: 's', molarMass: 84.01, ions: { 'Na+': 1, co3: 1, 'H+': 1 }, dissolveKJ: 16.7 }),
    S({ id: 'NaAc', name: 'sodium acetate', formula: 'CH₃COONa', phase: 's', molarMass: 82.03, ions: { 'Na+': 1, ac: 1 }, dissolveKJ: -17.3 }),
    S({ id: 'Ca(OH)2aq', name: 'calcium hydroxide', formula: 'Ca(OH)₂', phase: 'aq', molarMass: 74.09, ions: { 'Ca2+': 1, 'OH-': 2 } }),

    // sparingly soluble (precipitates). Ksp at 25 °C.
    S({ id: 'AgCl', name: 'silver chloride', formula: 'AgCl', phase: 's', molarMass: 143.32, ions: { 'Ag+': 1, 'Cl-': 1 }, ksp: 1.8e-10, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'AgBr', name: 'silver bromide', formula: 'AgBr', phase: 's', molarMass: 187.77, ions: { 'Ag+': 1, 'Br-': 1 }, ksp: 5.0e-13, color: c('#efe6c4', 'cream', 1) }),
    S({ id: 'AgI', name: 'silver iodide', formula: 'AgI', phase: 's', molarMass: 234.77, ions: { 'Ag+': 1, 'I-': 1 }, ksp: 8.3e-17, color: c('#e8d75a', 'pale yellow', 1) }),
    S({ id: 'Ag2CrO4', name: 'silver chromate', formula: 'Ag₂CrO₄', phase: 's', molarMass: 331.73, ions: { 'Ag+': 2, 'CrO42-': 1 }, ksp: 1.1e-12, color: c('#a3281e', 'brick red', 1) }),
    S({ id: 'Ag2CO3', name: 'silver carbonate', formula: 'Ag₂CO₃', phase: 's', molarMass: 275.75, ions: { 'Ag+': 2, co3: 1 }, ksp: 8.5e-12, color: c('#ece4c8', 'pale yellow', 1) }),
    S({ id: 'Ag2O', name: 'silver oxide', formula: 'Ag₂O', phase: 's', molarMass: 231.74, ions: { 'Ag+': 2, 'OH-': 2 }, ksp: 4e-16, color: c('#5a3d2b', 'brown', 1) }),
    S({ id: 'PbI2', name: 'lead(II) iodide', formula: 'PbI₂', phase: 's', molarMass: 461.0, ions: { 'Pb2+': 1, 'I-': 2 }, ksp: 9.8e-9, color: c('#ffd21f', 'bright yellow', 1) }),
    S({ id: 'PbCl2', name: 'lead(II) chloride', formula: 'PbCl₂', phase: 's', molarMass: 278.1, ions: { 'Pb2+': 1, 'Cl-': 2 }, ksp: 1.7e-5, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'PbSO4', name: 'lead(II) sulfate', formula: 'PbSO₄', phase: 's', molarMass: 303.26, ions: { 'Pb2+': 1, 'SO42-': 1 }, ksp: 2.5e-8, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'PbCrO4', name: 'lead(II) chromate', formula: 'PbCrO₄', phase: 's', molarMass: 323.19, ions: { 'Pb2+': 1, 'CrO42-': 1 }, ksp: 2.8e-13, color: c('#f5b800', 'chrome yellow', 1) }),
    S({ id: 'Pb(OH)2', name: 'lead(II) hydroxide', formula: 'Pb(OH)₂', phase: 's', molarMass: 241.2, ions: { 'Pb2+': 1, 'OH-': 2 }, ksp: 1.4e-20, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'BaSO4', name: 'barium sulfate', formula: 'BaSO₄', phase: 's', molarMass: 233.39, ions: { 'Ba2+': 1, 'SO42-': 1 }, ksp: 1.1e-10, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'BaCO3', name: 'barium carbonate', formula: 'BaCO₃', phase: 's', molarMass: 197.34, ions: { 'Ba2+': 1, co3: 1 }, ksp: 2.6e-9, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'BaCrO4', name: 'barium chromate', formula: 'BaCrO₄', phase: 's', molarMass: 253.37, ions: { 'Ba2+': 1, 'CrO42-': 1 }, ksp: 1.2e-10, color: c('#f2d43a', 'yellow', 1) }),
    S({ id: 'CaCO3', name: 'calcium carbonate', formula: 'CaCO₃', phase: 's', molarMass: 100.09, ions: { 'Ca2+': 1, co3: 1 }, ksp: 3.4e-9, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'CaSO4', name: 'calcium sulfate', formula: 'CaSO₄', phase: 's', molarMass: 136.14, ions: { 'Ca2+': 1, 'SO42-': 1 }, ksp: 4.9e-5, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'Ca(OH)2', name: 'calcium hydroxide', formula: 'Ca(OH)₂', phase: 's', molarMass: 74.09, ions: { 'Ca2+': 1, 'OH-': 2 }, ksp: 5.5e-6, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'SrSO4', name: 'strontium sulfate', formula: 'SrSO₄', phase: 's', molarMass: 183.68, ions: { 'Sr2+': 1, 'SO42-': 1 }, ksp: 3.4e-7, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'SrCO3', name: 'strontium carbonate', formula: 'SrCO₃', phase: 's', molarMass: 147.63, ions: { 'Sr2+': 1, co3: 1 }, ksp: 5.6e-10, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'Mg(OH)2', name: 'magnesium hydroxide', formula: 'Mg(OH)₂', phase: 's', molarMass: 58.32, ions: { 'Mg2+': 1, 'OH-': 2 }, ksp: 5.6e-12, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'MgCO3', name: 'magnesium carbonate', formula: 'MgCO₃', phase: 's', molarMass: 84.31, ions: { 'Mg2+': 1, co3: 1 }, ksp: 6.8e-6, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'Cu(OH)2', name: 'copper(II) hydroxide', formula: 'Cu(OH)₂', phase: 's', molarMass: 97.56, ions: { 'Cu2+': 1, 'OH-': 2 }, ksp: 2.2e-20, color: c('#6fb7e8', 'pale blue', 1) }),
    S({ id: 'CuCO3', name: 'copper(II) carbonate', formula: 'CuCO₃', phase: 's', molarMass: 123.55, ions: { 'Cu2+': 1, co3: 1 }, ksp: 1.4e-10, color: c('#3e9e7a', 'green', 1) }),
    S({ id: 'Fe(OH)2', name: 'iron(II) hydroxide', formula: 'Fe(OH)₂', phase: 's', molarMass: 89.86, ions: { 'Fe2+': 1, 'OH-': 2 }, ksp: 4.9e-17, color: c('#5d8a52', 'dirty green', 1) }),
    S({ id: 'Fe(OH)3', name: 'iron(III) hydroxide', formula: 'Fe(OH)₃', phase: 's', molarMass: 106.87, ions: { 'Fe3+': 1, 'OH-': 3 }, ksp: 2.8e-39, color: c('#a0522d', 'rusty brown', 1) }),
    S({ id: 'FeCO3', name: 'iron(II) carbonate', formula: 'FeCO₃', phase: 's', molarMass: 115.85, ions: { 'Fe2+': 1, co3: 1 }, ksp: 3.1e-11, color: c('#c9c9a8', 'off-white', 1) }),
    S({ id: 'Zn(OH)2', name: 'zinc hydroxide', formula: 'Zn(OH)₂', phase: 's', molarMass: 99.42, ions: { 'Zn2+': 1, 'OH-': 2 }, ksp: 3e-17, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'ZnCO3', name: 'zinc carbonate', formula: 'ZnCO₃', phase: 's', molarMass: 125.39, ions: { 'Zn2+': 1, co3: 1 }, ksp: 1.5e-10, color: c('#f4f4f0', 'white', 1) }),
    S({ id: 'Ni(OH)2', name: 'nickel(II) hydroxide', formula: 'Ni(OH)₂', phase: 's', molarMass: 92.71, ions: { 'Ni2+': 1, 'OH-': 2 }, ksp: 5.5e-16, color: c('#5fbf6a', 'apple green', 1) }),
    S({ id: 'Co(OH)2', name: 'cobalt(II) hydroxide', formula: 'Co(OH)₂', phase: 's', molarMass: 92.95, ions: { 'Co2+': 1, 'OH-': 2 }, ksp: 5.9e-15, color: c('#c45a8a', 'rose pink', 1) }),
    S({ id: 'Mn(OH)2', name: 'manganese(II) hydroxide', formula: 'Mn(OH)₂', phase: 's', molarMass: 88.95, ions: { 'Mn2+': 1, 'OH-': 2 }, ksp: 1.9e-13, color: c('#e8d9c4', 'off-white', 1) }),
    S({ id: 'CuO', name: 'copper(II) oxide', formula: 'CuO', phase: 's', molarMass: 79.55, ions: { 'Cu2+': 1, 'OH-': 2 }, ksp: 1e-20, precipitates: false, color: c('#1d1d1d', 'black', 1) }),
    S({ id: 'MgO', name: 'magnesium oxide', formula: 'MgO', phase: 's', molarMass: 40.3, ions: { 'Mg2+': 1, 'OH-': 2 }, ksp: 5.6e-12, precipitates: false, color: c('#f7f7f2', 'white', 1) }),
    S({ id: 'MnO2', name: 'manganese(IV) oxide', formula: 'MnO₂', phase: 's', molarMass: 86.94, inert: true, color: c('#262626', 'black', 1) }),

    // metals. e0 = standard reduction potential of the ion, V. reactionKJ: with acid (or water).
    S({ id: 'Li', name: 'lithium', formula: 'Li', phase: 's', molarMass: 6.94, color: c('#c9c9c9', 'silvery', 1), metal: { ion: 'Li+', n: 1, e0: -3.04, reactsWithWater: true, reactionKJ: -222 } }),
    S({ id: 'Na', name: 'sodium', formula: 'Na', phase: 's', molarMass: 22.99, color: c('#d0d0d0', 'silvery', 1), metal: { ion: 'Na+', n: 1, e0: -2.71, reactsWithWater: true, reactionKJ: -184 } }),
    S({ id: 'K', name: 'potassium', formula: 'K', phase: 's', molarMass: 39.1, color: c('#d0d0d0', 'silvery', 1), metal: { ion: 'K+', n: 1, e0: -2.93, reactsWithWater: true, reactionKJ: -196 } }),
    S({ id: 'Ca', name: 'calcium', formula: 'Ca', phase: 's', molarMass: 40.08, color: c('#cfcfc4', 'grey', 1), metal: { ion: 'Ca2+', n: 2, e0: -2.87, reactsWithWater: true, reactionKJ: -414 } }),
    S({ id: 'Mg', name: 'magnesium', formula: 'Mg', phase: 's', molarMass: 24.31, color: c('#bfc4c8', 'silvery grey', 1), metal: { ion: 'Mg2+', n: 2, e0: -2.37, reactionKJ: -466.9 } }),
    S({ id: 'Zn', name: 'zinc', formula: 'Zn', phase: 's', molarMass: 65.38, color: c('#a9b0b5', 'grey', 1), metal: { ion: 'Zn2+', n: 2, e0: -0.76, reactionKJ: -153.9 } }),
    S({ id: 'Fe', name: 'iron', formula: 'Fe', phase: 's', molarMass: 55.85, color: c('#6b6b6b', 'dark grey', 1), metal: { ion: 'Fe2+', n: 2, e0: -0.44, reactionKJ: -89.1 } }),
    S({ id: 'Pb', name: 'lead', formula: 'Pb', phase: 's', molarMass: 207.2, color: c('#7d7f86', 'dull grey', 1), metal: { ion: 'Pb2+', n: 2, e0: -0.13, reactionKJ: 0 } }),
    S({ id: 'Cu', name: 'copper', formula: 'Cu', phase: 's', molarMass: 63.55, color: c('#b8632e', 'reddish-brown', 1), metal: { ion: 'Cu2+', n: 2, e0: 0.34, reactionKJ: 0 } }),
    S({ id: 'Ag', name: 'silver', formula: 'Ag', phase: 's', molarMass: 107.87, color: c('#d9d9d9', 'shiny grey', 1), metal: { ion: 'Ag+', n: 1, e0: 0.8, reactionKJ: 0 } }),

    // indicators (tiny amounts; color from pH, see appearance.ts)
    ...['phenolphthalein', 'methyl-orange', 'bromothymol-blue', 'universal-indicator', 'red-cabbage', 'litmus'].map((id) =>
      S({ id, name: id.replace(/-/g, ' '), formula: id, phase: 'aq', molarMass: 300 }),
    ),
  ].map((s) => [s.id, s]),
)

export const species = (id: string): Species => {
  const s = SPECIES[id]
  if (!s) throw new Error(`Unknown species "${id}"`)
  return s
}

export const IMPLICIT_IONS = new Set(['H+', 'OH-'])
export const WEAK = ['ac', 'nh3', 'co3'] as const
export const INDICATORS = ['phenolphthalein', 'methyl-orange', 'bromothymol-blue', 'universal-indicator', 'red-cabbage', 'litmus']
export const PRECIPITATES = Object.values(SPECIES).filter((s) => s.ksp !== undefined).sort((a, b) => a.ksp! - b.ksp!)
export const isIonOrWeak = (id: string) => SPECIES[id]?.charge !== undefined || (WEAK as readonly string[]).includes(id)
