import type { Explanation } from '../../core'
import { indicatorColor, type SolutionColor } from './appearance'
import { INDICATORS, SPECIES, species, type Species } from './species'

/** What the engine actually did while settling a vessel: the raw material for "why". */
export type Cause =
  | { kind: 'dissolve'; species: string; kJ: number }
  | { kind: 'neutralize'; kJ: number }
  | { kind: 'catalysis'; kJ: number }
  | { kind: 'alkali'; metal: string; kJ: number }
  | { kind: 'displace'; metal: string; target: string; kJ: number }
  | { kind: 'acid-metal'; metal: string; kJ: number }
  | { kind: 'carbonate' }

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

const ION_WORDS: Record<string, { simple: string; formula: string }> = {
  co3: { simple: 'carbonate ions', formula: 'CO₃²⁻' },
  'OH-': { simple: 'hydroxide ions (from the alkali)', formula: 'OH⁻' },
  nh3: { simple: 'ammonium ions', formula: 'NH₄⁺' },
  ac: { simple: 'acetate ions', formula: 'CH₃COO⁻' },
}
/** "silver ions", with formula, for an ion id in a compound's recipe. */
function ion(id: string) {
  if (ION_WORDS[id]) return ION_WORDS[id]
  const s = SPECIES[id]
  return { simple: `${s.name.replace(/ ion$/, '')} ions`, formula: s.formula }
}
const partners = (s: Species) => Object.keys(s.ions ?? {}).filter((i) => i !== 'H2O' && i !== 'H+')
const sci = (x: number) => x.toExponential(1).replace(/e([+-])(\d+)/, (_, sign, d) => `×10${sign === '-' ? '⁻' : ''}${[...d].map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('')}`)

export function whyPrecipitate(s: Species): Explanation {
  const ps = partners(s).map(ion)
  const [a, b] = ps
  const eq = `${ps.map((p) => p.formula).join(' + ')} → ${s.formula}(s)`
  return X(
    `Dissolved salts are split into tiny charged pieces called ions, which are invisible. Here, ${a.simple} met ${b.simple}. Together they make ${s.name}, which can hardly dissolve in water at all, so they clump into specks of solid you can see${s.color ? `: ${s.color.name}` : ''}. That solid is called a precipitate.`,
    `${eq}. ${cap(s.name)} is almost insoluble, so as soon as both ions are in the same solution they pair up and drop out as a solid (a precipitate). Any other ions stay dissolved and just watch: they're "spectator ions".`,
    `Net ionic equation: ${eq}. Precipitation happens whenever the ion product Q exceeds the solubility product, Ksp = ${sci(s.ksp ?? 0)} for ${s.formula}; the solid keeps forming until Q falls back to Ksp.`,
  )
}

export function whyDissolved(s: Species): Explanation {
  const ions = partners(s)
  if (s.metal) return X(`The ${s.name} reacted until there was none left: its atoms turned into ions and went into the solution.`, `The ${s.name} was oxidised to ${species(s.metal.ion).formula} ions, which are dissolved, so the solid metal disappears.`, `${s.formula}(s) → ${species(s.metal.ion).formula}(aq) + ${s.metal.n}e⁻; the reaction ran until the metal was used up.`)
  if (s.ksp !== undefined && ions.includes('co3'))
    return X(`Acid attacks the ${s.name}: it turns the carbonate part into carbon dioxide gas, which escapes, so the solid gets eaten away.`, `Acid reacts with carbonate: CO₃²⁻ + 2H⁺ → H₂O + CO₂. Removing the carbonate lets more ${s.name} dissolve, until it's all gone.`, `Protonating CO₃²⁻ drives [CO₃²⁻] ≪ Ksp/[M²⁺], so the solid dissolves (Le Chatelier) and CO₂ outgasses.`)
  if (s.ksp !== undefined && ions.includes('OH-'))
    return X(`The acid neutralised the ${s.name}, turning it into ions that dissolve.`, `H⁺ from the acid reacts with the hydroxide/oxide (forming water), so the metal ions are freed into solution.`, `Lowering pH reduces [OH⁻] so that Q < Ksp; the solid dissolves to restore equilibrium.`)
  return X(
    `The ${s.name} broke apart into ions that spread out among the water molecules. They're too small to see, so the solid seems to vanish.`,
    `Water molecules pull the ${s.name} crystal apart into separate ions${ions.length ? ` (${ions.map((i) => ion(i).formula).join(', ')})` : ''}, which stay dissolved.`,
    `Dissolution: the lattice breaks up and the ions are hydrated (surrounded by oriented water dipoles). It proceeds while the solution is below saturation.`,
  )
}

export function whyGas(gas: string, causes: Cause[]): Explanation {
  const metal = causes.find((c) => c.kind === 'acid-metal' || c.kind === 'alkali') as { metal: string; kind: string } | undefined
  if (gas === 'H2' && metal) {
    const m = species(metal.metal)
    return metal.kind === 'alkali'
      ? X(`${cap(m.name)} is so reactive it pulls water molecules apart. It grabs the oxygen part and the leftover hydrogen bubbles off as gas.`, `2${m.formula} + 2H₂O → 2${m.formula}OH + H₂. The metal gives electrons to water; hydrogen gas is released and the solution becomes alkaline.`, `Alkali metals have very low ionisation energies; electron transfer to H₂O (reduced to H₂ + OH⁻) is fast and strongly exothermic.`)
      : X(`${cap(m.name)} is more reactive than hydrogen. It pushes hydrogen out of the acid, and the hydrogen bubbles away as gas.`, `${m.formula} + 2H⁺ → ${species(m.metal!.ion).formula} + H₂. The metal atoms give electrons to hydrogen ions from the acid, which pair up into H₂ gas.`, `E°(${species(m.metal!.ion).formula}/${m.formula}) = ${m.metal!.e0} V < 0 = E°(H⁺/H₂), so the metal reduces H⁺ spontaneously (ΔG = −nFE° < 0).`)
  }
  if (gas === 'O2') return X('The black powder (a catalyst) helps hydrogen peroxide break apart into water and oxygen gas, much faster than it would alone.', '2H₂O₂ → 2H₂O + O₂. Manganese dioxide is a catalyst: it speeds up the breakdown without being used up.', 'MnO₂ provides a surface pathway with a lower activation energy; it isn\'t consumed, and the equilibrium position is unchanged.')
  if (gas === 'CO2') return X('Acid reacted with a carbonate. That always makes carbon dioxide gas, the same gas that makes fizzy drinks fizzy.', 'Acid + carbonate → salt + water + carbon dioxide: CO₃²⁻ + 2H⁺ → H₂O + CO₂(g).', 'Carbonate is protonated to H₂CO₃*, whose concentration exceeds CO₂\'s solubility, so CO₂ outgasses.')
  return X(`A gas was given off.`, `A reaction produced ${gas}.`, `${gas} evolved.`)
}

export function whyHeat(dT: number, causes: Cause[]): Explanation {
  const heats = causes.filter((c): c is Extract<Cause, { kJ: number }> => 'kJ' in c && Math.abs(c.kJ) > 1e-4)
  const main = heats.sort((a, b) => Math.abs(b.kJ) - Math.abs(a.kJ))[0]
  const hot = dT > 0
  if (main?.kind === 'neutralize')
    return X('When an acid and a base cancel out, they make water, and making water releases energy as heat.', 'Neutralisation is exothermic: H⁺ + OH⁻ → H₂O gives out about 57 kJ for every mole of water formed.', `ΔH_neut ≈ −57.1 kJ mol⁻¹; here about ${Math.abs(main.kJ).toFixed(2)} kJ was released into the solution (q = mcΔT).`)
  if (main?.kind === 'dissolve') {
    const s = species(main.species)
    return hot
      ? X(`Dissolving ${s.name} gives out heat. Pulling the solid apart takes energy, but water molecules hugging the ions gives back even more, so it warms up.`, `Dissolving ${s.name} is exothermic: the energy released when water surrounds the ions (hydration) is bigger than the energy needed to break up the crystal.`, `ΔH_soln(${s.formula}) = ${s.dissolveKJ} kJ mol⁻¹ = lattice enthalpy (endothermic) + hydration enthalpy (more exothermic).`)
      : X(`Dissolving ${s.name} soaks up heat. Pulling the solid apart takes more energy than the water gives back, so it takes that energy from the water, and it gets cold.`, `Dissolving ${s.name} is endothermic: breaking up the crystal costs more energy than hydration returns. It still happens because spreading out the ions increases disorder (entropy).`, `ΔH_soln(${s.formula}) = +${s.dissolveKJ} kJ mol⁻¹ > 0, yet ΔG = ΔH − TΔS < 0 because ΔS_soln is large and positive.`)
  }
  if (main) return X(hot ? 'The reaction released stored chemical energy as heat.' : 'The process took in heat from its surroundings.', hot ? 'This reaction is exothermic: its products have less chemical energy than the reactants, and the difference comes out as heat.' : 'This process is endothermic: it takes in energy from the surroundings.', `ΔH ≈ ${main.kJ.toFixed(2)} kJ for the amounts here; ΔT = −ΔH/C.`)
  return X(hot ? 'Heat came from the warmer liquid you mixed in.' : 'Heat went into the colder liquid you mixed in.', 'Mixing liquids at different temperatures shares out the heat.', 'Final T = Σ(C_i T_i)/ΣC_i.')
}

export function whyColor(after: SolutionColor, beforeName: string): Explanation {
  const id = after.dominant
  if (id && INDICATORS.includes(id)) {
    const s = species(id)
    return X(
      `${cap(s.name)} is a dye that changes color depending on how acidic or alkaline the liquid is. The liquid is now ${after.pH! < 6.5 ? 'acidic' : after.pH! > 7.5 ? 'alkaline' : 'about neutral'}, and at that level it shows ${after.name.replace(/^pale /, '')}.`,
      `Indicators are weak acids whose acid and base forms have different colors. At pH ${after.pH!.toFixed(1)}, ${s.name} is ${indicatorColor(id, after.pH!).name}.`,
      `The indicator's two forms HIn ⇌ H⁺ + In⁻ absorb at different wavelengths; the observed color is set by [In⁻]/[HIn] = Ka/[H⁺] at pH ${after.pH!.toFixed(2)}.`,
    )
  }
  if (id) {
    const s = species(id)
    return X(`${cap(s.name.replace(/ ion$/, ''))} ions are ${s.color!.name}. There are now enough of them dissolved to color the liquid.`, `${s.formula} ions absorb some colors of light and let ${s.color!.name} through. Their color now dominates the solution.`, `${s.formula}(aq) absorbs in the visible (for transition-metal ions, d–d transitions); intensity follows Beer–Lambert, A = εcl.`)
  }
  return X(`The ${beforeName} color went away: whatever was coloring the liquid has been used up, turned into something else, or the indicator is now colorless.`, `The colored species has been consumed (e.g. reacted, precipitated or displaced), or the indicator has switched to its colorless form.`, `The absorbing species' concentration fell below visibility (A ≲ 0.05), or the indicator equilibrium shifted to its colorless form.`)
}

export function whyDeposit(metal: Species, causes: Cause[]): Explanation {
  const c = causes.find((x): x is Extract<Cause, { kind: 'displace' }> => x.kind === 'displace' && x.target === metal.id)
  const pusher = c ? species(c.metal) : null
  if (!pusher) return X(`Solid ${metal.name} formed.`, `${metal.formula} was reduced to the metal.`, `${metal.formula} deposited.`)
  return X(
    `${cap(pusher.name)} is a more reactive ("pushier") metal than ${metal.name}. It gives away tiny particles called electrons to the ${metal.name} ions in the water, which turns them back into solid ${metal.name}, while the ${pusher.name} dissolves in their place.`,
    `${pusher.formula} + ${species(metal.metal!.ion).formula} → ${species(pusher.metal!.ion).formula} + ${metal.formula}. A more reactive metal displaces a less reactive one from its salt. This is a redox reaction: ${pusher.name} is oxidised, ${metal.name} ions are reduced.`,
    `E°(${species(metal.metal!.ion).formula}/${metal.formula}) = ${metal.metal!.e0} V vs E°(${species(pusher.metal!.ion).formula}/${pusher.formula}) = ${pusher.metal!.e0} V: E°cell = ${(metal.metal!.e0 - pusher.metal!.e0).toFixed(2)} V > 0, so ΔG = −nFE° < 0.`,
  )
}

export const WHY_ALKALI = (metalId: string) => whyGas('H2', [{ kind: 'alkali', metal: metalId, kJ: 0 }])

export function whyFlame(ionId: string | null): Explanation {
  if (!ionId) return X('Nothing in the sample gives off colored light in a flame.', 'Only certain metal ions (like sodium, lithium, copper) give flame colors.', 'No element present has strong visible emission lines at flame temperatures.')
  const s = species(ionId)
  return X(
    `The heat gives the electrons in ${s.name.replace(/ ion$/, '')} extra energy. When they settle back down, they give off that energy as light, always the same color for the same metal: ${s.flame!.name}.`,
    `Electrons in ${s.formula} are excited to higher energy levels by the flame, then drop back, emitting light of specific wavelengths. Each element has its own energy levels, so its own color.`,
    `Thermal excitation followed by emission at characteristic lines (E = hν = hc/λ). The observed ${s.flame!.name} corresponds to ${s.formula}'s strongest visible transitions.`,
  )
}

export function whySplint(result: 'H2' | 'O2' | 'CO2' | 'none'): Explanation {
  switch (result) {
    case 'H2': return X('Hydrogen burns extremely fast when it meets the flame, with a tiny "pop" explosion. That pop is the test for hydrogen.', 'Hydrogen mixed with air ignites: 2H₂ + O₂ → 2H₂O. The rapid combustion makes the squeaky pop.', 'A H₂/air mixture within flammability limits (4–75%) deflagrates; the pressure pulse in the tube mouth gives the "squeak".')
    case 'O2': return X('Fire needs oxygen. A glowing splint has almost gone out, but extra oxygen makes it burst into flame again. That\'s the test for oxygen.', 'Burning is a reaction with oxygen. Concentrated oxygen speeds it up enough to re-ignite a glowing splint.', 'Higher O₂ partial pressure raises the combustion rate above the threshold for flaming combustion.')
    case 'CO2': return X('Carbon dioxide doesn\'t let things burn, so it smothers the flame.', 'CO₂ doesn\'t support combustion and displaces the oxygen around the flame.', 'CO₂ is fully oxidised and dilutes O₂ below the limiting oxygen concentration.')
    case 'none': return X('There isn\'t enough of a special gas here to change how the splint burns.', 'No significant H₂, O₂ or CO₂ is collected at the mouth of the vessel.', 'Headspace composition ≈ air.')
  }
}

export const WHY_BOILING = X('At 100 °C water has enough energy to turn into steam bubbles all through the liquid. Extra heat now goes into making steam, so the temperature stops rising.', 'At the boiling point, added energy breaks the attractions between water molecules (latent heat) instead of raising the temperature.', 'Boiling occurs when vapour pressure = atmospheric pressure; ΔH_vap = 40.7 kJ mol⁻¹ is absorbed at constant T.')
export const WHY_DRY = X('All the water turned into steam. Anything that was dissolved is left behind as a solid.', 'Evaporating the solvent leaves the dissolved solute as crystals or residue.', 'With no solvent, the ions recombine into a solid residue.')
export const WHY_DECOMPOSE: Record<string, Explanation> = {
  'CuSO4.5H2O': X('The blue crystals have water trapped inside them. Heat drives the water out as steam, and without it the crystals are white.', 'Hydrated copper sulfate contains water of crystallisation; heating removes it: CuSO₄·5H₂O → CuSO₄ + 5H₂O.', 'Losing coordinated water changes the Cu²⁺ ligand field, removing the d–d absorption responsible for the blue.'),
  NaHCO3: X('Heat breaks baking soda apart into other substances, giving off carbon dioxide gas. That\'s what makes cakes rise!', '2NaHCO₃ → Na₂CO₃ + H₂O + CO₂ on heating (thermal decomposition).', 'Endothermic decomposition above ~80 °C; the CO₂ and steam leavening is entropy-driven at baking temperatures.'),
  CuCO3: X('Heat breaks the green copper carbonate into black copper oxide and carbon dioxide gas.', 'CuCO₃ → CuO + CO₂. A color change and a gas are signs a new substance formed.', 'Small, highly polarising Cu²⁺ destabilises CO₃²⁻, so decomposition occurs at ~290 °C (vs ~825 °C for CaCO₃).'),
}

export const WHY_MG_BURNS = X(
  'Magnesium reacts with oxygen from the air so fiercely that it gives off a blinding white light and a lot of heat. What\'s left is a new substance, white magnesium oxide.',
  '2Mg + O₂ → 2MgO. Combustion is a fast reaction with oxygen that releases energy as heat and light; magnesium releases so much that it glows white-hot.',
  'ΔH_f(MgO) = −601.6 kJ mol⁻¹. The flame reaches ~3100 °C, so the MgO particles glow as near-blackbody emitters across the visible spectrum (white light, rich in UV).',
)
