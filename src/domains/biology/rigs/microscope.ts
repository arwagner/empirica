import { z } from 'zod'
import type { Explanation, LabEvent, Rig } from '../../../core'

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })

export const OBJECTIVES = [4, 10, 40, 100] as const
export type Objective = (typeof OBJECTIVES)[number]
export const EYEPIECE = 10
/** Field number of the eyepiece (mm): the diameter of the circle you see is FN / objective. */
const FIELD_NUMBER_UM = 18000
/** Depth of field shrinks as magnification grows: focus tolerance per objective (knob units). */
const TOLERANCE: Record<Objective, number> = { 4: 8, 10: 4, 40: 1.4, 100: 0.6 }
/** Objectives are nearly (not perfectly) parfocal: a small refocus is needed after switching. */
const OFFSET: Record<Objective, number> = { 4: 0, 10: 1.5, 40: 3.5, 100: 5 }
/** Smallest thing each objective can resolve (µm); 100× needs immersion oil to reach its limit. */
const RESOLUTION: Record<Objective, number> = { 4: 3, 10: 1.2, 40: 0.5, 100: 0.25 }

export const STAINS = {
  none: { name: 'no stain' },
  iodine: { name: 'iodine' },
  'methylene-blue': { name: 'methylene blue' },
  'crystal-violet': { name: 'crystal violet (Gram stain)' },
} as const
export type Stain = keyof typeof STAINS

/** A feature you can see in a specimen, and what it takes to see it. */
interface Feature {
  id: string
  name: string
  /** Typical size, µm. */
  size: number
  /** Stains that make it visible; empty = visible unstained. */
  needs?: Stain[]
  why: Explanation
}

export interface Specimen {
  id: string
  name: string
  /** The main "cell" you'd measure, µm (length). */
  cellLength: number
  /** Focus position (knob units 0–100) where the 4× image is sharp. */
  focus: number
  /** Unstained living things move about; staining kills them. */
  alive?: boolean
  features: Feature[]
}

export const SPECIMENS: Record<string, Specimen> = {
  onion: {
    id: 'onion', name: 'onion skin', cellLength: 250, focus: 42,
    features: [
      { id: 'cells', name: 'brick-shaped cells in neat rows', size: 250, why: X('Plants are built from tiny boxes called cells. Onion skin is just one cell thick, so light shines through and you can see each one.', 'Plant cells are surrounded by a stiff cell wall made of cellulose, which gives them their regular, brick-like shapes.', 'Epidermal cells of the onion bulb scale: elongated parenchyma with primary cellulose walls; a single layer, ideal for light microscopy.') },
      { id: 'nucleus', name: 'a dark dot (the nucleus) in each cell', size: 20, needs: ['iodine', 'methylene-blue'], why: X('The nucleus is the cell\'s control centre: it holds the instructions (DNA) for the cell. It\'s almost invisible until a stain soaks into it and darkens it.', 'Stains bind to particular chemicals. Iodine and methylene blue collect in the nucleus, which is packed with DNA and proteins, so it shows up darker than the watery cytoplasm around it.', 'Methylene blue is a cationic dye that binds anionic phosphate groups in nucleic acids; iodine stains the nucleus and cell wall brown by complexing with proteins and polysaccharides.') },
      { id: 'cell-wall', name: 'thick, clear cell walls between cells', size: 3, why: X('The lines between cells are cell walls. They\'re stiff, like the walls of a box, which is why plant cells keep their shape.', 'Every plant cell has a cellulose cell wall outside its membrane. It\'s strong and permeable, and holds the cell\'s shape.', 'Primary walls (~1–3 µm) of cellulose microfibrils in a pectin/hemicellulose matrix; resolvable at 100× total and above.') },
    ],
  },
  cheek: {
    id: 'cheek', name: 'cheek cells', cellLength: 60, focus: 40,
    features: [
      { id: 'cells', name: 'flat, irregular cells scattered around', size: 60, why: X('These are your own cells, scraped from inside your cheek. They\'re thin and floppy because animal cells don\'t have stiff walls.', 'Animal cells have only a flexible cell membrane, no cell wall, so they have rounded, irregular shapes and fold easily.', 'Squamous epithelial cells, ~50–60 µm across and very flat; no cell wall or chloroplasts.') },
      { id: 'nucleus', name: 'a blue nucleus in the middle of each cell', size: 8, needs: ['methylene-blue', 'iodine'], why: X('Methylene blue soaks into the nucleus, the part holding the cell\'s DNA, and turns it dark blue so you can see it.', 'The positively charged dye sticks to the negatively charged DNA concentrated in the nucleus.', 'Cationic methylene blue binds the phosphate backbone of nuclear DNA/RNA; the nucleus (~8 µm) is easily resolved at 400×.') },
    ],
  },
  leaf: {
    id: 'leaf', name: 'leaf epidermis', cellLength: 50, focus: 47,
    features: [
      { id: 'cells', name: 'wavy jigsaw-shaped cells', size: 50, why: X('The skin of a leaf is made of cells that fit together like jigsaw pieces, which makes the leaf surface strong.', 'Leaf epidermal pavement cells interlock with wavy walls, which helps resist tearing.', 'Lobed pavement cells: the undulating anticlinal walls distribute mechanical stress across the epidermis.') },
      { id: 'stomata', name: 'tiny mouth-shaped pores (stomata)', size: 25, why: X('Those little "mouths" are stomata, the holes leaves breathe through. They let carbon dioxide in for photosynthesis and let water vapour out.', 'Each stoma is a pore between two guard cells. The guard cells swell or shrink to open and close it, controlling gas exchange and water loss.', 'Guard cells change turgor via K⁺ fluxes; stomatal aperture balances CO₂ uptake against transpiration.') },
      { id: 'chloroplasts', name: 'green specks (chloroplasts) inside the guard cells', size: 4, why: X('The green specks are chloroplasts, where the cell makes food from sunlight.', 'Chloroplasts contain chlorophyll, the green pigment that captures light for photosynthesis.', 'Chloroplasts (~4 µm) contain thylakoid membranes with chlorophyll a/b; guard cells are among the few epidermal cells with them.') },
    ],
  },
  pond: {
    id: 'pond', name: 'pond water', cellLength: 200, focus: 38, alive: true,
    features: [
      { id: 'paramecium', name: 'slipper-shaped paramecia swimming fast', size: 200, why: X('A paramecium is a whole living creature made of just one cell. It swims by waving tiny hairs called cilia.', 'Single-celled organisms do everything (eat, move, reproduce) inside one cell. Paramecia beat thousands of cilia to swim.', 'Ciliate protist; coordinated metachronal ciliary beating gives ~1 mm s⁻¹; oral groove sweeps in bacteria.') },
      { id: 'euglena', name: 'green, teardrop-shaped euglena', size: 50, why: X('Euglena is a one-celled living thing that can make its own food from light, like a plant, but also swim, like an animal.', 'Euglena has chloroplasts for photosynthesis and a whip-like flagellum for swimming, plus a red eyespot to find light.', 'Euglenozoan with secondary chloroplasts, a single emergent flagellum and a photoreceptive eyespot (stigma).') },
      { id: 'amoeba', name: 'a slowly oozing amoeba', size: 300, why: X('An amoeba moves by oozing: it pushes out part of its body and flows into it.', 'Amoebae move and feed with pseudopodia ("false feet"), extensions of their cytoplasm.', 'Amoeboid motility via actin polymerisation at the leading edge of pseudopodia.') },
    ],
  },
  blood: {
    id: 'blood', name: 'blood smear', cellLength: 7.5, focus: 44,
    features: [
      { id: 'rbc', name: 'thousands of pale red discs (red blood cells)', size: 7.5, why: X('Red blood cells carry oxygen around your body. They\'re tiny discs, thinner in the middle, which is why they look pale in the centre.', 'Red blood cells have no nucleus, which leaves more room for haemoglobin, the protein that carries oxygen. Their dimpled shape gives a big surface for oxygen to pass through.', 'Erythrocytes: biconcave anucleate discs ~7.5 µm, maximising surface-area-to-volume for O₂ diffusion and deformability through capillaries.') },
      { id: 'wbc', name: 'a few larger cells with purple, lobed nuclei (white blood cells)', size: 12, needs: ['methylene-blue', 'crystal-violet'], why: X('White blood cells fight germs. They\'re bigger than red cells and have a nucleus, which the stain colours purple.', 'Leukocytes keep their nucleus (often lobed in neutrophils), so nuclear stains pick them out among the anucleate red cells.', 'Neutrophils (~12 µm) show 3–5 nuclear lobes; ~1 leukocyte per 600–1000 erythrocytes.') },
    ],
  },
  yeast: {
    id: 'yeast', name: 'yeast', cellLength: 5, focus: 41,
    features: [
      { id: 'cells', name: 'tiny oval cells, some with buds', size: 5, why: X('Yeast is a fungus made of single cells. The little bumps are new cells growing out of old ones: that\'s how yeast reproduces.', 'Yeast reproduces by budding: a daughter cell grows from the parent and pinches off.', 'Saccharomyces cerevisiae, ~5 µm; asymmetric mitotic budding with a bud scar left on the mother cell.') },
    ],
  },
  bacteria: {
    id: 'bacteria', name: 'bacteria (yoghurt culture)', cellLength: 2, focus: 43,
    features: [
      { id: 'bacteria', name: 'tiny purple rods and chains of dots', size: 1, needs: ['crystal-violet'], why: X('Bacteria are the smallest living cells, so small you need the strongest lens and a stain to see them at all.', 'Bacteria are ~1–2 µm, near the limit of what a light microscope can show. Crystal violet stains them purple so they stand out. They\'re "Gram-positive", which keeps the purple dye.', 'Gram-positive Lactobacillus (rods) and Streptococcus (cocci in chains); thick peptidoglycan walls retain the crystal violet–iodine complex. Resolution needs NA ≈ 1.25 with oil.') },
    ],
  },
}

export interface MicroscopeState {
  specimen: string | null
  stain: Stain
  objective: Objective
  focus: number
  light: number
  oil: boolean
  seen: string[]
}

const params = z.object({
  specimen: z.string().nullable().default(null),
  objective: z.union([z.literal(4), z.literal(10), z.literal(40), z.literal(100)]).default(4),
  stain: z.enum(['none', 'iodine', 'methylene-blue', 'crystal-violet']).default('none'),
  focus: z.number().min(0).max(100).default(20),
  oil: z.boolean().default(false),
})
type A =
  | { type: 'mic-load'; specimen: string }
  | { type: 'mic-stain'; stain: Stain }
  | { type: 'mic-objective'; objective: Objective }
  | { type: 'mic-focus'; focus: number }
  | { type: 'mic-light'; light: number }
  | { type: 'mic-oil' }

export const totalMagnification = (s: MicroscopeState) => s.objective * EYEPIECE
export const fieldOfView = (s: MicroscopeState) => FIELD_NUMBER_UM / s.objective

/** 0–1: how sharp the image is (focus error vs depth of field; 100× without oil is never sharp). */
export function sharpness(s: MicroscopeState): number {
  const sp = s.specimen ? SPECIMENS[s.specimen] : null
  if (!sp) return 0
  const err = Math.abs(s.focus - (sp.focus + OFFSET[s.objective]))
  const blur = Math.exp(-((err / TOLERANCE[s.objective]) ** 2))
  return s.objective === 100 && !s.oil ? Math.min(blur, 0.35) : blur
}

/** Features visible right now: big enough to resolve, large enough to see, stained if needed, in focus. */
export function visibleFeatures(s: MicroscopeState): Feature[] {
  const sp = s.specimen ? SPECIMENS[s.specimen] : null
  if (!sp || sharpness(s) < 0.6 || s.light < 0.15) return []
  const M = totalMagnification(s)
  const res = s.objective === 100 && !s.oil ? RESOLUTION[40] : RESOLUTION[s.objective]
  return sp.features.filter((f) => f.size >= res && f.size * M >= 400 && (!f.needs || f.needs.includes(s.stain)))
}

function look(prev: MicroscopeState, next: MicroscopeState): { state: MicroscopeState; events: LabEvent[] } {
  const events: LabEvent[] = []
  const seen = [...next.seen]
  for (const f of visibleFeatures(next)) {
    const key = `${next.specimen}:${f.id}`
    if (seen.includes(key)) continue
    seen.push(key)
    events.push({ kind: 'observation', text: `At ${totalMagnification(next)}×, you can see ${f.name}.`, tags: ['seen', `seen:${key}`], why: f.why })
  }
  if (next.objective === 100 && !next.oil && prev.objective !== 100 && next.specimen)
    events.push({ kind: 'observation', text: 'At 100× the image stays dim and fuzzy however you focus.', tags: ['needs-oil'], why: X('The strongest lens is so close to the slide that light bends away as it passes from glass into air, blurring the picture. A drop of oil fills the gap and keeps the light on track.', 'Immersion oil has nearly the same refractive index as glass, so light isn\'t refracted away at the slide–air boundary; that lets the lens collect enough light to resolve fine detail.', 'Without oil the numerical aperture is limited to < 1 (air); oil (n ≈ 1.515) allows NA ≈ 1.25, halving the resolvable distance d = 0.61λ/NA.') })
  if (next.specimen && SPECIMENS[next.specimen].alive && next.stain !== 'none' && prev.stain === 'none')
    events.push({ kind: 'observation', text: 'The swimming organisms stop moving.', tags: ['stained-dead'], why: X('Most stains are poisonous to tiny living things, so staining kills them. That\'s why you look at pond life unstained.', 'Staining usually fixes (kills) cells: great for seeing structure, but you lose the behaviour.', 'Dyes permeabilise and denature living protists; vital stains at low concentration are the exception.') })
  return { state: { ...next, seen }, events }
}

export const microscopeRig: Rig<MicroscopeState, A, z.infer<typeof params>> = {
  kind: 'microscope',
  name: 'microscope',
  schemas: {
    params,
    actions: [
      z.object({ type: z.literal('mic-load'), specimen: z.enum(Object.keys(SPECIMENS) as [string, ...string[]]) }),
      z.object({ type: z.literal('mic-stain'), stain: z.enum(Object.keys(STAINS) as [Stain, ...Stain[]]) }),
      z.object({ type: z.literal('mic-objective'), objective: z.union([z.literal(4), z.literal(10), z.literal(40), z.literal(100)]) }),
      z.object({ type: z.literal('mic-focus'), focus: z.number().min(0).max(100) }),
      z.object({ type: z.literal('mic-light'), light: z.number().min(0).max(1) }),
      z.object({ type: z.literal('mic-oil') }),
    ],
  },
  instruments: [
    { id: 'magnification', name: 'Total magnification', targets: ['microscope'] },
    { id: 'field-of-view', name: 'Field of view (eyepiece graticule)', targets: ['microscope'] },
    { id: 'graticule', name: 'Eyepiece graticule (cell length)', targets: ['cell'] },
    { id: 'cell-count', name: 'Cells in the field of view', targets: ['cell'] },
    { id: 'sharpness', name: 'Image sharpness', targets: ['microscope'] },
  ],
  create: (p) => ({ specimen: p.specimen, stain: p.stain, objective: p.objective, focus: p.focus, light: 0.6, oil: p.oil, seen: [] }),

  apply(s, a) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    let next: MicroscopeState
    let text: string
    switch (a.type) {
      case 'mic-load':
        next = { ...s, specimen: a.specimen, stain: 'none', oil: false, objective: 4 }
        text = `Put a slide of ${SPECIMENS[a.specimen].name} on the stage and switched to the 4× objective.`
        break
      case 'mic-stain':
        next = { ...s, stain: a.stain }
        text = a.stain === 'none' ? 'Made a fresh unstained slide.' : `Added a drop of ${STAINS[a.stain].name} to the slide.`
        break
      case 'mic-objective':
        next = { ...s, objective: a.objective }
        text = `Turned to the ${a.objective}× objective (${a.objective * EYEPIECE}× total).`
        break
      case 'mic-focus':
        next = { ...s, focus: a.focus }
        text = `Adjusted the focus to ${a.focus.toFixed(1)}.`
        break
      case 'mic-light':
        next = { ...s, light: a.light }
        text = `Set the light to ${Math.round(a.light * 100)}%.`
        break
      case 'mic-oil':
        next = { ...s, oil: true }
        text = 'Put a drop of immersion oil on the slide.'
        break
    }
    const r = look(s, next)
    return { state: r.state, events: [act(text), ...r.events] }
  },
  step: (s) => ({ state: s, events: [] }),
  atRest: () => true,

  measure(s, inst) {
    const sp = s.specimen ? SPECIMENS[s.specimen] : null
    switch (inst) {
      case 'magnification':
        return { quantity: 'total magnification', value: totalMagnification(s), unit: '×', instrument: inst }
      case 'field-of-view':
        return { quantity: 'field of view diameter', value: fieldOfView(s), unit: 'µm', instrument: inst }
      case 'sharpness':
        return { quantity: 'sharpness', value: Math.round(sharpness(s) * 100), unit: '%', instrument: inst }
      case 'graticule': {
        if (!sp || !visibleFeatures(s).length) return null
        // Graticule divisions are 1/100 of the field; reading is to the nearest division.
        const div = fieldOfView(s) / 100
        return { quantity: `${sp.name} cell length`, value: Math.max(div, Math.round(sp.cellLength / div) * div), unit: 'µm', instrument: inst }
      }
      case 'cell-count': {
        if (!sp || !visibleFeatures(s).length) return null
        const area = Math.PI * (fieldOfView(s) / 2) ** 2
        return { quantity: 'cells in view (approx.)', value: Math.max(1, Math.round((area / (sp.cellLength * sp.cellLength * (sp.id === 'onion' ? 0.25 : 1))) * (sp.alive ? 0.02 : sp.id === 'cheek' ? 0.15 : 0.8))), unit: '', instrument: inst }
      }
      default:
        return null
    }
  },
}
