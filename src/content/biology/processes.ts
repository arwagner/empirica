import { all, HOUR, reading, saw, wait, X, YEAR, type BiologyExperiment } from './helpers'

export const enzymeTemperature: BiologyExperiment = {
  id: 'enzyme-temperature', domain: 'biology', title: 'Enzymes and temperature', summary: 'Catalase at 20 °C, 37 °C and 65 °C: faster, then destroyed.',
  topics: ['enzymes', 'temperature', 'rates'], difficulty: 'core', minutes: 10, station: 'enzyme-station', hazards: [{ kind: 'irritant', note: 'Hydrogen peroxide' }],
  setup: { rig: { kind: 'enzymes', params: { tempC: 20 } } },
  intro: X('Enzymes are the body\'s helpers, speeding up chemical reactions. How does temperature affect them?', 'We\'ll measure the initial rate of oxygen production by liver catalase at three temperatures.', 'Rate rises with T (Arrhenius/Q10) until thermal denaturation dominates.'),
  steps: [
    { instruction: 'At 20 °C, add the liver and measure the oxygen made in 30 s.', action: [{ type: 'enz-start' }, wait(31)], check: reading('initial-rate', 'oxygen', 0.15, 0.35), observation: 'About 0.25 mL of oxygen per second.', explanation: X('It works, but not as fast as it could.', 'Molecules move slowly at 20 °C, so enzyme and substrate meet less often.', 'Q10 ≈ 2.') },
    { instruction: 'Set the bath to 37 °C (body temperature) and repeat.', action: [{ type: 'enz-set', tempC: 37 }, { type: 'enz-start' }, wait(31)], check: reading('initial-rate', 'oxygen', 0.6, 1.0), observation: 'About three times faster.', explanation: X('Warmer molecules move faster and collide more often.', 'More frequent, more energetic collisions between enzyme and substrate.', '2^1.7 ≈ 3.2× faster.') },
    { instruction: 'Now try 65 °C.', action: [{ type: 'enz-set', tempC: 65 }, { type: 'enz-start' }, wait(60)], check: saw('denatured'), observation: 'A quick burst of fizzing that dies away almost at once.', explanation: X('Too hot: the enzyme gets shaken out of shape and stops working.', 'Denaturation: high temperature breaks the bonds holding the enzyme\'s shape, destroying the active site.', 'k_denature grows exponentially above ~40 °C.') },
  ],
  conclusion: X('Enzymes work faster when warm, up to a point, then heat destroys them.', 'There\'s an optimum temperature: above it, denaturation outweighs the faster collisions.', 'Thermophile enzymes (e.g. Taq polymerase) have optima above 70 °C.'),
  variations: [{ prompt: 'Find the optimum: try 30, 40 and 50 °C.' }],
}

export const enzymePH: BiologyExperiment = {
  id: 'enzyme-ph', domain: 'biology', title: 'Enzymes and pH', summary: 'Catalase in acid, neutral and alkaline buffers.',
  topics: ['enzymes', 'pH'], difficulty: 'core', minutes: 8, station: 'enzyme-station', hazards: [{ kind: 'irritant' }],
  setup: { rig: { kind: 'enzymes', params: { pH: 4 } } },
  intro: X('Does acid or alkali affect an enzyme?', 'We\'ll compare initial rates at pH 4, 7 and 10.', 'Bell-shaped pH–activity curve.'),
  steps: [
    { instruction: 'At pH 4, start the reaction.', action: [{ type: 'enz-start' }, wait(31)], check: reading('initial-rate', 'oxygen', 0, 0.15), observation: 'Very slow.', explanation: X('Too acidic: the enzyme\'s shape is distorted.', 'Acid changes charges in the active site.', 'Protonation of key residues.') },
    { instruction: 'Change to a pH 7 buffer and repeat.', action: [{ type: 'enz-set', pH: 7 }, { type: 'enz-start' }, wait(31)], check: reading('initial-rate', 'oxygen', 0.6, 1.0), observation: 'Much faster.', explanation: X('Neutral suits catalase best.', 'Optimum pH ≈ 7.', 'Native ionisation state.') },
    { instruction: 'Now pH 10.', action: [{ type: 'enz-set', pH: 10 }, { type: 'enz-start' }, wait(31)], check: reading('initial-rate', 'oxygen', 0, 0.15), observation: 'Slow again.', explanation: X('Too alkaline is bad too.', 'Deprotonation alters the active site.', 'Activity falls on both sides of the optimum.') },
  ],
  conclusion: X('Each enzyme has a favourite pH.', 'Activity peaks at the optimum pH and falls either side.', 'Pepsin works at pH 2, trypsin at pH 8: matched to their parts of the gut.'),
  variations: [{ prompt: 'Measure pH 5, 6, 8 and 9 too, and plot the curve.' }],
}

export const enzymeControl: BiologyExperiment = {
  id: 'enzyme-control', domain: 'biology', title: 'Controls: is it really the enzyme?', summary: 'Boiled liver vs fresh liver.',
  topics: ['enzymes', 'controls', 'experimental design'], difficulty: 'intro', minutes: 5, station: 'enzyme-station', hazards: [{ kind: 'irritant' }],
  setup: { rig: { kind: 'enzymes', params: { boiled: true } } },
  intro: X('How do we know it\'s the enzyme making the bubbles, not something else in the liver?', 'A control experiment changes just one thing: here, whether the enzyme is still working.', 'Negative control with heat-inactivated enzyme.'),
  steps: [
    { instruction: 'Drop boiled liver into the hydrogen peroxide.', action: [{ type: 'enz-start' }, wait(10)], check: saw('boiled'), observation: 'No bubbles.', explanation: X('Boiling broke the enzyme.', 'Denatured catalase can\'t bind its substrate.', 'Irreversible unfolding.') },
    { instruction: 'Now use fresh liver.', action: [{ type: 'enz-set', boiled: false }, { type: 'enz-start' }, wait(10)], check: saw('fizzing'), observation: 'Lots of fizzing.', explanation: X('Same liver, working enzyme: bubbles. So it\'s the enzyme.', 'The only difference was the enzyme\'s activity, so it must cause the reaction.', 'Controls isolate the variable.') },
  ],
  conclusion: X('Controls prove what\'s causing the result.', 'Good experiments change one variable at a time.', 'Negative controls rule out alternative explanations.'),
  variations: [{ prompt: 'Try potato instead of liver.' }],
}

export const potatoOsmosis: BiologyExperiment = {
  id: 'potato-osmosis', domain: 'biology', title: 'Osmosis in potatoes', summary: 'Find the sugar concentration that matches the inside of potato cells.',
  topics: ['osmosis', 'cells', 'water potential'], difficulty: 'core', minutes: 10, station: 'osmosis-station', hazards: [],
  setup: { rig: { kind: 'osmosis' } },
  intro: X('Potatoes are full of water. What happens if we soak them in sugary water?', 'Measure mass changes of potato cylinders in a range of sucrose solutions.', 'Determine the tissue\'s osmotic concentration from the x-intercept.'),
  steps: [
    { instruction: 'Weigh the cylinders, put them in the solutions and wait 30 minutes.', action: [{ type: 'osm-start' }, wait(1800)], check: all(saw('osmosis-seen'), reading('percent-change', 'tube:0', 5)), observation: 'In water they gained mass; in strong sugar they lost it.', explanation: X('Water moves towards the sugarier side.', 'Osmosis from high to low water potential.', 'Ψ gradient drives flux.') },
    { instruction: 'Leave them two more hours, until they stop changing, then read where the graph crosses zero.', action: [wait(2 * HOUR)], check: all(reading('percent-change', 'tube:5', -100, -38), reading('isotonic', 'potato', 0.25, 0.35)), observation: 'About 0.3 M: the same as inside the potato cells.', explanation: X('At this concentration, water flows in and out equally.', 'The isotonic point matches the cells\' solute concentration.', 'Ψ_cell ≈ Ψ_solution at 0.3 M sucrose.') },
  ],
  conclusion: X('Water moves in and out of cells by osmosis.', 'Cells gain water in dilute solutions and lose it in concentrated ones.', 'This is why salted slugs shrivel and why IV drips are isotonic.'),
  variations: [{ prompt: 'Why do we use % change in mass, not just change in mass?' }],
}

export const agarCubes: BiologyExperiment = {
  id: 'agar-cubes', domain: 'biology', title: 'Why cells are small', summary: 'Acid soaks into agar cubes of different sizes.',
  topics: ['diffusion', 'surface area', 'cells'], difficulty: 'core', minutes: 8, station: 'osmosis-station', hazards: [{ kind: 'irritant', note: 'Dilute acid' }],
  setup: { rig: { kind: 'osmosis', params: { mode: 'diffusion' } } },
  intro: X('Why aren\'t there giant single cells the size of footballs?', 'Measure how long diffusion takes to reach the centres of 1, 2 and 3 cm cubes.', 'Diffusion time ∝ L²; SA:V ∝ 1/L.'),
  steps: [
    { instruction: 'Drop the cubes in the acid and wait 10 minutes.', action: [{ type: 'osm-start' }, wait(600)], check: saw('cleared:0'), observation: 'The 1 cm cube has gone completely colourless.', explanation: X('The acid reached the middle of the small cube quickly.', 'Short distance to the centre.', 'x² ≈ 2Dt.') },
    { instruction: 'Keep waiting until the 2 cm cube clears.', action: [wait(1200)], check: saw('cleared:1'), observation: 'About four times as long.', explanation: X('Twice as big, four times as slow.', 'Time ∝ distance².', 'Diffusive time scale L²/D.') },
    { instruction: 'And the 3 cm cube.', action: [wait(1500)], check: saw('cleared:2'), observation: 'About nine times as long as the smallest.', explanation: X('Big cubes take ages.', 'SA:V falls as size grows.', '(3/1)² = 9.') },
  ],
  conclusion: X('Big things can\'t rely on diffusion alone, so cells stay small and big animals need blood and lungs.', 'Small size means a large SA:V, so diffusion is fast enough.', 'This limits cell size to ~10–100 µm.'),
  variations: [{ prompt: 'Warm the acid to 40 °C. Faster?' }],
}

export const lightIntensity: BiologyExperiment = {
  id: 'light-intensity', domain: 'biology', title: 'Light and photosynthesis', summary: 'Count pondweed bubbles with the lamp at different distances.',
  topics: ['photosynthesis', 'light', 'inverse square law'], difficulty: 'core', minutes: 10, station: 'photosynthesis-station', hazards: [{ kind: 'hot', note: 'Lamps get hot' }],
  setup: { rig: { kind: 'photosynthesis', params: { distance: 40 } } },
  intro: X('Plants make oxygen when they make food. Does more light mean more oxygen?', 'Count oxygen bubbles per minute at three lamp distances.', 'Rate vs photon flux; I ∝ 1/d².'),
  steps: [
    { instruction: 'With the lamp 40 cm away, count bubbles for a minute.', action: [{ type: 'photo-count' }, wait(61)], check: reading('bubble-count', 'latest', 10, 18), observation: 'About 14 bubbles.', explanation: X('Not much light reaches the plant.', 'Light is limiting.', 'Low photon flux.') },
    { instruction: 'Move it to 20 cm and count again.', action: [{ type: 'photo-set', distance: 20 }, { type: 'photo-count' }, wait(61)], check: reading('bubble-count', 'latest', 22, 32), observation: 'About twice as many.', explanation: X('Half the distance gives four times the light.', 'Inverse square law.', 'I(20)/I(40) = 4.') },
    { instruction: 'And 10 cm.', action: [{ type: 'photo-set', distance: 10 }, { type: 'photo-count' }, wait(61)], check: reading('bubble-count', 'latest', 30, 38), observation: 'More again, but not four times more.', explanation: X('Now something else is holding it back.', 'Another factor (CO₂) is becoming limiting.', 'Approaching light saturation.') },
  ],
  conclusion: X('More light means faster photosynthesis, until something else runs out.', 'Light intensity is a limiting factor at low levels.', 'Light-response curves saturate.'),
  variations: [{ prompt: 'Plot bubbles against light intensity (lux), not distance.' }],
}

export const limitingFactors: BiologyExperiment = {
  id: 'limiting-factors', domain: 'biology', title: 'Limiting factors', summary: 'Bright light but little CO₂: what\'s holding the plant back?',
  topics: ['photosynthesis', 'limiting factors'], difficulty: 'advanced', minutes: 8, station: 'photosynthesis-station', hazards: [{ kind: 'hot' }],
  setup: { rig: { kind: 'photosynthesis', params: { distance: 8, co2: 0.05 } } },
  intro: X('A plant has lots of light but hardly any carbon dioxide. Will more light help?', 'Identify the limiting factor by changing one variable at a time.', 'Blackman\'s law of limiting factors.'),
  steps: [
    { instruction: 'Count bubbles with the lamp close but very little hydrogen carbonate.', action: [{ type: 'photo-count' }, wait(61)], check: reading('bubble-count', 'latest', 8, 18), observation: 'Only about 13 bubbles, despite bright light.', explanation: X('Not enough carbon dioxide.', 'CO₂ limits the Calvin cycle.', 'Rubisco is substrate-limited.') },
    { instruction: 'Add more hydrogen carbonate (1%) and count again.', action: [{ type: 'photo-set', co2: 1 }, { type: 'photo-count' }, wait(61)], check: reading('bubble-count', 'latest', 32, 45), observation: 'Nearly three times as many!', explanation: X('Carbon dioxide was the problem.', 'Raising the limiting factor raises the rate.', 'Now light or temperature limits.') },
  ],
  conclusion: X('Photosynthesis goes only as fast as its scarcest ingredient allows.', 'The limiting factor is whichever is in shortest supply.', 'Greenhouses add CO₂ to boost yields.'),
  variations: [{ prompt: 'Now warm the water. Does temperature become limiting?' }],
}

export const antibioticZones: BiologyExperiment = {
  id: 'antibiotic-zones', domain: 'biology', title: 'Which antibiotic works?', summary: 'Antibiotic discs on a lawn of E. coli.',
  topics: ['microbiology', 'antibiotics', 'bacteria'], difficulty: 'core', minutes: 8, station: 'microbiology-station', hazards: [{ kind: 'biohazard', note: 'Harmless lab strains; always use aseptic technique' }],
  setup: { rig: { kind: 'microbiology', params: { organism: 'e-coli', tempC: 37 } } },
  intro: X('Antibiotics kill bacteria, but not every antibiotic works on every bacterium.', 'Compare zones of inhibition for four discs on E. coli (Gram-negative).', 'Kirby–Bauer disc diffusion.'),
  steps: [
    { instruction: 'Spread the bacteria, add the discs, and incubate for 24 hours at 37 °C.', action: [{ type: 'micro-inoculate' }, { type: 'micro-incubate' }, wait(24 * HOUR)], check: saw('zones'), observation: 'Clear zones of different sizes.', explanation: X('Bigger zone, stronger effect.', 'Zone size depends on MIC.', 'd ∝ ln(C₀/MIC).') },
    { instruction: 'Now try a Gram-positive bacterium, Bacillus subtilis, with the same discs.', action: [{ type: 'micro-set', organism: 'b-subtilis' }, { type: 'micro-inoculate' }, { type: 'micro-incubate' }, wait(24 * HOUR)], check: reading('ruler', 'zone:0', 30), observation: 'Now penicillin makes a huge clear zone.', explanation: X('This bacterium has no extra outer coat, so penicillin gets straight to its cell wall and stops it growing.', 'Gram-positive bacteria lack the outer membrane, so penicillin reaches the peptidoglycan wall it attacks.', 'PBPs are accessible in Gram-positive cells; MIC(penicillin, B. subtilis) ≈ 0.06 µg/mL.') },
  ],
  conclusion: X('Different antibiotics suit different bacteria.', 'Doctors test which antibiotic works before prescribing.', 'Resistance testing guides therapy.'),
  variations: [{ prompt: 'Repeat with B. subtilis (Gram-positive). What happens to the penicillin zone?' }],
}

export const colonyCount: BiologyExperiment = {
  id: 'colony-count', domain: 'biology', title: 'Counting bacteria', summary: 'Too concentrated to count? Dilute it.',
  topics: ['microbiology', 'dilution', 'counting'], difficulty: 'core', minutes: 8, station: 'microbiology-station', hazards: [{ kind: 'biohazard' }],
  setup: { rig: { kind: 'microbiology', params: { mode: 'count', dilution: 4 } } },
  intro: X('How many bacteria are in a drop of culture? Far too many to count, unless we dilute it.', 'Serial dilution and plating give countable colonies.', 'CFU/mL = colonies × dilution factor / volume.'),
  steps: [
    { instruction: 'Plate the 10⁻⁴ dilution and incubate for a day.', action: [{ type: 'micro-inoculate' }, { type: 'micro-incubate' }, wait(24 * HOUR)], check: saw('tntc'), observation: 'Too many to count.', explanation: X('Not diluted enough.', 'TNTC: more than 300 colonies.', 'Overlap.') },
    { instruction: 'Try the 10⁻⁶ dilution.', action: [{ type: 'micro-set', dilution: 6 }, { type: 'micro-inoculate' }, { type: 'micro-incubate' }, wait(24 * HOUR)], check: reading('colony-counter', 'plate', 30, 300), observation: 'About 100 separate colonies.', explanation: X('Now you can count them.', 'Each colony came from one bacterium.', '30–300 rule.') },
  ],
  conclusion: X('Diluting lets you count something too numerous to count.', 'Back-calculate: about 10⁹ bacteria per mL.', 'Plate counts measure viable cells.'),
  variations: [{ prompt: 'Try 10⁻⁸. How reliable is a count of 1?' }],
}

export const aseptic: BiologyExperiment = {
  id: 'aseptic-technique', domain: 'biology', title: 'Why flame the loop?', summary: 'See what happens when you skip sterile technique.',
  topics: ['microbiology', 'aseptic technique'], difficulty: 'intro', minutes: 5, station: 'microbiology-station', hazards: [{ kind: 'biohazard' }],
  setup: { rig: { kind: 'microbiology', params: { mode: 'count', dilution: 6, flamed: false } } },
  intro: X('Microbiologists flame their loops and keep lids on. Is it really necessary?', 'Compare a plate made without aseptic technique.', 'Contamination control.'),
  steps: [
    { instruction: 'Without flaming the loop, plate and incubate.', action: [{ type: 'micro-inoculate' }, { type: 'micro-incubate' }, wait(24 * HOUR)], check: saw('contaminated'), observation: 'Fuzzy colonies that don\'t belong.', explanation: X('Germs from the air and the loop got in.', 'Contaminants spoil results.', 'Unsterile inoculum.') },
  ],
  conclusion: X('Sterile technique keeps unwanted microbes out.', 'Aseptic technique protects results and people.', 'Standard lab practice.'),
  variations: [{ prompt: 'Turn sterile technique back on and compare.' }],
}

export const growthCurve: BiologyExperiment = {
  id: 'growth-curve', domain: 'biology', title: 'A bacterial growth curve', summary: 'Watch bacteria multiply, level off and die in a flask of broth.',
  topics: ['microbiology', 'growth', 'exponential'], difficulty: 'core', minutes: 6, station: 'microbiology-station', hazards: [{ kind: 'biohazard' }],
  setup: { rig: { kind: 'microbiology', params: { mode: 'broth', organism: 'e-coli', tempC: 37 } } },
  intro: X('How fast can bacteria multiply?', 'Follow optical density over two days to see the four phases of growth.', 'Lag, log, stationary and death phases.'),
  steps: [
    { instruction: 'Inoculate the broth and incubate.', action: [{ type: 'micro-inoculate' }, { type: 'micro-incubate' }, wait(12 * HOUR)], check: saw('log-phase'), observation: 'It turns cloudy fast.', explanation: X('Doubling again and again.', 'Exponential growth.', 'N = N₀2^(t/g).') },
    { instruction: 'Keep going for two days.', action: [wait(36 * HOUR)], check: all(saw('stationary-phase'), saw('death-phase')), observation: 'It levels off, then the bacteria start dying.', explanation: X('Food runs out.', 'Stationary then death phase.', 'Resource limitation.') },
  ],
  conclusion: X('Bacteria grow explosively, until their food runs out.', 'Growth curves have four phases.', 'Logistic growth with decline.'),
  variations: [{ prompt: 'Try 25 °C. How does the curve change?' }],
}

export const predatorPrey: BiologyExperiment = {
  id: 'predator-prey', domain: 'biology', title: 'Rabbits and foxes', summary: 'Watch two populations rise and fall together.',
  topics: ['ecology', 'populations', 'predation'], difficulty: 'intro', minutes: 5, station: 'ecology-station', hazards: [],
  setup: { rig: { kind: 'ecology' } },
  intro: X('What happens when foxes and rabbits share an island?', 'Run a predator–prey model and look for cycles.', 'Lotka–Volterra with logistic prey.'),
  steps: [
    { instruction: 'Run the island for 30 years.', action: [{ type: 'eco-run' }, wait(30 * YEAR)], check: saw('predator-lag'), observation: 'The populations cycle, foxes lagging behind rabbits.', explanation: X('More rabbits → more foxes → fewer rabbits → fewer foxes…', 'Feedback between predator and prey.', 'Phase lag ≈ quarter cycle.') },
  ],
  conclusion: X('Predators and prey keep each other in check.', 'Populations oscillate with a lag.', 'Seen in real lynx–hare data.'),
  variations: [{ prompt: 'Halve the grass. What happens to the foxes?' }],
}

export const carryingCapacity: BiologyExperiment = {
  id: 'carrying-capacity', domain: 'biology', title: 'How many can an island hold?', summary: 'Rabbits with no predators.',
  topics: ['ecology', 'populations', 'carrying capacity'], difficulty: 'intro', minutes: 4, station: 'ecology-station', hazards: [],
  setup: { rig: { kind: 'ecology', params: { foxes: 0, rabbits: 20, K: 3000 } } },
  intro: X('With no foxes, will the rabbits grow forever?', 'Observe logistic growth to carrying capacity.', 'dR/dt = rR(1 − R/K).'),
  steps: [
    { instruction: 'Run for 25 years.', action: [{ type: 'eco-run' }, wait(25 * YEAR)], check: saw('carrying-capacity'), observation: 'They level off around 3000.', explanation: X('The island only has so much grass.', 'Carrying capacity.', 'S-shaped growth.') },
  ],
  conclusion: X('Every habitat has a limit.', 'Populations level off at the carrying capacity.', 'Logistic growth.'),
  variations: [{ prompt: 'Double the grass. What changes?' }],
}

export const pepperedMoths: BiologyExperiment = {
  id: 'peppered-moths', domain: 'biology', title: 'Natural selection in moths', summary: 'Watch moth colors change as pollution comes and goes.',
  topics: ['evolution', 'natural selection', 'genetics'], difficulty: 'core', minutes: 6, station: 'ecology-station', hazards: [],
  setup: { rig: { kind: 'ecology', params: { mode: 'selection', environment: 'sooty', darkAllele: 0.02 } } },
  intro: X('In industrial Britain, soot blackened the trees. The moths changed color. How?', 'Simulate selection on moth color on sooty, then clean, bark.', 'Viability selection with drift.'),
  steps: [
    { instruction: 'Run 60 generations on sooty bark.', action: [{ type: 'eco-run' }, wait(60 * YEAR)], check: saw('dark-majority'), observation: 'Dark moths take over.', explanation: X('Birds can\'t see dark moths on dark bark.', 'Selection favours camouflage.', 'Allele frequency rises.') },
    { instruction: 'Clean up the pollution and run 80 more generations.', action: [{ type: 'eco-set', environment: 'clean' }, wait(80 * YEAR)], check: saw('light-majority'), observation: 'Light moths come back.', explanation: X('Now the dark ones stand out.', 'Selection reverses.', 'Clean Air Act effect.') },
  ],
  conclusion: X('Living things change over generations to suit their surroundings.', 'Natural selection acts on inherited variation.', 'Classic example of evolution in action.'),
  variations: [{ prompt: 'Use a population of 50. What does chance do?' }],
}
