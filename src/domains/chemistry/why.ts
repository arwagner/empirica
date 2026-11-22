import type { Explanation } from '../../core'
import { indicatorColor, type SolutionColor } from './appearance'
import { INDICATORS, SPECIES, species, type Species } from './species'

/**
 * "Why?" explanations. Rule of thumb: never restate the observation. Say what the particles did
 * and the reason they did it (attraction between charges, how tightly electrons are held, energy
 * released or borrowed, unstable molecules falling apart), anchored to what the learner did.
 */

/** What the engine actually did while settling a vessel: the raw material for "why". */
export type Cause =
  | { kind: 'dissolve'; species: string; kJ: number }
  | { kind: 'neutralize'; kJ: number }
  | { kind: 'catalysis'; kJ: number }
  | { kind: 'alkali'; metal: string; kJ: number }
  | { kind: 'displace'; metal: string; target: string; kJ: number }
  | { kind: 'acid-metal'; metal: string; kJ: number }
  | { kind: 'carbonate' }

/** What the learner just did, so explanations can talk about *their* experiment. */
export interface WhyContext {
  /** e.g. "silver nitrate solution" or "the liquid from beaker B" */
  added?: string
  /** Ion/particle ids the addition brought in, and ids already in the vessel before. */
  addedIds?: string[]
  priorIds?: string[]
}

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
const you = (ctx: WhyContext) => (ctx.added ? `When you added ${ctx.added}, ` : '')

const ION_WORDS: Record<string, { simple: string; formula: string }> = {
  co3: { simple: 'carbonate ions', formula: 'CO₃²⁻' },
  'OH-': { simple: 'hydroxide ions', formula: 'OH⁻' },
  nh3: { simple: 'ammonium ions', formula: 'NH₄⁺' },
  ac: { simple: 'acetate ions', formula: 'CH₃COO⁻' },
}
function ion(id: string) {
  if (ION_WORDS[id]) return ION_WORDS[id]
  const s = SPECIES[id]
  return { simple: `${s.name.replace(/ ion$/, '')} ions`, formula: s.formula }
}
const partners = (s: Species) => Object.keys(s.ions ?? {}).filter((i) => i !== 'H2O' && i !== 'H+')
const sci = (x: number) => x.toExponential(1).replace(/e([+-])(\d+)/, (_, sign, d) => `×10${sign === '-' ? '⁻' : ''}${[...d].map((c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('')}`)
const charge = (id: string) => (id === 'OH-' || id === 'co3' || id === 'ac' ? -1 : SPECIES[id]?.charge ?? (id === 'nh3' ? 1 : 0))

// ---------- precipitation ----------

export function whyPrecipitate(s: Species, ctx: WhyContext = {}): Explanation {
  const ids = partners(s)
  // Which ion came in with what was just added, and which was already waiting in the beaker?
  const brought = ids.find((i) => ctx.addedIds?.includes(i) && !ctx.priorIds?.includes(i)) ?? ids[0]
  const waiting = ids.find((i) => i !== brought) ?? ids[1]
  const a = ion(brought)
  const b = ion(waiting)
  const pos = charge(brought) > 0 ? a : b
  const neg = charge(brought) > 0 ? b : a
  const eq = `${ids.map((i) => ion(i).formula).join(' + ')} → ${s.formula}(s)`
  const story = ctx.added
    ? `When you added ${ctx.added}, it brought ${a.simple} into a beaker that already had ${b.simple} floating in it.`
    : `${cap(a.simple)} and ${b.simple} ended up in the same liquid.`
  return X(
    `${story} ${cap(pos.simple)} are positively charged and ${neg.simple} are negatively charged, and opposite charges attract. Water usually keeps ions apart by surrounding each one, but these two pull on each other so strongly that the water can't hold them apart. They lock together into ${s.name}, and millions of those pairs pile up into specks big enough to see: the cloud.`,
    `${story} Dissolved ions stay apart only because water molecules cling to each one (hydration). For ${pos.formula} and ${neg.formula}, the attraction to each other in a solid crystal is stronger than water's grip, so the solid is the more stable arrangement and it precipitates: ${eq}. Ions that don't form such a solid (spectator ions) just stay dissolved.`,
    `${eq}. Precipitation is favoured when the lattice energy of ${s.formula} outweighs the hydration enthalpies of its ions (ΔG_soln > 0). Quantitatively, solid forms while the ion product Q exceeds Ksp = ${sci(s.ksp ?? 0)}, and stops when Q = Ksp.`,
  )
}

// ---------- dissolving ----------

export function whyDissolved(s: Species): Explanation {
  const ids = partners(s)
  if (s.metal) {
    const m = s.metal
    return X(
      `Every atom of ${s.name} gave away electrons and became a charged ion, and ions dissolve in water. Once all the atoms had done that, there was no solid metal left.`,
      `The ${s.name} was oxidised: each atom lost ${m.n} electron${m.n > 1 ? 's' : ''} and became a ${species(m.ion).formula} ion, which water surrounds and carries off into solution.`,
      `${s.formula}(s) → ${species(m.ion).formula}(aq) + ${m.n}e⁻ continued until the metal was consumed (the electron acceptor was in excess).`,
    )
  }
  if (s.ksp !== undefined && ids.includes('co3'))
    return X(
      `${cap(s.name)} won't dissolve in plain water, but acids are full of hydrogen ions. They grab the carbonate part of the solid, turning it into carbonic acid, which falls apart into water and carbon dioxide gas. With its carbonate stolen, the rest of the solid breaks loose into the liquid, bit by bit, until it's all gone.`,
      `Acid removes carbonate as it forms: CO₃²⁻ + 2H⁺ → H₂CO₃ → H₂O + CO₂(g). Because the carbonate keeps being taken away, the solid can never reach saturation, so it keeps dissolving (Le Chatelier).`,
      `Protonation keeps [CO₃²⁻] far below Ksp/[M²⁺]; CO₂ outgassing makes the process irreversible in an open vessel.`,
    )
  if (s.ksp !== undefined && ids.includes('OH-'))
    return X(
      `The solid is made of metal ions locked together with hydroxide ions. The acid's hydrogen ions grab those hydroxide ions to make water, which frees the metal ions to dissolve.`,
      `H⁺ + OH⁻ → H₂O removes the hydroxide holding the solid together, so the metal ions go into solution.`,
      `Lowering pH drops [OH⁻] so Q < Ksp; the solid dissolves to restore equilibrium.`,
    )
  return X(
    `Water molecules are lopsided: one end is slightly positive, the other slightly negative. They crowd around the ${s.name} crystal, and their charged ends tug on its ions until each one pulls free and drifts off, wrapped in water. The solid hasn't vanished: it's been taken apart into pieces far too small to see.`,
    `Water is polar. Its slightly negative oxygen ends attract the positive ions, and its slightly positive hydrogen ends attract the negative ions. When that combined pull beats the attraction holding the crystal together, the ions${ids.length ? ` (${ids.map((i) => ion(i).formula).join(', ')})` : ''} separate and become hydrated.`,
    `Dissolution proceeds while ΔG = ΔH_soln − TΔS_soln < 0: lattice enthalpy is paid back by hydration enthalpy, and dispersing the ions raises entropy.`,
  )
}

// ---------- gases ----------

export function whyGas(gas: string, causes: Cause[]): Explanation {
  const metal = causes.find((c) => c.kind === 'acid-metal' || c.kind === 'alkali') as { metal: string; kind: string } | undefined
  if (gas === 'H2' && metal) {
    const m = species(metal.metal)
    if (metal.kind === 'alkali')
      return X(
        `A ${m.name} atom has one electron on the outside that it holds very loosely, so it hands it to the first water molecule it touches. That breaks the water molecule: the hydrogen part becomes hydrogen gas and bubbles away, and the rest becomes hydroxide, which makes the water alkaline. Giving up that electron releases a lot of energy, which is why it gets so hot.`,
        `${m.formula} loses its single outer electron very easily (low ionisation energy). Water accepts it: 2H₂O + 2e⁻ → H₂ + 2OH⁻. Overall 2${m.formula} + 2H₂O → 2${m.formula}OH + H₂, strongly exothermic.`,
        `First ionisation energy of ${m.formula} is low, and E°(${species(m.metal!.ion).formula}/${m.formula}) = ${m.metal!.e0} V, so reduction of water is fast and ΔG ≪ 0; heat release rate is high enough to melt/ignite.`,
      )
    return X(
      `Metal atoms hold their outer electrons quite loosely, and the acid is full of hydrogen ions, which are each missing an electron. When they touch, ${m.name} gives electrons to the hydrogen ions. Each hydrogen that gets an electron pairs up with another into a hydrogen molecule, a gas, so it bubbles out. The ${m.name} atoms that lost electrons become ions and dissolve. Metals that grip their electrons tightly, like copper, don't hand them over, so nothing happens with them.`,
      `Redox: ${m.formula} → ${species(m.metal!.ion).formula} + ${m.metal!.n}e⁻ (oxidised), 2H⁺ + 2e⁻ → H₂ (reduced). It happens because ${m.name} holds its electrons less tightly than hydrogen does; that's what being "above hydrogen in the reactivity series" means.`,
      `E°(${species(m.metal!.ion).formula}/${m.formula}) = ${m.metal!.e0} V < E°(H⁺/H₂) = 0 V, so E°cell > 0 and ΔG = −nFE° < 0. Cu (+0.34 V) has E°cell < 0 and doesn't react.`,
    )
  }
  if (gas === 'O2')
    return X(
      `Hydrogen peroxide molecules are unstable: each one would rather be water plus oxygen. But they need a "push" to start breaking apart, so on their own they fall apart very slowly. The surface of the black manganese dioxide gives them an easy route, so millions break apart at once and the oxygen bubbles out. The powder itself doesn't get used up: it's just a helper (a catalyst).`,
      `2H₂O₂ → 2H₂O + O₂ is energetically downhill but has a high activation energy. MnO₂ provides a surface pathway with a much lower activation energy, so the rate shoots up. A catalyst changes the speed, not the products, and is left unchanged.`,
      `MnO₂ lowers Ea (surface redox cycling Mn(IV)/Mn(II)), increasing k by orders of magnitude (Arrhenius); ΔH = −98.2 kJ mol⁻¹ and the equilibrium are unaffected.`,
    )
  if (gas === 'CO2')
    return X(
      `Acids are full of hydrogen ions. A carbonate ion grabs two of them and turns into carbonic acid, a molecule so unstable that it immediately falls apart into water and carbon dioxide. Carbon dioxide doesn't dissolve well in water, so it escapes as bubbles. It's the same thing that happens in fizzy drinks.`,
      `CO₃²⁻ + 2H⁺ → H₂CO₃ → H₂O + CO₂. Carbonic acid decomposes almost instantly, and CO₂'s low solubility means it leaves the solution as gas, which pulls the reaction forward.`,
      `Protonation gives H₂CO₃* whose concentration exceeds CO₂'s solubility (Henry's law), so CO₂ nucleates bubbles and outgasses, irreversibly in an open vessel.`,
    )
  return X(`A reaction produced ${gas} gas, which doesn't dissolve well, so it bubbled out.`, `${gas} evolved.`, `${gas} evolved.`)
}

// ---------- heat ----------

export function whyHeat(dT: number, causes: Cause[], ctx: WhyContext = {}): Explanation {
  const heats = causes.filter((c): c is Extract<Cause, { kJ: number }> => 'kJ' in c && Math.abs(c.kJ) > 1e-4)
  const main = heats.sort((a, b) => Math.abs(b.kJ) - Math.abs(a.kJ))[0]
  const hot = dT > 0
  if (main?.kind === 'neutralize')
    return X(
      `${you(ctx)}acid met base. Acids are full of hydrogen ions (H⁺) and bases are full of hydroxide ions (OH⁻), and the two attract each other strongly. When they snap together into water molecules, the energy of that attraction is released, a bit like two magnets clacking together. That energy comes out as heat and warms the liquid.`,
      `H⁺ + OH⁻ → H₂O. Forming the new O–H bond releases more energy than it costs to pull the ions away from the water around them, so the reaction is exothermic: about 57 kJ for every mole of water made, whichever strong acid and base you use.`,
      `ΔH_neut ≈ −57.1 kJ mol⁻¹ (the reverse of water's autoionisation, ΔH = +55.8). Here ≈ ${Math.abs(main.kJ).toFixed(2)} kJ went into the solution: ΔT = q/(mc).`,
    )
  if (main?.kind === 'dissolve') {
    const s = species(main.species)
    return hot
      ? X(
          `Two things happen when ${s.name} dissolves. Pulling its crystal apart costs energy. Then water molecules crowd around each separated ion and cling to it, and that gives energy back. For ${s.name}, the clinging gives back more than the pulling apart cost, so there's energy left over, and it comes out as heat.`,
          `Dissolving = breaking the lattice (costs energy) + hydrating the ions (releases energy). For ${s.formula} hydration wins, so ΔH_soln < 0 and the solution warms up. Small or highly charged ions attract water strongly, which tends to make dissolving exothermic.`,
          `ΔH_soln(${s.formula}) = ${s.dissolveKJ} kJ mol⁻¹ = ΔH_lattice (endothermic) + ΣΔH_hydration (exothermic, larger in magnitude here).`,
        )
      : X(
          `Two things happen when ${s.name} dissolves. Pulling its crystal apart costs energy, and water clinging to the separated ions gives some back, but for ${s.name} not enough. The missing energy gets borrowed from the water's own heat, so the water gets colder. It dissolves anyway because ions spread out through the water is a far more likely arrangement than ions packed in a crystal.`,
          `For ${s.formula}, breaking the lattice costs more than hydration returns, so ΔH_soln > 0: the energy is taken from the surroundings. It's still spontaneous because the entropy gain of dispersing the ions outweighs the enthalpy cost.`,
          `ΔH_soln(${s.formula}) = +${s.dissolveKJ} kJ mol⁻¹, but ΔG = ΔH − TΔS < 0 because ΔS_soln ≫ 0. This is how instant cold packs work.`,
        )
  }
  if (main?.kind === 'displace' || main?.kind === 'acid-metal' || main?.kind === 'alkali' || main?.kind === 'catalysis')
    return X(
      hot
        ? 'In the reaction, atoms swapped partners. The new arrangement holds its atoms and electrons together more tightly than the old one did, and the difference in energy is released as heat.'
        : 'This process needed more energy than it released, so it took heat from the liquid.',
      hot
        ? 'The products sit at a lower chemical energy than the reactants (stronger bonding, or electrons held more tightly). That energy difference, ΔH, is released into the solution as heat: an exothermic reaction.'
        : 'The products have more chemical energy than the reactants: an endothermic process draws heat from the surroundings.',
      `ΔH ≈ ${main.kJ.toFixed(2)} kJ for these amounts; ΔT = −ΔH/C_total.`,
    )
  return X(hot ? 'You mixed in something warmer, and the heat spread out evenly.' : 'You mixed in something colder, and the heat spread out evenly.', 'Mixing liquids at different temperatures shares their heat until they reach one temperature.', 'T_final = Σ(C_i T_i)/ΣC_i.')
}

// ---------- color ----------

export function whyColor(after: SolutionColor, beforeName: string, causes: Cause[] = [], ctx: WhyContext = {}): Explanation {
  const id = after.dominant
  const ph = after.pH ?? 7
  const acidity = ph < 6.5 ? 'acidic' : ph > 7.5 ? 'alkaline' : 'neutral'
  if (id && INDICATORS.includes(id)) {
    const s = species(id)
    const shift = ctx.added ? `${you(ctx)}you made the liquid ${acidity}. ` : `The liquid is now ${acidity}. `
    return X(
      `${shift}${cap(s.name)} is a dye whose molecules change shape when they gain or lose hydrogen ions. In ${acidity} liquid they're in the shape that reflects ${indicatorColor(id, ph).name} light, so that's the color you see.`,
      `${shift}Indicators are weak acids: HIn ⇌ H⁺ + In⁻, and the two forms are different colors. Changing the hydrogen-ion concentration shifts which form dominates. At pH ${ph.toFixed(1)}, ${s.name} shows ${indicatorColor(id, ph).name}.`,
      `[In⁻]/[HIn] = Ka/[H⁺]; at pH ${ph.toFixed(2)} the dominant form's absorption band sets the observed color (conjugation changes on (de)protonation shift λmax).`,
    )
  }
  if (id) {
    const s = species(id)
    return X(
      `${ctx.added ? `${cap(ctx.added)} brought ${s.name.replace(/ ion$/, '')} ions into the liquid. ` : ''}These ions soak up some of the colors in white light, and the colors they don't soak up bounce back to your eye. For ${s.name.replace(/ ion$/, '')} ions what's left looks ${s.color!.name}.`,
      `${s.formula} absorbs certain wavelengths of visible light (in transition-metal ions, by electrons jumping between d-orbitals). You see the complementary color: ${s.color!.name}. The more ions, the deeper the color.`,
      `Absorption by ${s.formula}(aq) (d–d or charge-transfer bands) follows Beer–Lambert, A = εcl; perceived hue is complementary to λmax.`,
    )
  }
  // Became colorless: say what took the color away.
  const displaced = causes.find((c): c is Extract<Cause, { kind: 'displace' }> => c.kind === 'displace')
  if (displaced) {
    const lost = species(species(displaced.target).metal!.ion)
    const gained = species(species(displaced.metal).metal!.ion)
    return X(
      `The ${beforeName} color came from ${lost.name.replace(/ ion$/, '')} ions in the water. The ${species(displaced.metal).name} turned them into solid ${species(displaced.target).name} metal, and the ${gained.name.replace(/ ion$/, '')} ions that took their place have no color, so the color faded away.`,
      `${lost.formula} was colored; it was reduced to ${species(displaced.target).formula} metal and replaced by ${gained.formula}, which absorbs no visible light.`,
      `[${lost.formula}] → 0 via displacement; ${gained.formula} (d¹⁰ or no d-electrons) has no d–d transitions in the visible.`,
    )
  }
  return X(
    `The ${beforeName} color faded because whatever was causing it is gone: the colored particles were used up in a reaction or locked into a solid, or an indicator dye switched to its colorless shape.`,
    `The colored species was consumed (reacted or precipitated), or the indicator shifted to its colorless form at the new pH (${ph.toFixed(1)}).`,
    `Absorbance fell below visibility (A ≲ 0.05).`,
  )
}

// ---------- metals ----------

export function whyDeposit(metal: Species, causes: Cause[]): Explanation {
  const c = causes.find((x): x is Extract<Cause, { kind: 'displace' }> => x.kind === 'displace' && x.target === metal.id)
  const pusher = c ? species(c.metal) : null
  if (!pusher) return X(`${cap(metal.name)} ions picked up electrons and turned back into solid metal.`, `${metal.formula} ions were reduced to the metal.`, `${metal.formula} deposited.`)
  const tIon = species(metal.metal!.ion)
  const pIon = species(pusher.metal!.ion)
  return X(
    `${cap(pusher.name)} atoms hold on to their outer electrons less tightly than ${metal.name} atoms do. So when the ${pusher.name} touched the ${tIon.name.replace(/ ion$/, '')} ions in the water, electrons jumped from the ${pusher.name} to the ${metal.name}. Getting electrons back turns ${metal.name} ions into solid ${metal.name} metal, which coats the ${pusher.name}, while the ${pusher.name} atoms that lost electrons become ions and dissolve.`,
    `${pusher.formula} + ${tIon.formula} → ${pIon.formula} + ${metal.formula}. Electrons flow from the metal that holds them less tightly (${pusher.name}) to the ions of the metal that holds them more tightly (${metal.name}). That's what "more reactive" means in the reactivity series.`,
    `E°(${tIon.formula}/${metal.formula}) = ${metal.metal!.e0} V > E°(${pIon.formula}/${pusher.formula}) = ${pusher.metal!.e0} V, so E°cell = ${(metal.metal!.e0 - pusher.metal!.e0).toFixed(2)} V and ΔG = −nFE° < 0; ΔH ≈ −nFE° heats the solution.`,
  )
}

export const WHY_ALKALI = (metalId: string) => whyGas('H2', [{ kind: 'alkali', metal: metalId, kJ: 0 }])

// ---------- tests & physical changes ----------

export function whyFlame(ionId: string | null): Explanation {
  if (!ionId) return X('Flame colors come from metal atoms giving off light. Nothing in this sample does that strongly enough to see over the burner\'s blue flame.', 'Only some metal ions (lithium, sodium, potassium, calcium, copper…) emit strongly in the visible at flame temperatures.', 'No species present has intense visible emission lines at ~1500 °C.')
  const s = species(ionId)
  const el = s.name.replace(/ ion$/, '')
  return X(
    `The flame's heat kicks the electrons in the ${el} atoms up to higher energy levels. They can't stay there, so they drop back down, and each drop releases a little burst of light. Electrons in ${el} can only sit at certain heights, so the drops are always the same size, and the light is always the same color: ${s.flame!.name}. Every metal has its own set of steps, so its own color.`,
    `Electrons in ${s.formula} are thermally excited, then relax, emitting photons whose energy equals the gap between levels. Because each element's energy levels are fixed and unique, the emitted colors identify it.`,
    `Thermal excitation followed by emission at characteristic lines, E = hν = hc/λ; the ${s.flame!.name} is dominated by ${s.formula}'s strongest visible transitions.`,
  )
}

export function whySplint(result: 'H2' | 'O2' | 'CO2' | 'none'): Explanation {
  switch (result) {
    case 'H2': return X('Hydrogen gas mixed with air burns incredibly fast once a flame touches it. The whole little pocket of gas at the mouth of the tube burns in an instant, a tiny explosion, and that\'s the "pop" you hear. Nothing else common makes that sound, so it\'s the test for hydrogen.', '2H₂ + O₂ → 2H₂O is extremely fast once ignited, so a hydrogen–air pocket burns almost all at once; the sudden expansion makes the squeaky pop.', 'H₂/air within its flammability limits (4–75 %) deflagrates with a high flame speed; the pressure pulse at the tube mouth gives the squeak.')
    case 'O2': return X('Burning is a reaction with oxygen. A glowing splint is still hot but doesn\'t have enough oxygen around it to flame. Put it in nearly pure oxygen and the reaction speeds up so much that it bursts back into flame. That\'s the test for oxygen.', 'Combustion rate depends on how much oxygen reaches the fuel. Concentrated O₂ pushes the smouldering wood back above the point where it can sustain a flame.', 'Higher p(O₂) increases the surface combustion rate until heat release exceeds losses and flaming combustion resumes.')
    case 'CO2': return X('Fire needs oxygen. Carbon dioxide is heavier than air and doesn\'t burn, so it pushes the oxygen away from the flame and smothers it. That\'s why some fire extinguishers are full of it.', 'CO₂ is already fully oxidised (it can\'t burn) and displaces the oxygen around the flame, so combustion stops.', 'Dilution below the limiting oxygen concentration (~15 % O₂) quenches the flame.')
    case 'none': return X('There isn\'t enough hydrogen, oxygen or carbon dioxide at the mouth of the vessel to change how the splint burns. If a gas was made, it has drifted away or wasn\'t made here.', 'No significant H₂, O₂ or CO₂ is in the headspace: test straight after a reaction, before the gas escapes.', 'Headspace composition ≈ air.')
  }
}

export const WHY_BOILING = X('Heat makes water molecules move faster. At 100 °C some are moving fast enough to break away from their neighbours inside the liquid and form bubbles of steam. From then on, extra heat goes into breaking molecules free rather than speeding them up, so the temperature stops rising.', 'At the boiling point, added energy is used to overcome the attractions between water molecules (latent heat of vaporisation) instead of raising their kinetic energy, so the temperature stays constant.', 'Boiling begins when the vapour pressure equals atmospheric pressure; ΔH_vap = 40.7 kJ mol⁻¹ is absorbed at constant T.')
export const WHY_DRY = X('Water molecules escaped as steam one by one until none were left. The dissolved substances can\'t evaporate, so they stay behind and pack back together into solid crystals.', 'Only the solvent evaporates; once it\'s gone, the ions have nothing to keep them apart and re-form a solid lattice.', 'Solute non-volatility; supersaturation as V → 0 drives crystallisation.')
export const WHY_DECOMPOSE: Record<string, Explanation> = {
  'CuSO4.5H2O': X('Blue copper sulfate crystals have water molecules built into them, snuggled around each copper ion. That arrangement is what makes them blue. Heat shakes the water loose and drives it off as steam, and copper sulfate without its water is white.', 'The Cu²⁺ ions in the crystal are surrounded by water molecules (water of crystallisation). Heating removes them: CuSO₄·5H₂O → CuSO₄ + 5H₂O. The water molecules around Cu²⁺ are what cause its blue color, so losing them turns it white.', 'Dehydration removes aqua ligands; the change in ligand field around Cu²⁺ shifts the d–d absorption out of the visible, so the solid appears white.'),
  NaHCO3: X('Heat makes the baking soda molecules shake so hard they break apart into new substances, including carbon dioxide gas. Those gas bubbles are what make cakes rise.', '2NaHCO₃ → Na₂CO₃ + H₂O + CO₂. Above about 80 °C the hydrogen carbonate ion breaks up (thermal decomposition), releasing CO₂ and steam.', 'Endothermic decomposition, driven at baking temperatures by the large entropy gain of releasing two gases.'),
  CuCO3: X('Heat makes the copper carbonate fall apart: the carbonate part breaks off as carbon dioxide gas, leaving black copper oxide behind. The color change tells you it\'s a brand-new substance.', 'CuCO₃ → CuO + CO₂. The small, highly charged Cu²⁺ ion pulls on the carbonate ion\'s electrons, weakening it so it breaks up at a fairly low temperature (~290 °C).', 'Cu²⁺ polarises CO₃²⁻, lowering the decomposition temperature (vs ~825 °C for CaCO₃, whose larger cation polarises less).'),
}

export const WHY_MG_BURNS = X(
  'Magnesium atoms let go of their electrons to oxygen very eagerly, so once the flame gets it started the reaction runs away, releasing so much energy that the metal glows white-hot. What\'s left is a new substance, white magnesium oxide.',
  '2Mg + O₂ → 2MgO. Combustion is a fast reaction with oxygen. Magnesium oxide is extremely stable, so a huge amount of energy is released as heat and light.',
  'ΔH_f(MgO) = −601.6 kJ mol⁻¹. The flame reaches ~3100 °C, so MgO particles glow as near-blackbody emitters across the visible (white light, rich in UV).',
)
