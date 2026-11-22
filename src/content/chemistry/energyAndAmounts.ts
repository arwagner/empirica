import { add, saw, turned, X, type ChemExperiment } from './helpers'

export const hotAndColdPacks: ChemExperiment = {
  id: 'hot-and-cold-packs',
  domain: 'chemistry',
  title: 'Hot packs and cold packs',
  summary: 'Dissolve two salts: one makes water freezing cold, the other makes it hot.',
  topics: ['energy', 'dissolving', 'calorimetry'],
  difficulty: 'intro',
  minutes: 5,
  station: 'wet-bench',
  hazards: [{ kind: 'irritant' }, { kind: 'oxidizer', note: 'Ammonium nitrate' }],
  setup: {
    vessels: [
      { id: 'cup 1', kind: 'calorimeter', contents: [{ reagent: 'water', amount: 50 }] },
      { id: 'cup 2', kind: 'calorimeter', contents: [{ reagent: 'water', amount: 50 }] },
    ],
  },
  intro: X(
    'Instant cold packs and hand warmers work by dissolving chemicals. Let\'s make both!',
    'Dissolving can absorb heat (endothermic) or release it (exothermic), depending on the balance between breaking the crystal apart and the ions bonding to water.',
    'ΔH_soln = lattice enthalpy (endothermic) + hydration enthalpy (exothermic). NH₄NO₃: +25.7 kJ mol⁻¹; CaCl₂: −82.8 kJ mol⁻¹.',
  ),
  steps: [
    { instruction: 'Add 5 g of ammonium nitrate to cup 1 and stir.', action: [add('cup 1', 'nh4no3', 5), { type: 'stir', vessel: 'cup 1' }], check: { type: 'temperature', vessel: 'cup 1', max: 15 }, observation: 'The cup gets cold: down about 7 °C.', explanation: X('This salt soaks up heat from the water when it dissolves. That\'s a cold pack!', 'Endothermic: breaking up the crystal takes more energy than the ions give back when water surrounds them.', 'q = nΔH = 0.0625 × 25.7 ≈ 1.6 kJ absorbed; ΔT ≈ −1.6 kJ / (54 g × 4.18) ≈ −7 K. It is entropy (ΔS > 0) that makes it spontaneous.') },
    { instruction: 'Add 5 g of calcium chloride to cup 2 and stir.', action: [add('cup 2', 'cacl2', 5), { type: 'stir', vessel: 'cup 2' }], check: { type: 'temperature', vessel: 'cup 2', min: 30 }, observation: 'The cup gets hot: up about 15 °C.', explanation: X('This salt gives out heat when it dissolves. That\'s a hand warmer!', 'Exothermic: the small, highly charged Ca²⁺ ion bonds very strongly to water, releasing more energy than breaking the crystal took.', 'q = 0.045 × 82.8 ≈ 3.7 kJ released → ΔT ≈ +16 K. Strong hydration of Ca²⁺ (−1577 kJ mol⁻¹) dominates.') },
  ],
  conclusion: X(
    'Some things get cold when they dissolve, others get hot. That\'s how instant cold packs and hot packs work.',
    'Whether dissolving is endothermic or exothermic depends on the energy needed to break the lattice versus the energy released by hydration.',
    'ΔG = ΔH − TΔS: endothermic dissolution happens because the entropy gain of dispersing ions outweighs the enthalpy cost.',
  ),
  variations: [
    { prompt: 'Try sodium hydroxide pellets (carefully!). Hot or cold?' },
    { prompt: 'Try potassium nitrate or sodium chloride. Which gives almost no change?' },
  ],
}

export const thermalDecomposition: ChemExperiment = {
  id: 'thermal-decomposition',
  domain: 'chemistry',
  title: 'Thermal decomposition and water of crystallization',
  summary: 'Heat breaks copper carbonate apart and drives the water out of blue copper sulfate crystals.',
  topics: ['energy', 'decomposition', 'carbonates', 'hydrates'],
  difficulty: 'core',
  minutes: 10,
  station: 'fume-hood',
  hazards: [{ kind: 'hot', note: 'Crucibles get extremely hot' }, { kind: 'toxic', note: 'Copper compounds' }],
  setup: {
    vessels: [
      { id: 'crucible 1', kind: 'crucible', contents: [{ reagent: 'cuco3', amount: 2 }] },
      { id: 'crucible 2', kind: 'crucible', contents: [{ reagent: 'cuso4-5h2o', amount: 2 }] },
    ],
  },
  intro: X(
    'Some substances break apart when heated strongly. Some crystals even hide water inside them!',
    'Thermal decomposition is breaking a compound apart using heat. Hydrated crystals contain water locked into their structure, which heating drives off.',
    'CuCO₃(s) → CuO(s) + CO₂(g) (≈ 290 °C). CuSO₄·5H₂O(s) → CuSO₄(s) + 5H₂O(g) (stepwise, complete above ~110–250 °C).',
  ),
  steps: [
    { instruction: 'Heat crucible 1 (green copper carbonate) at high power.', action: [{ type: 'heat', vessel: 'crucible 1', watts: 600 }], check: { type: 'heater', vessel: 'crucible 1', min: 300 }, observation: 'The crucible starts heating.', explanation: X('Let it get really hot.', 'Decomposition needs a lot of energy to break bonds.', 'The reaction is endothermic and has a high activation energy.') },
    { instruction: 'Wait a minute.', action: [{ type: 'wait', seconds: 60 }], check: saw('decomposed:CuCO3'), observation: 'The green powder turns black and gives off a gas.', explanation: X('Green copper carbonate broke apart into black copper oxide and carbon dioxide.', 'CuCO₃ → CuO + CO₂. A color change and a gas are signs that a new substance formed.', 'Mass loss = CO₂: 2 g CuCO₃ (16.2 mmol) loses 0.71 g. Weigh before and after to confirm.') },
    { instruction: 'Now heat crucible 2 (blue copper sulfate crystals) and wait a minute.', action: [{ type: 'heat', vessel: 'crucible 2', watts: 600 }, { type: 'wait', seconds: 60 }], check: saw('dehydrated:CuSO4.5H2O'), observation: 'The blue crystals crumble into a white powder; steam comes off.', explanation: X('The blue color came from water hidden inside the crystals. Heat drove it out.', 'The water of crystallization is removed, leaving white anhydrous copper sulfate.', 'Losing 5H₂O changes the Cu²⁺ coordination environment, so the d–d absorption (which gives the blue) disappears.') },
    { instruction: 'Turn off the heat under crucible 2 and let it cool for 10 minutes.', action: [{ type: 'heat', vessel: 'crucible 2', watts: 0 }, { type: 'wait', seconds: 600 }], check: { type: 'temperature', vessel: 'crucible 2', max: 40 }, observation: 'The crucible is back near room temperature.', explanation: X('Never add water to a red-hot crucible!', 'The crucible cools by losing heat to the air.', 'Newtonian cooling: ΔT decays exponentially with time constant C/hA.') },
    { instruction: 'Add 3 mL of water to the white powder.', action: [add('crucible 2', 'water', 3)], check: { type: 'all', checks: [turned('blue'), saw('exothermic')] }, observation: 'It turns blue again and gets hot!', explanation: X('Adding water brings the blue color back. It\'s reversible!', 'Anhydrous copper sulfate + water → hydrated copper sulfate. This is a test for water, and it\'s exothermic.', 'Rehydration releases the energy absorbed during dehydration (ΔH ≈ −78 kJ mol⁻¹ overall for CuSO₄ → CuSO₄·5H₂O).') },
  ],
  conclusion: X(
    'Heat can break substances apart. Some changes, like losing water from crystals, can be reversed by adding water back.',
    'Copper carbonate decomposes permanently into copper oxide and CO₂. Hydrated copper sulfate loses and regains its water reversibly, which is why white copper sulfate is used to test for water.',
    'Decomposition temperatures track cation polarizing power: carbonates of small, highly charged cations (Cu²⁺) decompose more easily than those of large ones (Ca²⁺ ≈ 825 °C).',
  ),
  variations: [
    { prompt: 'Heat baking soda in a crucible. What gas comes off?' },
    { prompt: 'Weigh crucible 1 with the balance before and after heating.' },
  ],
}

export const limitingReagent: ChemExperiment = {
  id: 'limiting-reagent',
  domain: 'chemistry',
  title: 'Who runs out first? Limiting reagents',
  summary: 'Use far more magnesium than the acid can handle, and measure exactly how much hydrogen you get.',
  topics: ['stoichiometry', 'gases', 'metals', 'moles'],
  difficulty: 'advanced',
  minutes: 8,
  station: 'wet-bench',
  hazards: [{ kind: 'corrosive' }, { kind: 'flammable', note: 'Hydrogen' }],
  setup: { vessels: [{ id: 'flask', kind: 'flask-250', contents: [{ reagent: 'hcl-1m', amount: 10 }] }] },
  intro: X(
    'If you make sandwiches with 10 slices of bread and 100 slices of cheese, the bread runs out first. Reactions work the same way!',
    'The limiting reagent is the reactant that gets used up first. It decides how much product you get; the other reactant is left over.',
    'Mg + 2HCl → MgCl₂ + H₂. 10 mL of 1.0 M HCl = 10 mmol H⁺ → max 5 mmol H₂ (120 mL). 0.5 g Mg = 20.6 mmol, a big excess.',
  ),
  steps: [
    { instruction: 'Add 0.5 g of magnesium ribbon (way more than needed). Watch the gas syringe.', action: [add('flask', 'mg-ribbon', 0.5)], check: { type: 'all', checks: [{ type: 'gas-evolved', vessel: 'flask', gas: 'H2', minMl: 115 }, { type: 'contains', vessel: 'flask', species: 'Mg', min: 0.01 }] }, observation: 'About 120 mL of hydrogen, then the fizzing stops, with magnesium left over.', explanation: X('The acid ran out first, so the reaction stopped even though there was still magnesium.', 'HCl is the limiting reagent: 10 mmol of acid can only make 5 mmol (120 mL) of hydrogen.', 'n(H₂) = ½·n(HCl) = 5.0 mmol; V = 5.0 mmol × 24.0 L mol⁻¹ = 120 mL. Leftover Mg = 20.6 − 5.0 = 15.6 mmol (0.38 g).') },
    { instruction: 'Add another 10 mL of 1 M hydrochloric acid.', action: [add('flask', 'hcl-1m', 10)], check: { type: 'gas-evolved', vessel: 'flask', gas: 'H2', minMl: 235 }, observation: 'It fizzes again: another ~120 mL.', explanation: X('More acid, more hydrogen: the leftover magnesium had more to react with.', 'Doubling the limiting reagent doubles the product.', 'Product yield is set by the limiting reagent: total 10 mmol H₂ = 240 mL.') },
  ],
  conclusion: X(
    'The thing that runs out first decides how much you make.',
    'To predict how much product forms, find the limiting reagent using mole ratios from the balanced equation.',
    'Theoretical yield = n(limiting) × (stoichiometric ratio). Real yields are lower due to side reactions, losses and incomplete reaction.',
  ),
  variations: [
    { prompt: 'Now use only 0.05 g of magnesium with 10 mL acid. Which is limiting?', explanation: X('The magnesium!', 'Mg runs out; acid left over.', '2.06 mmol Mg → 2.06 mmol H₂ ≈ 49 mL; pH stays low.') },
  ],
}

export const heatingCurve: ChemExperiment = {
  id: 'heating-curve-of-water',
  domain: 'chemistry',
  title: 'The heating curve of water',
  summary: 'Heat water and log the temperature. Why does it stop rising at 100 °C?',
  topics: ['energy', 'states of matter', 'boiling', 'graphs'],
  difficulty: 'intro',
  minutes: 8,
  station: 'wet-bench',
  hazards: [{ kind: 'hot', note: 'Boiling water' }],
  setup: { vessels: [{ id: 'beaker', kind: 'beaker-250', contents: [{ reagent: 'water', amount: 100 }] }] },
  intro: X(
    'What happens to water\'s temperature when you keep heating it? Let\'s find out, and log readings to make a graph!',
    'We\'ll heat water steadily and record its temperature. The graph shows something surprising at the boiling point.',
    'With constant power input P, dT/dt = P/C until a phase change, where added energy goes into latent heat (ΔH_vap = 40.7 kJ mol⁻¹) instead.',
  ),
  steps: [
    { instruction: 'Turn the heater to High.', action: [{ type: 'heat', vessel: 'beaker', watts: 600 }], check: { type: 'heater', vessel: 'beaker', min: 300 }, observation: 'The hot plate glows.', explanation: X('Energy is flowing into the water.', 'The hot plate supplies energy at a steady rate.', 'About half of the 600 W reaches the water; the rest heats the plate and the air.') },
    { instruction: 'Wait 1 minute at a time, logging the thermometer reading each time, until it passes 60 °C.', action: [{ type: 'wait', seconds: 60 }, { type: 'wait', seconds: 60 }], check: { type: 'temperature', vessel: 'beaker', min: 60 }, observation: 'The temperature climbs steadily.', explanation: X('More heat, hotter water.', 'The temperature rises at a roughly constant rate: a straight line on the graph.', 'dT/dt ≈ 300 W / 460 J K⁻¹ ≈ 0.65 K s⁻¹, slightly less as heat loss grows with ΔT.') },
    { instruction: 'Keep going: wait and log until the water boils.', action: [{ type: 'wait', seconds: 30 }], check: saw('boiling'), observation: 'It boils at 100 °C.', explanation: X('Bubbles of steam form all through the water.', 'At 100 °C the water boils: it turns into steam throughout the liquid.', 'Boiling occurs when vapour pressure equals atmospheric pressure (101.3 kPa at 100 °C).') },
    { instruction: 'Keep heating for another 2 minutes, logging readings.', action: [{ type: 'wait', seconds: 120 }], check: { type: 'all', checks: [{ type: 'temperature', vessel: 'beaker', min: 99.9 }, { type: 'volume', vessel: 'beaker', max: 90 }] }, observation: 'The temperature stays at exactly 100 °C, and the water level drops.', explanation: X('Even though we keep heating, it doesn\'t get any hotter: the heat is used to turn water into steam.', 'During boiling, the energy breaks the attractions between water molecules instead of raising the temperature. The graph goes flat.', 'Energy goes into ΔH_vap: 300 W evaporates ≈ 0.13 g s⁻¹. Check the balance reading drop.') },
  ],
  conclusion: X(
    'Water heats up until 100 °C, then stays at 100 °C while it boils. The heat goes into making steam.',
    'The flat part of a heating curve is a phase change. The energy (latent heat) separates molecules instead of making them move faster.',
    'The plateau length ∝ mass × ΔH_vap / P. The same physics gives melting plateaus. Dissolved solutes raise the boiling point (ebullioscopy).',
  ),
  variations: [
    { prompt: 'Add 10 g of salt (several portions) and repeat. Does it still boil at exactly 100 °C?' },
    { prompt: 'Open your notebook (N) and look at the temperature chart.' },
  ],
}
