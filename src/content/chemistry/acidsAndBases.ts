import { add, turned, X, type ChemExperiment } from './helpers'

export const titration: ChemExperiment = {
  id: 'acid-base-titration',
  domain: 'chemistry',
  title: 'Acid–base titration',
  summary: 'Neutralize hydrochloric acid with sodium hydroxide and catch the exact moment it tips over.',
  topics: ['acids', 'bases', 'neutralization', 'indicators'],
  difficulty: 'core',
  minutes: 10,
  station: 'wet-bench',
  hazards: [{ kind: 'irritant', note: 'Dilute acid and alkali: goggles on' }],
  setup: { vessels: [{ id: 'flask', kind: 'flask-250', contents: [{ reagent: 'hcl-0.1m', amount: 25 }] }] },
  intro: X(
    'Acids (like lemon juice or vinegar) and bases (like soap or baking soda) are opposites: mixed together, they cancel each other out. We will add a base to an acid bit by bit until they are perfectly balanced, and a dye called an indicator will change color to tell us when.',
    'A titration measures exactly how much base neutralizes a known amount of acid. An indicator changes color at the end point, when acid and base are in balance.',
    'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l). With equal concentrations (0.100 M), the equivalence point is at equal volumes. The pH jumps several units around it, so phenolphthalein (transition ≈ 8.2–10) marks it sharply.',
  ),
  steps: [
    {
      instruction: 'Add 3 drops of phenolphthalein indicator to the acid in the flask.',
      action: [add('flask', 'phenolphthalein', 3)],
      check: { type: 'contains', vessel: 'flask', species: 'phenolphthalein', min: 1e-7 },
      observation: 'Nothing visible happens: the acid stays colorless.',
      explanation: X(
        'Phenolphthalein is a color spy. It stays invisible in acid and turns pink once there is more base than acid.',
        'Phenolphthalein is colorless below about pH 8.2 and pink above it. In acid it stays colorless.',
        'Phenolphthalein is a weak acid (HIn) whose deprotonated form In²⁻ absorbs green light (appearing pink). It changes over pH ≈ 8.2–10.',
      ),
    },
    {
      instruction: 'Add 20 mL of 0.1 M sodium hydroxide. Swirl. (Check the pH meter.)',
      action: [add('flask', 'naoh-0.1m', 20)],
      check: { type: 'ph', vessel: 'flask', min: 1.5, max: 3 },
      observation: 'Still colorless. The pH has risen from 1 to about 2.',
      explanation: X(
        'Most of the acid has been cancelled, but there is still some left, so no pink yet.',
        '20 of the 25 mL of acid are neutralized. The excess acid keeps the pH low.',
        '2.00 mmol OH⁻ consumed 2.00 of 2.50 mmol H⁺. [H⁺] = 0.50 mmol / 45 mL ≈ 0.011 M → pH ≈ 1.95. pH is logarithmic, so it barely moves until the very end.',
      ),
    },
    {
      instruction: 'Add 4.9 mL more sodium hydroxide, carefully.',
      action: [add('flask', 'naoh-0.1m', 4.9)],
      check: { type: 'ph', vessel: 'flask', min: 3.3, max: 5 },
      observation: 'Still colorless, but you are very close now.',
      explanation: X(
        'Only a tiny bit of acid is left: we are on the edge.',
        'Just 0.1 mL of acid remains unneutralized. The pH is still acidic, but only just.',
        '0.01 mmol H⁺ in 50 mL → pH ≈ 3.7. The next 0.2 mL crosses equivalence, jumping the pH by about 6–7 units.',
      ),
    },
    {
      instruction: 'Add one more 0.1 mL portion of sodium hydroxide, then another, until the solution turns pink.',
      action: [add('flask', 'naoh-0.1m', 0.1), add('flask', 'naoh-0.1m', 0.1)],
      check: turned('pink'),
      observation: 'The whole flask suddenly turns pink!',
      explanation: X(
        'The acid is all used up and a tiny bit of extra base turns the indicator pink. That is the end point.',
        'At the end point all the acid has reacted. One extra drop of base raises the pH above 8.2 and the indicator turns pink. About 25 mL of base was needed, equal to the acid.',
        'A 0.01 mmol excess of OH⁻ in ~50 mL gives [OH⁻] ≈ 2×10⁻⁴ M, pH ≈ 10.3. The steep jump means the end-point error is ≲0.1 mL, i.e. <0.5% in the measured concentration.',
      ),
    },
  ],
  conclusion: X(
    'It took the same amount of base as acid to balance them, because they were the same strength. The pink color told us the exact moment.',
    'At the equivalence point, moles of NaOH added = moles of HCl present: 0.1 M × 25 mL = 2.5 mmol. If you didn\'t know the acid\'s concentration, this volume would let you calculate it.',
    'c(HCl) = c(NaOH)·V(NaOH)/V(HCl). The sharp pH jump at equivalence is typical of a strong acid with a strong base. With a weak acid, the curve starts higher, has a buffer region and the equivalence pH is > 7.',
  ),
  variations: [
    { prompt: 'Repeat with 0.1 M acetic acid. Does the end point need the same volume?', explanation: X('Yes!', 'Same moles, same volume, but the pH starts higher.', 'Equivalence is stoichiometric; only the curve shape differs (pH at equivalence ≈ 8.7).') },
    { prompt: 'Log pH meter readings after every addition and look at the chart in your notebook.' },
    { prompt: 'Try methyl orange instead of phenolphthalein. Where does it change color?' },
  ],
}

export const neutralizationEnergy: ChemExperiment = {
  id: 'heat-of-neutralization',
  domain: 'chemistry',
  title: 'The heat of neutralization',
  summary: 'Mix acid and alkali in an insulated cup and measure the temperature rise.',
  topics: ['energy', 'neutralization', 'calorimetry'],
  difficulty: 'core',
  minutes: 5,
  station: 'wet-bench',
  hazards: [{ kind: 'corrosive', note: '1 M acid and alkali' }],
  setup: { vessels: [{ id: 'cup', kind: 'calorimeter', contents: [{ reagent: 'hcl-1m', amount: 50 }] }] },
  intro: X(
    'When an acid and a base cancel out, they give off heat. Let\'s measure how much warmer it gets.',
    'Neutralization is exothermic. A polystyrene cup keeps the heat in so we can measure the temperature change accurately.',
    'H⁺(aq) + OH⁻(aq) → H₂O(l), ΔH ≈ −57 kJ mol⁻¹. A calorimeter with negligible heat capacity lets us find ΔH from q = mcΔT.',
  ),
  steps: [
    {
      instruction: 'Note the starting temperature, then add 50 mL of 1 M sodium hydroxide to the cup.',
      action: [add('cup', 'naoh-1m', 50)],
      check: { type: 'temperature', vessel: 'cup', min: 25 },
      observation: 'The temperature jumps by almost 7 °C.',
      explanation: X(
        'Making water from acid and base releases energy, which warms up the liquid.',
        'Forming new bonds in water releases more energy than it takes to separate the ions, so the surroundings (the solution) warm up.',
        'n = 0.050 mol; q = nΔH ≈ 2.86 kJ. With 100 g of solution, c = 4.18 J g⁻¹ K⁻¹: ΔT = q/mc ≈ 6.8 K.',
      ),
    },
  ],
  conclusion: X(
    'Neutralization makes heat. More acid and base means more heat.',
    'The temperature rise lets us calculate the energy released per mole of water formed: about 57 kJ.',
    'ΔH_neut = −mcΔT/n ≈ −(100 g)(4.18)(6.8)/0.050 ≈ −57 kJ mol⁻¹, essentially the same for any strong acid + strong base, because the net reaction is always H⁺ + OH⁻.',
  ),
  variations: [
    { prompt: 'Use 0.1 M solutions instead. How big is the rise now?', explanation: X('Ten times smaller.', 'ΔT scales with concentration.', 'n drops 10×, m is unchanged → ΔT ≈ 0.68 K.') },
    { prompt: 'Try the same thing in a glass beaker. Why is the rise smaller?' },
  ],
}

export const bufferChallenge: ChemExperiment = {
  id: 'buffer-challenge',
  domain: 'chemistry',
  title: 'The buffer challenge',
  summary: 'Add the same acid to pure water and to a buffer, and compare what happens to the pH.',
  topics: ['acids', 'bases', 'buffers', 'equilibrium'],
  difficulty: 'advanced',
  minutes: 8,
  station: 'wet-bench',
  hazards: [{ kind: 'irritant' }],
  setup: {
    vessels: [
      { id: 'beaker A', kind: 'beaker-100', contents: [{ reagent: 'water', amount: 50 }] },
      { id: 'beaker B', kind: 'beaker-100', contents: [{ reagent: 'acetic-1m', amount: 25 }, { reagent: 'naac-1m', amount: 25 }] },
    ],
  },
  intro: X(
    'Some liquids refuse to change how acidic they are, even when you add acid to them. They\'re called buffers. Your blood is one! We\'ll compare plain water with a buffer (a mix of vinegar\'s acid and a partner chemical that soaks up extra acid).',
    'A buffer is a mix of a weak acid and its partner base. It soaks up added acid or base, so the pH hardly changes. Beaker A is water, beaker B an acetic acid/acetate buffer.',
    'An HA/A⁻ buffer obeys Henderson–Hasselbalch: pH = pKa + log([A⁻]/[HA]). With equal amounts, pH = pKa(acetic) = 4.74, and small additions shift the ratio only slightly.',
  ),
  steps: [
    {
      instruction: 'Check both pH readings, then add 1 mL of 1 M hydrochloric acid to beaker A (water).',
      action: [add('beaker A', 'hcl-1m', 1)],
      check: { type: 'ph', vessel: 'beaker A', max: 3 },
      observation: 'The water\'s pH crashes from 7 to below 2.',
      explanation: X(
        'Plain water has nothing to stop the acid, so it becomes very acidic.',
        'Water can\'t neutralize the added H⁺ ions, so the pH falls by more than 5 units.',
        '1 mmol H⁺ / 51 mL → [H⁺] ≈ 0.020 M, pH ≈ 1.7. A 10⁵-fold change in [H⁺].',
      ),
    },
    {
      instruction: 'Now add 1 mL of the same acid to beaker B (the buffer).',
      action: [add('beaker B', 'hcl-1m', 1)],
      // Any hydrochloric acid counts: the point is that acid went in and the pH held.
      check: { type: 'all', checks: [{ type: 'contains', vessel: 'beaker B', species: 'Cl-', min: 0.00005 }, { type: 'ph', vessel: 'beaker B', min: 4.5 }] },
      observation: 'The buffer\'s pH barely moves: about 4.74 → 4.70.',
      explanation: X(
        'The buffer grabbed the acid before it could change anything.',
        'Acetate ions react with the added H⁺ to make acetic acid, a weak acid that barely ionizes, so the pH stays nearly the same.',
        'A⁻ + H⁺ → HA. The ratio goes from 25/25 to 24/26: ΔpH = log(24/26) ≈ −0.035.',
      ),
    },
    {
      instruction: 'Challenge it the other way: add 2 mL of 1 M sodium hydroxide to beaker B.',
      action: [add('beaker B', 'naoh-1m', 2)],
      check: { type: 'ph', vessel: 'beaker B', min: 4.75, max: 5.0 },
      observation: 'Still around 4.7–4.8. The buffer holds.',
      explanation: X(
        'The buffer also soaks up base. It works both ways.',
        'Now the acetic acid neutralizes the added OH⁻, making more acetate. The ratio changes only a little.',
        'HA + OH⁻ → A⁻ + H₂O. Ratio 26/24, pH ≈ 4.78. Buffer capacity is greatest when [HA] ≈ [A⁻].',
      ),
    },
  ],
  conclusion: X(
    'Buffers keep acidity steady. That\'s why your blood stays at the same pH even when you eat sour food.',
    'A buffer has a weak acid to neutralize bases and its partner base to neutralize acids. Blood uses a carbonic acid/bicarbonate buffer to stay at pH 7.4.',
    'Buffer capacity β = dn/dpH peaks at pH = pKa and scales with total concentration. Beyond capacity (adding more than ~25 mmol here), the pH swings just like water\'s.',
  ),
  variations: [
    { prompt: 'Keep adding 5 mL portions of acid to the buffer. When does it give up?' },
    { prompt: 'Make a buffer from ammonia and ammonium chloride. What pH does it hold?', explanation: X('Around 9.', 'It\'s an alkaline buffer.', 'pH = pKa(NH₄⁺) ≈ 9.25.') },
  ],
}

export const redCabbage: ChemExperiment = {
  id: 'red-cabbage-indicator',
  domain: 'chemistry',
  title: 'Red cabbage rainbow',
  summary: 'A natural indicator from red cabbage shows a whole rainbow from acid to alkali.',
  topics: ['acids', 'bases', 'indicators', 'pH'],
  difficulty: 'intro',
  minutes: 5,
  station: 'wet-bench',
  hazards: [{ kind: 'irritant', note: 'Dilute acid and alkali' }],
  setup: {
    vessels: [
      { id: 'tube 1', kind: 'test-tube', contents: [{ reagent: 'hcl-0.1m', amount: 5 }] },
      { id: 'tube 2', kind: 'test-tube', contents: [{ reagent: 'acetic-0.1m', amount: 5 }] },
      { id: 'tube 3', kind: 'test-tube', contents: [{ reagent: 'water', amount: 5 }] },
      { id: 'tube 4', kind: 'test-tube', contents: [{ reagent: 'naoh-0.1m', amount: 5 }] },
    ],
  },
  intro: X(
    'Red cabbage juice changes color depending on how acidic or alkaline something is. Let\'s make a rainbow!',
    'Red cabbage contains anthocyanin pigments whose color depends on pH: red in strong acid, purple when neutral, green to yellow in strong alkali.',
    'Anthocyanins change structure with pH (flavylium cation → quinoidal base → chalcone), and each form absorbs differently. That makes it a broad-range natural indicator.',
  ),
  steps: [
    { instruction: 'Add 5 drops of red cabbage indicator to tube 1 (hydrochloric acid).', action: [add('tube 1', 'red-cabbage', 5)], check: turned('red'), observation: 'Bright red.', explanation: X('Red means strongly acidic.', 'pH ≈ 1: strongly acidic.', 'At pH < 2 the flavylium cation dominates: red.') },
    { instruction: 'Add 5 drops to tube 2 (acetic acid: vinegar).', action: [add('tube 2', 'red-cabbage', 5)], check: turned('pink'), observation: 'Pink.', explanation: X('Pink means a bit acidic: vinegar is weaker than hydrochloric acid.', 'Acetic acid is a weak acid, pH ≈ 2.9.', 'Only ~1.3% of 0.1 M acetic acid ionizes (Ka = 1.8×10⁻⁵).') },
    { instruction: 'Add 5 drops to tube 3 (water).', action: [add('tube 3', 'red-cabbage', 5)], check: turned('purple'), observation: 'Purple: the natural color of the juice.', explanation: X('Purple means neutral: not acid, not alkali.', 'Pure water is neutral, pH 7.', '[H⁺] = [OH⁻] = 10⁻⁷ M at 25 °C.') },
    { instruction: 'Add 5 drops to tube 4 (sodium hydroxide).', action: [add('tube 4', 'red-cabbage', 5)], check: turned('yellow', 'green'), observation: 'Yellow-green!', explanation: X('Yellow/green means strongly alkaline.', 'pH ≈ 13: strongly alkaline.', 'At high pH the pigment ring opens to the chalcone form, which appears yellow.') },
  ],
  conclusion: X(
    'One juice, four colors: it tells you how acidic or alkaline something is.',
    'Indicators are pigments that change color with pH. Red cabbage covers almost the whole pH scale, which is why it\'s called a universal indicator in the kitchen.',
    'A broad-range indicator works because several protonation states, each with its own pKa, give a series of color transitions across pH 1–13.',
  ),
  variations: [
    { prompt: 'Test baking soda solution, ammonia and limewater. Where do they fit in the rainbow?' },
    { prompt: 'Compare with universal indicator from the shelf.' },
  ],
}
