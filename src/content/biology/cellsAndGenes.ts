import { all, reading, saw, X, type BiologyExperiment } from './helpers'

export const onionCells: BiologyExperiment = {
  id: 'onion-cells', domain: 'biology', title: 'Looking at plant cells', summary: 'Focus on onion skin, stain it with iodine, and measure a cell.',
  topics: ['cells', 'microscopy', 'plants'], difficulty: 'intro', minutes: 8, station: 'microscope-station', hazards: [{ kind: 'irritant', note: 'Iodine stains skin and clothes' }],
  setup: { rig: { kind: 'microscope', params: { specimen: 'onion' } } },
  intro: X('Every living thing is made of tiny building blocks called cells. Let\'s see some, inside the thin skin of an onion.', 'We\'ll prepare a slide of onion epidermis, use the microscope properly (low power first, then focus, then higher power), stain it, and estimate the size of one cell.', 'Light microscopy of onion bulb epidermis: a single layer of cells, ideal for practising focusing, staining and graticule measurements.'),
  steps: [
    { instruction: 'With the 4× objective, turn the focus knob until the image is sharp (about 42).', action: [{ type: 'mic-focus', focus: 42 }], check: saw('seen:onion:cells'), observation: 'Rows of brick-shaped cells appear.', explanation: X('Those boxes are cells. Onion skin is only one cell thick, so light shines right through.', 'Start at low power: it has the widest field of view and the deepest focus, so it\'s easiest to find the specimen.', 'Low NA objectives have a large depth of field (~tens of µm), making coarse focusing forgiving.') },
    { instruction: 'Add a drop of iodine stain to the slide.', action: [{ type: 'mic-stain', stain: 'iodine' }], check: saw('seen:onion:nucleus'), observation: 'A dark dot appears in every cell: the nucleus.', explanation: X('The stain soaks into the nucleus, the cell\'s control centre, and makes it visible.', 'Stains add contrast. Iodine colours the nucleus and cell walls brown so you can see structures that are otherwise almost transparent.', 'Unstained cells are low-contrast phase objects; absorption stains convert them into amplitude contrast.') },
    { instruction: 'Switch to the 10× objective, refocus (about 43.5) and measure a cell with the graticule.', action: [{ type: 'mic-objective', objective: 10 }, { type: 'mic-focus', focus: 43.5 }], check: reading('graticule', 'cell', 235, 265), observation: 'One cell is about 250 µm long: a quarter of a millimetre.', explanation: X('Each cell is about a quarter of a millimetre long, so about 4 fit in a millimetre.', 'Graticule divisions are calibrated for each objective (here 18 µm per division at 10×). The cell spans about 14 divisions.', 'Calibration: FOV = field number / objective magnification = 18 mm / 10 = 1.8 mm; 1/100 FOV = 18 µm per division.') },
  ],
  conclusion: X('Plants are made of box-shaped cells with walls, and each one has a nucleus.', 'Plant cells have a cellulose cell wall, a membrane, cytoplasm and a nucleus. Staining and correct microscope technique make them visible and measurable.', 'Magnification = objective × eyepiece; resolution, not magnification, limits what light microscopes can show (~0.2 µm).'),
  variations: [{ prompt: 'Try methylene blue instead of iodine. Which shows the nucleus better?' }, { prompt: 'At 40×, how many cells fit across the field of view?' }],
}

export const cheekCells: BiologyExperiment = {
  id: 'cheek-cells', domain: 'biology', title: 'Your own cells', summary: 'Look at cheek cells and find their nuclei with methylene blue.',
  topics: ['cells', 'microscopy', 'animals'], difficulty: 'intro', minutes: 6, station: 'microscope-station', hazards: [],
  setup: { rig: { kind: 'microscope', params: { specimen: 'cheek' } } },
  intro: X('You\'re made of cells too! These were gently scraped from the inside of a cheek.', 'Animal cells look different from plant cells. Let\'s compare.', 'Squamous epithelium from the buccal mucosa: flat, anucleate-looking until stained.'),
  steps: [
    { instruction: 'Focus at 4× (about 40).', action: [{ type: 'mic-focus', focus: 40 }], check: saw('seen:cheek:cells'), observation: 'Flat, irregular, floppy-looking cells scattered about.', explanation: X('Animal cells have no stiff wall, so they\'re all different shapes.', 'No cell wall: only a flexible membrane, so cheek cells are irregular and fold easily.', 'No cellulose wall; cytoskeleton and junctions maintain epithelial shape in vivo.') },
    { instruction: 'Add methylene blue, switch to 10× and refocus (about 41.5).', action: [{ type: 'mic-stain', stain: 'methylene-blue' }, { type: 'mic-objective', objective: 10 }, { type: 'mic-focus', focus: 41.5 }], check: saw('seen:cheek:nucleus'), observation: 'A blue nucleus sits in the middle of each cell.', explanation: X('The blue dye sticks to the DNA in the nucleus.', 'Methylene blue is positively charged and binds the negatively charged DNA concentrated in the nucleus.', 'Cationic dye binding to nucleic acid phosphates.') },
  ],
  conclusion: X('Animal cells have a nucleus but no cell wall, which is why they\'re floppy and irregular.', 'Compared with plant cells: no cell wall, no large vacuole, no chloroplasts. Both have a nucleus, cytoplasm and membrane.', 'Eukaryotic cell comparison; animal cells rely on the cytoskeleton and extracellular matrix rather than a wall.'),
  variations: [{ prompt: 'Look at a leaf. Can you find something plant cells have that cheek cells don\'t?' }],
}

export const stomata: BiologyExperiment = {
  id: 'leaf-stomata', domain: 'biology', title: 'How leaves breathe', summary: 'Find the pores (stomata) in a leaf\'s skin and the chloroplasts in their guard cells.',
  topics: ['cells', 'plants', 'microscopy', 'photosynthesis'], difficulty: 'intro', minutes: 6, station: 'microscope-station', hazards: [],
  setup: { rig: { kind: 'microscope', params: { specimen: 'leaf' } } },
  intro: X('Leaves need to take in air and let out water vapour. Where are the holes?', 'We\'ll look at the lower epidermis of a leaf for stomata.', 'Stomatal density and guard-cell structure on the abaxial epidermis.'),
  steps: [
    { instruction: 'Focus at 4× (about 47).', action: [{ type: 'mic-focus', focus: 47 }], check: saw('seen:leaf:stomata'), observation: 'Jigsaw-shaped cells, with little "mouths" dotted among them.', explanation: X('Those mouths are stomata: tiny pores that let gases in and out.', 'Each stoma is a pore between two guard cells.', 'Guard cells regulate aperture via turgor.') },
    { instruction: 'Zoom in to 40× and refocus (about 50.5).', action: [{ type: 'mic-objective', objective: 40 }, { type: 'mic-focus', focus: 50.5 }], check: saw('seen:leaf:chloroplasts'), observation: 'Green specks inside the guard cells.', explanation: X('Those green specks are chloroplasts, where the plant makes food from light.', 'Guard cells have chloroplasts; most other epidermal cells don\'t.', 'Guard-cell chloroplasts contribute to sensing and to osmotic changes.') },
  ],
  conclusion: X('Leaves have tiny pores called stomata to let carbon dioxide in and water vapour out.', 'Stomata control gas exchange; guard cells open and close them.', 'Trade-off between CO₂ uptake and transpiration.'),
  variations: [{ prompt: 'Count the stomata in the field of view at 10×. How many per square millimetre is that?' }],
}

export const bacteriaUnderOil: BiologyExperiment = {
  id: 'bacteria-under-oil', domain: 'biology', title: 'Seeing bacteria', summary: 'The smallest cells need a stain, the strongest lens and a drop of oil.',
  topics: ['microscopy', 'bacteria', 'resolution'], difficulty: 'advanced', minutes: 8, station: 'microscope-station', hazards: [],
  setup: { rig: { kind: 'microscope', params: { specimen: 'bacteria' } } },
  intro: X('Bacteria are so small that a thousand of them in a line would only be about as wide as a pencil lead. Can we see them?', 'Bacteria (~1–2 µm) are near the limit of light microscopy: you need the 100× oil-immersion objective and a stain.', 'Resolution d = 0.61λ/NA; NA > 1 requires immersion oil.'),
  steps: [
    { instruction: 'Add crystal violet, switch to the 100× objective and focus (about 48).', action: [{ type: 'mic-stain', stain: 'crystal-violet' }, { type: 'mic-objective', objective: 100 }, { type: 'mic-focus', focus: 48 }], check: saw('needs-oil'), observation: 'The image stays dim and fuzzy.', explanation: X('Without oil, light bends away between the glass and the air, so the picture blurs.', 'Refraction at the slide–air interface limits how much light the lens collects.', 'NA is limited to < 1 in air.') },
    { instruction: 'Add a drop of immersion oil.', action: [{ type: 'mic-oil' }], check: saw('seen:bacteria:bacteria'), observation: 'Tiny purple rods and chains of dots snap into view.', explanation: X('The oil keeps the light on track, and now you can see bacteria!', 'Oil matches glass\'s refractive index, so the full NA (~1.25) is used and resolution improves to ~0.25 µm.', 'Gram-positive cells retain the crystal violet–iodine complex: purple.') },
  ],
  conclusion: X('Bacteria are tiny, but with the right lens, oil and a stain, you can see them.', 'Resolution, not magnification, decides what you can see.', 'Electron microscopes (λ ≈ pm) resolve far smaller structures.'),
  variations: [{ prompt: 'Look at yeast. Is it bigger or smaller than bacteria?' }],
}

const peaStocks = [
  { type: 'gen-stock', slot: 0, traits: { R: 'dominant' } },
  { type: 'gen-stock', slot: 1, traits: { R: 'recessive' } },
] as const

export const mendel: BiologyExperiment = {
  id: 'mendel-peas', domain: 'biology', title: 'Mendel\'s peas', summary: 'Cross round and wrinkled peas; then cross their offspring.',
  topics: ['genetics', 'inheritance', 'dominance'], difficulty: 'intro', minutes: 8, station: 'genetics-station', hazards: [],
  setup: { rig: { kind: 'genetics', params: { organism: 'pea' } } },
  intro: X('In the 1860s, a monk named Gregor Mendel crossed pea plants and discovered how traits are passed on. Let\'s repeat his experiment.', 'We\'ll cross true-breeding round and wrinkled peas, then cross the offspring, and compare the results to Mendel\'s predictions.', 'Monohybrid cross: P (RR × rr) → F1 (Rr) → F2 (1 RR : 2 Rr : 1 rr, 3:1 phenotypes).'),
  steps: [
    { instruction: 'Choose a true-breeding round plant and a true-breeding wrinkled plant, then cross them.', action: [...peaStocks, { type: 'gen-cross' }], check: all(saw('crossed:F1'), saw('uniform')), observation: 'Every single offspring is round!', explanation: X('Where did the wrinkles go? They\'re hidden: round is dominant.', 'Every F1 plant got R from one parent and r from the other: Rr, which looks round.', 'Dominance: one functional allele (R, encoding starch-branching enzyme SBE1) is sufficient.') },
    { instruction: 'Pick two of the round offspring and cross them (1000 offspring).', action: [{ type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-cross', n: 1000 }], check: reading('proportion', 'class:wrinkled', 0.2, 0.3), observation: 'About a quarter of the F2 are wrinkled again!', explanation: X('The wrinkled trait came back! Each round parent secretly carried a wrinkled copy.', 'Rr × Rr gives RR : Rr : rr in a 1 : 2 : 1 ratio, so 3 round : 1 wrinkled.', 'Segregation: each gamete receives one allele with probability ½; χ² tests the fit to 3:1.') },
  ],
  conclusion: X('Traits come in pairs of instructions, one from each parent. A hidden (recessive) instruction can skip a generation and come back.', 'Mendel\'s law of segregation: alleles separate when gametes form, and recombine at random at fertilisation.', 'Mendel\'s actual F2 counts: 5474 round : 1850 wrinkled (2.96 : 1).'),
  variations: [{ prompt: 'Check the χ² readout: does your F2 fit 3:1?' }, { prompt: 'Try flower color or plant height. Same pattern?' }],
}

export const dihybrid: BiologyExperiment = {
  id: 'dihybrid-cross', domain: 'biology', title: 'Two traits at once: 9:3:3:1', summary: 'Follow seed shape and seed color together through two generations.',
  topics: ['genetics', 'independent assortment', 'probability'], difficulty: 'core', minutes: 10, station: 'genetics-station', hazards: [],
  setup: { rig: { kind: 'genetics', params: { organism: 'pea' } } },
  intro: X('What happens when you follow two traits at once? Do they travel together?', 'A dihybrid cross tests whether two genes are inherited independently.', 'Independent assortment of unlinked loci gives (3:1)² = 9:3:3:1 in the F2.'),
  steps: [
    { instruction: 'Score seed shape AND seed color. Cross round-yellow with wrinkled-green (true-breeding).', action: [{ type: 'gen-score', genes: ['R', 'Y'] }, { type: 'gen-stock', slot: 0, traits: { R: 'dominant', Y: 'dominant' } }, { type: 'gen-stock', slot: 1, traits: { R: 'recessive', Y: 'recessive' } }, { type: 'gen-cross' }], check: all(saw('crossed:F1'), saw('uniform')), observation: 'All the F1 are round and yellow.', explanation: X('Both dominant traits show.', 'F1 are RrYy.', 'Doubly heterozygous.') },
    { instruction: 'Cross two F1 plants (1000 offspring).', action: [{ type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant', Y: 'dominant' } }, { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant', Y: 'dominant' } }, { type: 'gen-cross', n: 1000 }], check: reading('proportion', 'class:wrinkled green', 0.03, 0.1), observation: 'Four kinds of peas, roughly 9 : 3 : 3 : 1, including new combinations like round-green.', explanation: X('Shape and color are shuffled separately, so new mixes appear.', 'Each trait still gives 3:1, and because they\'re inherited independently, the combinations multiply: 9/16, 3/16, 3/16, 1/16.', 'Mendel\'s second law; holds for genes on different chromosomes (or far apart on one).') },
  ],
  conclusion: X('Different traits are shuffled independently, making new combinations.', 'Independent assortment gives a 9:3:3:1 ratio in a dihybrid F2.', 'Linkage would show up as an excess of parental combinations.'),
  variations: [{ prompt: 'Try seed shape and plant height. Still 9:3:3:1?' }],
}

export const testCross: BiologyExperiment = {
  id: 'test-cross', domain: 'biology', title: 'The test cross: what\'s hidden inside?', summary: 'A round plant could be RR or Rr. Cross it with wrinkled to find out.',
  topics: ['genetics', 'genotype', 'problem solving'], difficulty: 'advanced', minutes: 10, station: 'genetics-station', hazards: [],
  setup: { rig: { kind: 'genetics', params: { organism: 'pea' } } },
  intro: X('You can\'t tell by looking whether a round pea carries a hidden wrinkled instruction. But you can find out with a clever cross.', 'A test cross with the recessive homozygote reveals an unknown genotype from the offspring ratio.', 'Rr × rr → 1:1; RR × rr → all dominant.'),
  steps: [
    { instruction: 'Make an F2: cross round × wrinkled stocks, then two F1 plants.', action: [...peaStocks, { type: 'gen-cross' }, { type: 'gen-pick', slot: 0, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-pick', slot: 1, generation: 1, phenotype: { R: 'dominant' } }, { type: 'gen-cross' }], check: saw('crossed:F2'), observation: 'An F2 with round and wrinkled peas.', explanation: X('Some round F2 plants are RR, some are Rr.', 'Two-thirds of round F2 plants are Rr, one-third RR.', 'P(Rr | round) = 2/3.') },
    { instruction: 'Pick a round F2 plant (genotype unknown) and cross it with a true-breeding wrinkled plant.', action: [{ type: 'gen-pick', slot: 0, generation: 2, phenotype: { R: 'dominant' } }, { type: 'gen-stock', slot: 1, traits: { R: 'recessive' } }, { type: 'gen-cross' }], check: saw('crossed:Cross 3'), observation: 'Look at the offspring: all round, or about half wrinkled?', explanation: X('If any offspring are wrinkled, the parent must have carried a wrinkled copy.', 'All round → the parent was RR. About 1:1 → it was Rr.', 'The recessive tester contributes only r, so offspring phenotypes directly reveal the unknown parent\'s gametes.') },
  ],
  conclusion: X('Crossing with a recessive plant reveals hidden instructions.', 'The test cross distinguishes homozygous from heterozygous dominant individuals.', 'Breeders use test crosses (and now DNA tests) to identify carriers.'),
  variations: [{ prompt: 'Repeat with another round F2 plant. Did you get the other answer?' }],
}

export const sexLinked: BiologyExperiment = {
  id: 'white-eyed-flies', domain: 'biology', title: 'Morgan\'s white-eyed flies', summary: 'An eye-color trait that shows up mostly in males.',
  topics: ['genetics', 'sex linkage', 'chromosomes'], difficulty: 'advanced', minutes: 10, station: 'genetics-station', hazards: [],
  setup: { rig: { kind: 'genetics', params: { organism: 'fly' } } },
  intro: X('In 1910 Thomas Hunt Morgan found a fruit fly with white eyes instead of red. When he bred it, something strange happened.', 'Crossing red-eyed females with a white-eyed male, then the F1 together, reveals a sex difference.', 'X-linked recessive inheritance (w on the X chromosome).'),
  steps: [
    { instruction: 'Score eye color. Cross a red-eyed female with a white-eyed male.', action: [{ type: 'gen-score', genes: ['W'] }, { type: 'gen-stock', slot: 0, traits: { W: 'dominant' }, sex: 'F' }, { type: 'gen-stock', slot: 1, traits: { W: 'recessive' }, sex: 'M' }, { type: 'gen-cross' }], check: saw('crossed:F1'), observation: 'All the F1, males and females, have red eyes.', explanation: X('Red is dominant, so it hides the white.', 'Daughters are WXw (red); sons get their only X from their red-eyed mother.', 'Hemizygous sons inherit the maternal X.') },
    { instruction: 'Cross an F1 female with an F1 male (1000 offspring).', action: [{ type: 'gen-pick', slot: 0, generation: 1, phenotype: { W: 'dominant' }, sex: 'F' }, { type: 'gen-pick', slot: 1, generation: 1, phenotype: { W: 'dominant' }, sex: 'M' }, { type: 'gen-cross', n: 1000 }], check: all(reading('count', 'class:white-eyed female', 0, 0), reading('proportion', 'class:white-eyed male', 0.18, 0.32)), observation: 'White eyes come back, but only in males, about a quarter of all flies.', explanation: X('The eye-color gene rides on the X chromosome. Males have only one X, so one white copy is enough to give them white eyes.', 'X-linked recessive traits appear more in males: daughters get a red X from their father, but sons get their X only from their mother (carrier).', 'XᵂXʷ × XᵂY → daughters all red (½ carriers); sons ½ red, ½ white.') },
  ],
  conclusion: X('Some genes sit on the sex chromosomes, so traits can show up more in one sex.', 'Sex-linked inheritance explains why conditions like red–green colour blindness are more common in males.', 'Morgan\'s work established the chromosome theory of inheritance (Nobel 1933).'),
  variations: [{ prompt: 'Do the reciprocal cross: white-eyed female × red-eyed male. What do the sons look like?' }],
}
