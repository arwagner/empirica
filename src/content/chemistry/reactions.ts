import { add, saw, turned, X, type ChemExperiment } from './helpers'

export const halideTests: ChemExperiment = {
  id: 'halide-tests',
  domain: 'chemistry',
  title: 'Silver nitrate halide tests',
  summary: 'Identify chloride, bromide and iodide by the color of their silver precipitates.',
  topics: ['precipitation', 'ions', 'analysis'],
  difficulty: 'intro',
  minutes: 5,
  station: 'wet-bench',
  hazards: [{ kind: 'corrosive', note: 'Silver nitrate stains skin black' }],
  setup: {
    vessels: [
      { id: 'tube Cl', kind: 'test-tube', contents: [{ reagent: 'nacl-0.1m', amount: 5 }] },
      { id: 'tube Br', kind: 'test-tube', contents: [{ reagent: 'kbr-0.1m', amount: 5 }] },
      { id: 'tube I', kind: 'test-tube', contents: [{ reagent: 'ki-0.1m', amount: 5 }] },
    ],
  },
  intro: X(
    'When a salt dissolves, it breaks into tiny pieces with an electric charge, called ions. They\'re far too small to see and have no color, so the water looks completely clear. Each of these three tubes holds a different dissolved ion: chloride, bromide or iodide. Silver nitrate adds silver ions. Silver grabs onto each of those ions so tightly that they clump into a solid you CAN see, and each solid is a different color.',
    'Dissolved salts exist as separate ions: NaCl(s) → Na⁺(aq) + Cl⁻(aq). The tubes contain Cl⁻, Br⁻ and I⁻ (halide ions). Adding Ag⁺ creates a pairing that can\'t stay dissolved: silver halides are almost insoluble, so they precipitate as a solid. The color of each solid identifies the halide.',
    'Ag⁺(aq) + X⁻(aq) → AgX(s) whenever [Ag⁺][X⁻] exceeds Ksp (AgCl 1.8×10⁻¹⁰, AgBr 5×10⁻¹³, AgI 8×10⁻¹⁷). Na⁺/K⁺ and NO₃⁻ remain as spectator ions. The color trend (white → cream → yellow) reflects increasing covalent character and a narrowing band gap down the group.',
  ),
  steps: [
    {
      instruction: 'Add 2 mL of silver nitrate to the tube labelled Cl.',
      action: [add('tube Cl', 'agno3-0.1m', 2)],
      check: saw('precipitate:AgCl'),
      observation: 'A white cloud appears instantly.',
      explanation: X(
        'The silver ions and chloride ions snapped together into silver chloride, a solid that can\'t dissolve. Billions of tiny specks of it make the water look cloudy white. (The sodium and nitrate ions just stay dissolved and do nothing: chemists call them spectators.)',
        'Ag⁺ + Cl⁻ → AgCl(s). The attraction between Ag⁺ and Cl⁻ is stronger than water\'s ability to keep them apart, so they precipitate. The particles scatter all colors of light equally, which looks white.',
        'Q = [Ag⁺][Cl⁻] ≈ (0.029)(0.071) ≫ Ksp, so AgCl nucleates immediately; colloidal particles scatter all visible wavelengths (Mie scattering) → white.',
      ),
    },
    {
      instruction: 'Add 2 mL of silver nitrate to the Br tube.',
      action: [add('tube Br', 'agno3-0.1m', 2)],
      check: saw('precipitate:AgBr'),
      observation: 'A cream-colored cloud.',
      explanation: X(
        'Same idea: silver grabbed the bromide ions and made solid silver bromide. Bromide is a bigger ion than chloride, and that makes the solid soak up a little violet light, so what\'s left looks slightly yellowish: cream.',
        'Ag⁺ + Br⁻ → AgBr(s). Bromide is larger and its electrons are held more loosely, so the solid absorbs a little light at the violet end of the spectrum. Removing violet from white light leaves a cream tint.',
        'AgBr has more covalent Ag–Br bonding and a smaller band gap (~2.6 eV) than AgCl (~3.2 eV), so its absorption edge creeps into the visible violet. It\'s also photosensitive: the basis of photographic film.',
      ),
    },
    {
      instruction: 'Add 2 mL of silver nitrate to the I tube.',
      action: [add('tube I', 'agno3-0.1m', 2)],
      check: saw('precipitate:AgI'),
      observation: 'A pale yellow cloud.',
      explanation: X(
        'Iodide is the biggest of the three. Silver iodide soaks up even more light, now the blue part, and white light with the blue taken out looks yellow.',
        'Ag⁺ + I⁻ → AgI(s). Iodide is the largest and most "squishy" (polarizable) ion, so AgI absorbs blue light. Its color is what remains: yellow.',
        'AgI has the most covalent character and the smallest band gap of the three (~2.8 eV direct, absorbing ≲ 440 nm), so it appears yellow. It\'s also the least soluble (Ksp 8×10⁻¹⁷).',
      ),
    },
  ],
  conclusion: X(
    'White, cream, yellow: chloride, bromide, iodide. The invisible ion in each tube showed itself by the color of the solid it made with silver. Now you can identify a mystery salt!',
    'The silver nitrate test identifies halide ions by precipitate color. Precipitation reactions happen when two ions meet that can\'t stay dissolved together.',
    'Solubility decreases Cl > Br > I as lattice bonding gains covalent character. In real labs, adding dilute vs. concentrated ammonia confirms the halide (AgCl dissolves in dilute, AgBr only in concentrated, AgI in neither).',
  ),
  variations: [
    { prompt: 'Mix potassium chromate and silver nitrate. What color now?', explanation: X('Brick red!', 'Silver chromate is red.', 'Ag₂CrO₄, Ksp 1.1×10⁻¹²: used as the end-point indicator in the Mohr titration.') },
    { prompt: 'Try lead(II) nitrate with potassium iodide for a "golden rain" yellow.' },
  ],
}

export const flameTests: ChemExperiment = {
  id: 'flame-tests',
  domain: 'chemistry',
  title: 'Flame tests',
  summary: 'Metal ions paint a Bunsen flame with signature colors.',
  topics: ['metals', 'spectra', 'analysis', 'atoms'],
  difficulty: 'intro',
  minutes: 6,
  station: 'flame-station',
  hazards: [{ kind: 'hot', note: 'Open flame' }],
  setup: {
    vessels: [
      { id: 'tube 1', kind: 'test-tube', contents: [{ reagent: 'licl-0.5m', amount: 5 }] },
      { id: 'tube 2', kind: 'test-tube', contents: [{ reagent: 'nacl-0.1m', amount: 5 }] },
      { id: 'tube 3', kind: 'test-tube', contents: [{ reagent: 'kcl-0.1m', amount: 5 }] },
      { id: 'tube 4', kind: 'test-tube', contents: [{ reagent: 'cuso4-0.5m', amount: 5 }] },
    ],
  },
  intro: X(
    'Different metals make flames glow different colors. Fireworks use this trick! Let\'s test four metals.',
    'Heat excites electrons in metal ions. When they fall back, they emit light of specific colors, a fingerprint for each metal.',
    'Thermal excitation promotes valence electrons; relaxation emits photons at characteristic wavelengths (E = hc/λ). Na: 589 nm doublet; Li: 671 nm; K: 766/404 nm; Cu: ~510–530 nm bands.',
  ),
  steps: [
    { instruction: 'Flame-test tube 1 (lithium chloride).', action: [{ type: 'flame-test', vessel: 'tube 1' }], check: saw('flame:Li+'), observation: 'Crimson red.', explanation: X('Lithium = crimson red.', 'Lithium ions emit red light at 671 nm.', '2p → 2s transition of Li at 670.8 nm.') },
    { instruction: 'Flame-test tube 2 (sodium chloride).', action: [{ type: 'flame-test', vessel: 'tube 2' }], check: saw('flame:Na+'), observation: 'Intense yellow-orange.', explanation: X('Sodium = bright yellow, like street lamps.', 'Sodium\'s yellow is so intense it can hide other colors.', 'Na D-lines (3p → 3s) at 589.0/589.6 nm. Very high oscillator strength, so traces of Na contaminate most flame tests.') },
    { instruction: 'Flame-test tube 3 (potassium chloride).', action: [{ type: 'flame-test', vessel: 'tube 3' }], check: saw('flame:K+'), observation: 'Lilac.', explanation: X('Potassium = lilac (light purple).', 'Potassium gives a pale lilac. Viewing through blue cobalt glass helps hide sodium contamination.', 'K emits at 766/770 nm (deep red) plus 404 nm (violet), perceived together as lilac.') },
    { instruction: 'Flame-test tube 4 (copper sulfate).', action: [{ type: 'flame-test', vessel: 'tube 4' }], check: saw('flame:Cu2+'), observation: 'Blue-green.', explanation: X('Copper = blue-green.', 'Copper gives a blue-green flame.', 'Emission from excited Cu atoms and CuCl/CuOH species gives green-blue bands.') },
  ],
  conclusion: X(
    'Each metal has its own flame color, like a signature. That\'s how fireworks get their colors.',
    'Flame colors come from electrons jumping between fixed energy levels. Since every element has different levels, the colors identify the metal.',
    'Atomic emission spectroscopy generalizes this: discrete lines map to quantized levels. Astronomers use the same lines to read the composition of stars.',
  ),
  variations: [
    { prompt: 'Try strontium chloride and barium chloride. Which firework colors do they make?' },
    { prompt: 'Mix sodium and potassium chloride and flame test. Can you still see the lilac?', explanation: X('No: the yellow hides it.', 'Sodium masks potassium.', 'Na emission is orders of magnitude more intense at equal concentration.') },
  ],
}

export const alkaliMetals: ChemExperiment = {
  id: 'alkali-metals-in-water',
  domain: 'chemistry',
  title: 'Alkali metals in water',
  summary: 'Lithium, sodium and potassium react with water, each more violently than the last.',
  topics: ['metals', 'reactivity', 'periodic table', 'gases'],
  difficulty: 'intro',
  minutes: 6,
  station: 'fume-hood',
  hazards: [{ kind: 'flammable', note: 'Tiny pieces only, behind the fume hood sash' }, { kind: 'corrosive' }],
  setup: {
    vessels: ['Li', 'Na', 'K'].map((m) => ({
      id: `${m} trough`, kind: 'beaker-250' as const,
      contents: [{ reagent: 'water', amount: 100 }, { reagent: 'universal-indicator', amount: 5 }],
    })),
  },
  intro: X(
    'Some metals are so reactive they fizz in plain water! The further down the group, the wilder they get.',
    'Group 1 metals react with water to make hydrogen gas and an alkaline hydroxide. Reactivity increases down the group.',
    '2M(s) + 2H₂O(l) → 2MOH(aq) + H₂(g). Reactivity rises down the group as ionization energy falls (Li 520, Na 496, K 419 kJ mol⁻¹), kinetically, despite Li having the most negative E°.',
  ),
  steps: [
    { instruction: 'Drop a tiny (0.05 g) piece of lithium into the Li trough.', action: [add('Li trough', 'li-metal', 0.05)], check: saw('reacts-with-water:Li'), observation: 'It floats and fizzes steadily; the indicator turns violet.', explanation: X('Lithium fizzes gently, making hydrogen bubbles. The water turns alkaline (the opposite of acidic, like soap), so the indicator goes violet.', 'Lithium makes lithium hydroxide (alkaline, so the indicator turns violet) and hydrogen gas.', '2Li + 2H₂O → 2LiOH + H₂; ΔH ≈ −222 kJ per mol Li.') },
    { instruction: 'Now 0.05 g of sodium in the Na trough.', action: [add('Na trough', 'na-metal', 0.05)], check: saw('reacts-with-water:Na'), observation: 'It melts into a silvery ball and whizzes around.', explanation: X('Sodium is wilder: it gets hot enough to melt!', 'The reaction releases enough heat to melt sodium (m.p. 98 °C). Hydrogen jets push it around.', 'Faster kinetics + low melting point. The liquid sphere minimizes surface energy while H₂ propels it.') },
    { instruction: 'And 0.05 g of potassium in the K trough.', action: [add('K trough', 'k-metal', 0.05)], check: saw('reacts-with-water:K'), observation: 'It bursts into a lilac flame!', explanation: X('Potassium is the most violent: the hydrogen catches fire!', 'Enough heat is released to ignite the hydrogen, which burns with potassium\'s lilac color.', 'The heat release rate exceeds H₂\'s ignition threshold; K emission lines colour the flame.') },
    { instruction: 'Hold a burning splint over the K trough.', action: [{ type: 'splint', vessel: 'K trough', splint: 'burning' }], check: saw('test:H2'), observation: 'A squeaky pop: hydrogen!', explanation: X('The pop proves the gas is hydrogen.', 'Hydrogen burns rapidly with a pop when mixed with air.', '2H₂ + O₂ → 2H₂O, a fast deflagration; the "squeak" is the pressure pulse in the tube mouth.') },
  ],
  conclusion: X(
    'Lithium fizzes, sodium zooms, potassium bursts into flame. Going down the group, the metals get more reactive.',
    'All alkali metals make hydrogen and an alkaline solution with water. Reactivity increases down the group because the outer electron is further from the nucleus and easier to lose.',
    'Increasing atomic radius and shielding lower the first ionization energy, so electron loss is faster. Rb and Cs react explosively.',
  ),
  variations: [
    { prompt: 'Try calcium granules. Is it more or less reactive than lithium?', explanation: X('Less wild, but it still fizzes.', 'Group 2 metals react more slowly.', 'Ca(OH)₂ is sparingly soluble, so the water also turns cloudy.') },
  ],
}

export const reactivitySeries: ChemExperiment = {
  id: 'metals-in-acid',
  domain: 'chemistry',
  title: 'Metals in acid: the reactivity series',
  summary: 'Magnesium, zinc and copper meet hydrochloric acid. Who fizzes?',
  topics: ['metals', 'reactivity', 'gases', 'redox'],
  difficulty: 'core',
  minutes: 6,
  station: 'wet-bench',
  hazards: [{ kind: 'corrosive', note: '1 M hydrochloric acid' }, { kind: 'flammable', note: 'Hydrogen' }],
  setup: { vessels: ['Mg', 'Zn', 'Cu'].map((m) => ({ id: `tube ${m}`, kind: 'test-tube' as const, contents: [{ reagent: 'hcl-1m', amount: 10 }] })) },
  intro: X(
    'Some metals dissolve in acid and make bubbles; others don\'t. Let\'s rank them!',
    'Metals above hydrogen in the reactivity series displace hydrogen from acids, producing hydrogen gas and a salt.',
    'M(s) + 2H⁺ → M²⁺ + H₂ is spontaneous when E°(M²⁺/M) < 0: Mg −2.37 V, Zn −0.76 V, Cu +0.34 V.',
  ),
  steps: [
    { instruction: 'Add 0.1 g of magnesium ribbon to tube Mg.', action: [add('tube Mg', 'mg-ribbon', 0.1)], check: { type: 'gas-evolved', vessel: 'tube Mg', gas: 'H2', minMl: 50 }, observation: 'Vigorous fizzing; the ribbon disappears and the tube gets hot.', explanation: X('Magnesium reacts fast, making lots of hydrogen.', 'Mg + 2HCl → MgCl₂ + H₂. Magnesium is high in the reactivity series.', '0.1 g Mg = 4.1 mmol → 4.1 mmol H₂ ≈ 99 mL at RTP. Strongly exothermic (ΔH ≈ −467 kJ mol⁻¹).') },
    { instruction: 'Add 0.1 g of zinc to tube Zn.', action: [add('tube Zn', 'zn-granules', 0.1)], check: { type: 'gas-evolved', vessel: 'tube Zn', gas: 'H2', minMl: 20 }, observation: 'Steady bubbling.', explanation: X('Zinc reacts too, but more calmly.', 'Zinc is less reactive than magnesium but still above hydrogen.', 'E°(Zn²⁺/Zn) = −0.76 V: less driving force than Mg.') },
    { instruction: 'Add 0.1 g of copper turnings to tube Cu.', action: [add('tube Cu', 'cu-turnings', 0.1)], check: { type: 'contains', vessel: 'tube Cu', species: 'Cu', min: 0.0015 }, observation: 'Nothing happens at all.', explanation: X('Copper ignores the acid.', 'Copper is below hydrogen in the reactivity series, so it can\'t displace it.', 'E°(Cu²⁺/Cu) = +0.34 V > 0: the reaction with H⁺ is non-spontaneous (ΔG > 0).') },
    { instruction: 'Test the gas from tube Mg with a burning splint.', action: [{ type: 'splint', vessel: 'tube Mg', splint: 'burning' }], check: saw('test:H2'), observation: 'Squeaky pop!', explanation: X('Pop = hydrogen.', 'The squeaky pop test confirms hydrogen.', 'Rapid H₂/O₂ combustion at the tube mouth.') },
  ],
  conclusion: X(
    'Magnesium > zinc > copper. The more reactive the metal, the faster it fizzes in acid.',
    'This is the reactivity series. Metals above hydrogen react with acids; copper, silver and gold don\'t.',
    'The ordering follows standard electrode potentials, which also predict displacement reactions between metals and salts.',
  ),
  variations: [
    { prompt: 'Try iron filings. Where does iron fit?' },
    { prompt: 'Use acetic acid instead. Is it slower or faster?' },
  ],
}

export const displacement: ChemExperiment = {
  id: 'metal-displacement',
  domain: 'chemistry',
  title: 'Metal displacement',
  summary: 'Zinc steals copper\'s place in solution; copper steals silver\'s.',
  topics: ['metals', 'reactivity', 'redox', 'energy'],
  difficulty: 'core',
  minutes: 6,
  station: 'wet-bench',
  hazards: [{ kind: 'toxic', note: 'Copper and silver salts' }],
  setup: {
    vessels: [
      { id: 'beaker', kind: 'beaker-100', contents: [{ reagent: 'cuso4-0.5m', amount: 50 }] },
      { id: 'tube', kind: 'test-tube', contents: [{ reagent: 'agno3-0.1m', amount: 5 }] },
    ],
  },
  intro: X(
    'Blue copper sulfate solution has copper hidden in it as tiny charged particles (ions); that\'s what makes it blue. Zinc is a "pushier" metal than copper: drop it in and it takes copper\'s place, forcing the copper out as solid metal. A metal tug-of-war!',
    'In a displacement reaction a more reactive metal gives electrons to the ions of a less reactive one: it dissolves while the other metal comes out as a solid.',
    'Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s), E°cell = 1.10 V. Cu(s) + 2Ag⁺ → Cu²⁺ + 2Ag(s), E°cell = 0.46 V. ΔG = −nFE°.',
  ),
  steps: [
    { instruction: 'Add 2 g of zinc granules to the blue copper sulfate.', action: [add('beaker', 'zn-granules', 2)], check: { type: 'all', checks: [saw('deposit:Cu'), { type: 'temperature', vessel: 'beaker', min: 30 }] }, observation: 'Reddish-brown copper forms, the blue fades away, and it gets hot.', explanation: X('Zinc pushed the copper out! The blue color was the copper in solution, so it disappears.', 'Zinc is more reactive: it gives its electrons to Cu²⁺ ions, which become copper metal. Blue Cu²⁺ is replaced by colorless Zn²⁺.', 'Redox: Zn → Zn²⁺ + 2e⁻ (oxidation), Cu²⁺ + 2e⁻ → Cu (reduction). |ΔH| ≈ 2F × 1.10 V ≈ 212 kJ per mol, which heats the solution by ~20 °C.') },
    { instruction: 'Drop 0.5 g of copper turnings into the silver nitrate tube.', action: [add('tube', 'cu-turnings', 0.5)], check: { type: 'all', checks: [saw('deposit:Ag'), turned('blue')] }, observation: 'Shiny silver crystals grow on the copper and the solution turns blue.', explanation: X('Now copper is the winner: it pushes silver out, and the water turns blue from copper.', 'Copper is more reactive than silver, so it displaces silver. The copper dissolves as blue Cu²⁺ ions.', 'Cu + 2Ag⁺ → Cu²⁺ + 2Ag: 2 mol of Ag deposited per mol of Cu dissolved.') },
  ],
  conclusion: X(
    'Zinc beats copper, copper beats silver. A metal can push out any metal below it in the reactivity series.',
    'Displacement reactions are redox: the more reactive metal is oxidized and the less reactive metal\'s ions are reduced.',
    'Pairing these half-reactions in separate compartments gives a galvanic cell (Daniell cell: Zn/Cu, 1.10 V). The energy released here as heat could be electrical work.',
  ),
  variations: [
    { prompt: 'Put copper in zinc sulfate. Does anything happen?', explanation: X('No!', 'Copper is less reactive than zinc.', 'E°cell would be −1.10 V: non-spontaneous.') },
    { prompt: 'Try iron filings in copper sulfate.' },
  ],
}

export const limewaterTest: ChemExperiment = {
  id: 'carbon-dioxide-limewater',
  domain: 'chemistry',
  title: 'Testing for carbon dioxide',
  summary: 'Make CO₂ from marble and acid, bubble it through limewater, watch it turn milky.',
  topics: ['gases', 'carbonates', 'precipitation'],
  difficulty: 'intro',
  minutes: 5,
  station: 'fume-hood',
  hazards: [{ kind: 'irritant' }],
  setup: {
    vessels: [
      { id: 'flask', kind: 'flask-250', contents: [{ reagent: 'hcl-1m', amount: 25 }] },
      { id: 'limewater', kind: 'test-tube', contents: [{ reagent: 'limewater', amount: 10 }] },
    ],
  },
  intro: X(
    'Limewater turns cloudy when carbon dioxide bubbles through it. That\'s how we test for CO₂.',
    'Acids react with carbonates to give carbon dioxide. CO₂ reacts with limewater (calcium hydroxide) to form insoluble calcium carbonate.',
    'CaCO₃ + 2H⁺ → Ca²⁺ + H₂O + CO₂; then CO₂ + Ca(OH)₂ → CaCO₃(s) + H₂O. Excess CO₂ forms soluble Ca(HCO₃)₂ and partly clears it.',
  ),
  steps: [
    { instruction: 'Connect a delivery tube from the flask into the limewater.', action: [{ type: 'connect-gas', from: 'flask', to: 'limewater' }], check: { type: 'connected', from: 'flask', to: 'limewater' }, observation: 'The tube dips into the limewater.', explanation: X('Any gas from the flask will now bubble through the limewater.', 'Gas produced in the flask is forced through the delivery tube.', 'The flask is sealed; produced gas raises the pressure and exits through the tube.') },
    { instruction: 'Add a small marble chip (0.02 g) to the acid.', action: [add('flask', 'caco3', 0.02)], check: saw('precipitate:CaCO3'), observation: 'The marble fizzes and the limewater turns milky white.', explanation: X('The bubbles are carbon dioxide, and they make limewater cloudy.', 'The milky look is tiny particles of calcium carbonate: chalk!', 'CO₂(aq) → HCO₃⁻/CO₃²⁻ in the alkaline limewater, and Q > Ksp(CaCO₃) = 3.4×10⁻⁹.') },
  ],
  conclusion: X(
    'Milky limewater = carbon dioxide. Marble is made of calcium carbonate, which gives CO₂ with acid.',
    'All carbonates react with acids to give a salt, water and carbon dioxide. Limewater is the standard test for CO₂.',
    'The same chemistry shapes limestone caves: CO₂-rich water dissolves CaCO₃ as bicarbonate, and redeposits it as stalactites when CO₂ escapes.',
  ),
  variations: [
    { prompt: 'Add a much bigger chip (0.1 g). Does the limewater stay milky?', explanation: X('It clears a bit!', 'Too much CO₂ redissolves the chalk.', 'Excess CO₂ lowers pH; CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂(aq).') },
    { prompt: 'Try baking soda instead of marble.' },
    { prompt: 'Hold a burning splint in the flask. What happens?' },
  ],
}

export const oxygenCatalyst: ChemExperiment = {
  id: 'oxygen-from-peroxide',
  domain: 'chemistry',
  title: 'Oxygen and a catalyst',
  summary: 'A pinch of manganese dioxide makes hydrogen peroxide release oxygen, and the relit splint proves it.',
  topics: ['catalysts', 'gases', 'rates'],
  difficulty: 'intro',
  minutes: 5,
  station: 'fume-hood',
  hazards: [{ kind: 'oxidizer', note: '3% hydrogen peroxide' }],
  setup: { vessels: [{ id: 'flask', kind: 'flask-250', contents: [{ reagent: 'h2o2-3pct', amount: 20 }] }] },
  intro: X(
    'Hydrogen peroxide slowly breaks down into water and oxygen. A catalyst is a helper substance that makes a reaction go much faster without getting used up itself. Let\'s see one at work!',
    'A catalyst speeds up a reaction without being used up. Manganese dioxide catalyses the decomposition of hydrogen peroxide.',
    '2H₂O₂ → 2H₂O + O₂, ΔH = −98 kJ per mol H₂O₂. MnO₂ provides a lower-activation-energy surface pathway and is recovered unchanged.',
  ),
  steps: [
    { instruction: 'Hold a glowing splint in the flask.', action: [{ type: 'splint', vessel: 'flask', splint: 'glowing' }], check: saw('test:none'), observation: 'The glowing splint just goes out.', explanation: X('Not enough oxygen yet.', 'Without a catalyst, peroxide decomposes too slowly to notice.', 'Uncatalysed decomposition has a high Ea; at room temperature the rate is negligible.') },
    { instruction: 'Add 0.5 g of manganese dioxide powder.', action: [add('flask', 'mno2', 0.5)], check: saw('gas:O2'), observation: 'Vigorous fizzing, and the flask gets warm.', explanation: X('The black powder makes the peroxide fizz out oxygen.', 'MnO₂ catalyses the reaction: lots of oxygen is released quickly. It\'s exothermic.', '17.6 mmol H₂O₂ → 8.8 mmol O₂ ≈ 210 mL; q ≈ 1.7 kJ heats the solution by ~13 °C.') },
    { instruction: 'Hold a glowing splint in the flask again.', action: [{ type: 'splint', vessel: 'flask', splint: 'glowing' }], check: saw('test:O2'), observation: 'The splint bursts back into flame!', explanation: X('That proves the gas is oxygen.', 'Oxygen relights a glowing splint: the standard test for O₂.', 'Higher O₂ partial pressure accelerates the smouldering combustion to flaming.') },
  ],
  conclusion: X(
    'The black powder made oxygen come out fast, and it wasn\'t used up.',
    'Catalysts speed reactions by giving them an easier route. The MnO₂ is still there at the end and could be filtered out and reused.',
    'Catalysts lower Ea without changing ΔH or the equilibrium position. Enzymes (e.g. catalase in liver) do the same job for H₂O₂ in living cells.',
  ),
  variations: [
    { prompt: 'Filter the flask afterwards: is the manganese dioxide still there?' },
    { prompt: 'Try a burning splint instead of a glowing one.' },
  ],
}
