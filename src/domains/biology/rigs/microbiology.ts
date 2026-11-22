import { z } from 'zod'
import { Rng, type Explanation, type LabEvent, type Rig, settableShape } from '../../../core'

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })

/** Harmless teaching strains. MIC = lowest antibiotic concentration that stops growth (µg/mL). */
export const ORGANISMS = {
  'b-subtilis': { name: 'Bacillus subtilis', gram: '+', optimum: 30, color: '#efe6cf', mic: { penicillin: 0.06, streptomycin: 4, tetracycline: 1, erythromycin: 0.25 } },
  'e-coli': { name: 'E. coli (K-12 lab strain)', gram: '−', optimum: 37, color: '#ece6d6', mic: { penicillin: 64, streptomycin: 8, tetracycline: 2, erythromycin: 64 } },
  micrococcus: { name: 'Micrococcus luteus', gram: '+', optimum: 30, color: '#f2d65a', mic: { penicillin: 0.03, streptomycin: 2, tetracycline: 0.5, erythromycin: 0.1 } },
} as const
export type Organism = keyof typeof ORGANISMS
export const ANTIBIOTICS = { penicillin: 'penicillin', streptomycin: 'streptomycin', tetracycline: 'tetracycline', erythromycin: 'erythromycin', blank: 'blank disc (control)' } as const
export type Antibiotic = keyof typeof ANTIBIOTICS

const DISC_MM = 6
const DIFFUSION_MM = 2.5
const C0 = 100 // effective concentration at the disc edge (µg/mL)
const STOCK_PER_ML = 1e9 // bacteria per mL in the overnight culture

export interface Colony { x: number; y: number; contaminant: boolean }
export interface MicroState {
  mode: 'antibiotics' | 'count' | 'broth'
  organism: Organism
  tempC: number
  dilution: number
  flamed: boolean
  discs: (Antibiotic | null)[]
  seed: number
  inoculated: boolean
  incubating: boolean
  hours: number
  colonies: Colony[]
  /** Broth: bacteria per mL. */
  n: number
  phase: 'lag' | 'log' | 'stationary' | 'death' | null
  stationaryFor: number
  announced: string[]
}

const params = z.object({
  mode: z.enum(['antibiotics', 'count', 'broth']).default('antibiotics'),
  organism: z.enum(['b-subtilis', 'e-coli', 'micrococcus']).default('b-subtilis'),
  tempC: z.number().min(4).max(50).default(30),
  dilution: z.number().int().min(1).max(8).default(6),
  flamed: z.boolean().default(true),
  discs: z.array(z.enum(['penicillin', 'streptomycin', 'tetracycline', 'erythromycin', 'blank']).nullable()).max(4).default(['penicillin', 'streptomycin', 'tetracycline', 'blank']),
  seed: z.number().int().default(99),
})
type P = z.infer<typeof params>
type A =
  | ({ type: 'micro-set' } & Partial<Omit<P, 'seed'>>)
  | { type: 'micro-inoculate' }
  | { type: 'micro-incubate' }
  | { type: 'micro-reset' }

/** Growth rate (doublings per hour) vs temperature: best at the organism's optimum, none when too cold or hot. */
export function doublingsPerHour(o: Organism, t: number) {
  const opt = ORGANISMS[o].optimum
  if (t < 8 || t > opt + 12) return 0
  return 2 * Math.exp(-(((t - opt) / 9) ** 2))
}
const LAG_H = 2
/** Lawn density 0–1 after h hours (logistic in log-space). */
export function lawn(o: Organism, t: number, h: number) {
  const g = doublingsPerHour(o, t) * Math.max(0, h - LAG_H)
  return 1 / (1 + Math.exp(-(g - 18) / 2.5))
}
/** Clear-zone diameter (mm) around a disc. */
export function zoneDiameter(o: Organism, a: Antibiotic) {
  if (a === 'blank') return DISC_MM
  const mic = ORGANISMS[o].mic[a]
  return C0 <= mic ? DISC_MM : Math.min(40, DISC_MM + 2 * DIFFUSION_MM * Math.log(C0 / mic))
}

function whyZones(o: Organism, discs: (Antibiotic | null)[]): Explanation {
  const org = ORGANISMS[o]
  const gramNeg = org.gram === '−'
  const pen = discs.includes('penicillin')
  return X(
    `Each paper disc slowly leaks its antibiotic into the jelly around it, strongest close to the disc and weaker further out. Near the disc the antibiotic is strong enough to stop ${org.name} growing, so a clear ring is left with no bacteria in it. The bigger the ring, the better that antibiotic works against this bacterium.${pen ? (gramNeg ? ' Penicillin barely works here: this bacterium has an extra outer coat that keeps penicillin out.' : ' Penicillin works very well: it stops this bacterium building its cell wall, so it bursts.') : ''} The blank disc is the control: no antibiotic, no ring.`,
    `Antibiotics diffuse outward from each disc, so their concentration falls with distance. Bacteria can't grow wherever it's above the minimum inhibitory concentration (MIC), leaving a zone of inhibition. Lower MIC means a wider zone. ${gramNeg ? 'Gram-negative bacteria have an outer membrane that blocks many drugs, such as penicillin and erythromycin.' : 'Gram-positive bacteria lack an outer membrane, so drugs like penicillin reach their thick peptidoglycan wall easily.'}`,
    `Zone edge where C(r) = MIC: for an approximately exponential diffusion profile, d ≈ d_disc + 2λ·ln(C₀/MIC). Penicillin inhibits transpeptidases (PBPs) in peptidoglycan cross-linking; streptomycin binds the 30S ribosome; tetracycline blocks aminoacyl-tRNA binding (30S); erythromycin blocks the 50S exit tunnel. ${org.name}: Gram ${org.gram}.`,
  )
}

const WHY_COLONIES = X(
  'Each dot is a colony: a pile of millions of bacteria that all grew from one single bacterium that landed there. So counting colonies tells you how many bacteria you spread on the plate. Multiply back up by how much you diluted it, and you know how many were in the original culture.',
  'Each colony arises from one viable cell (a colony-forming unit, CFU). Cells/mL in the original = colonies × dilution factor ÷ volume plated. Plates with 30–300 colonies give reliable counts.',
  'CFU counting assumes well-separated single cells; counts follow a Poisson distribution (SD ≈ √n), which is why plates with too few colonies are imprecise and plates with too many merge (TNTC).',
)
const WHY_CONTAMINATION = X(
  'Those odd fuzzy colonies aren\'t the bacteria you put there: they\'re contaminants, from microbes floating in the air or living on an unflamed loop. Flaming the loop until it glows and keeping the lid on as much as possible stops them getting in.',
  'Aseptic technique (flaming loops, minimising lid-open time, working near a Bunsen\'s updraft) prevents airborne and surface microbes contaminating the culture and spoiling the results.',
  'Contaminant CFUs scale with exposure (area × time × airborne load). A flamed loop is sterilised by heating to red heat (>800 °C), denaturing all proteins and nucleic acids.',
)

const PHASE_WHY: Record<string, Explanation> = {
  log: X('The bacteria have got going: each one splits in two every so often, so the numbers keep doubling, 2, 4, 8, 16… That\'s why the curve shoots up so steeply.', 'Exponential (log) phase: cells divide by binary fission at a constant rate, so the population doubles each generation time.', 'N = N₀·2^(t/g); on a log scale the curve is a straight line with slope ∝ 1/g.'),
  stationary: X('The bacteria have used up most of their food and filled the broth with waste, so new ones are only being made as fast as old ones die. The numbers level off.', 'Stationary phase: nutrients run low and wastes build up, so the growth rate falls to match the death rate; the population plateaus at the carrying capacity.', 'Logistic saturation at K; cells switch on stress responses (e.g. RpoS in E. coli; sporulation in B. subtilis).'),
  death: X('With no food left and poisons building up, more bacteria die than are born, and the numbers fall.', 'Death (decline) phase: the death rate exceeds the division rate, usually exponentially.', 'First-order decline in viable count; turbidity (OD) can lag because dead cells still scatter light.'),
}

function inoculate(s: MicroState): MicroState {
  const rng = new Rng(s.seed)
  const colonies: Colony[] = []
  if (s.mode === 'count') {
    const expected = STOCK_PER_ML * 10 ** -s.dilution * 0.1
    const n = Math.min(2000, rng.poisson(Math.min(expected, 5000)))
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(rng.next()) * 0.92
      const a = rng.next() * Math.PI * 2
      colonies.push({ x: r * Math.cos(a), y: r * Math.sin(a), contaminant: false })
    }
  }
  if (s.mode !== 'broth') {
    const k = rng.poisson((s.flamed ? 0.1 : 5) + 0.15)
    for (let i = 0; i < k; i++) {
      const r = Math.sqrt(rng.next()) * 0.85
      const a = rng.next() * Math.PI * 2
      colonies.push({ x: r * Math.cos(a), y: r * Math.sin(a), contaminant: true })
    }
  }
  return { ...s, seed: rng.seed, inoculated: true, colonies, n: s.mode === 'broth' ? 1e6 : 0, phase: s.mode === 'broth' ? 'lag' : null }
}

const fresh = (s: MicroState): MicroState => ({ ...s, inoculated: false, incubating: false, hours: 0, colonies: [], n: 0, phase: null, stationaryFor: 0, announced: [] })

export const microbiologyRig: Rig<MicroState, A, P> = {
  kind: 'microbiology',
  name: 'microbiology bench',
  dt: 600,
  maxWait: 3 * 86400,
  schemas: {
    params,
    actions: [
      z.object({ type: z.literal('micro-set') }).extend(settableShape(params.omit({ seed: true }))),
      z.object({ type: z.literal('micro-inoculate') }),
      z.object({ type: z.literal('micro-incubate') }),
      z.object({ type: z.literal('micro-reset') }),
    ],
  },
  instruments: [
    { id: 'ruler', name: 'Ruler (zone diameter)', targets: ['zone:0', 'zone:1', 'zone:2', 'zone:3'] },
    { id: 'colony-counter', name: 'Colony counter', targets: ['plate', 'contaminants'] },
    { id: 'cells-per-ml', name: 'Cells per mL in the original (from the count)', targets: ['culture'] },
    { id: 'od-meter', name: 'Optical density (OD₆₀₀)', targets: ['broth'] },
    { id: 'timer', name: 'Incubation time', targets: ['incubator'] },
  ],
  create: (p) => fresh({ ...p, discs: [...p.discs, null, null, null, null].slice(0, 4), inoculated: false, incubating: false, hours: 0, colonies: [], n: 0, phase: null, stationaryFor: 0, announced: [] }),

  apply(s, a) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'micro-set': {
        const patch = Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) as Partial<P>
        const n = { ...s, ...patch, discs: patch.discs ? [...patch.discs, null, null, null, null].slice(0, 4) : s.discs }
        const setupChanged = ['mode', 'organism', 'dilution', 'flamed', 'discs'].some((k) => k in patch)
        const bits = [
          patch.mode && `${patch.mode === 'antibiotics' ? 'antibiotic disc plate' : patch.mode === 'count' ? 'dilution plate for counting' : 'broth culture'}`,
          patch.organism && ORGANISMS[patch.organism].name, patch.tempC !== undefined && `incubator at ${patch.tempC} °C`,
          patch.dilution !== undefined && `dilution 10⁻${patch.dilution}`, patch.flamed !== undefined && (patch.flamed ? 'flaming the loop' : 'not flaming the loop'),
          patch.discs && `discs: ${patch.discs.filter(Boolean).map((d) => ANTIBIOTICS[d!]).join(', ')}`,
        ].filter(Boolean)
        return { state: setupChanged ? fresh(n) : n, events: [act(`Set up: ${bits.join(', ')}.`)] }
      }
      case 'micro-reset':
        return { state: fresh({ ...s, seed: s.seed + 1 }), events: [act('Threw away the old plates and cultures (into the autoclave bag).')] }
      case 'micro-inoculate': {
        if (s.inoculated) return { state: s, events: [] }
        const how = s.mode === 'broth' ? 'Added a drop of overnight culture to a flask of nutrient broth.' : s.mode === 'count' ? `Spread 0.1 mL of the 10⁻${s.dilution} dilution over the agar.` : `Spread the bacteria evenly over the agar and placed the discs.`
        return { state: inoculate(s), events: [act(`${s.flamed || s.mode === 'broth' ? '' : 'Without flaming the loop, '}${how}`)] }
      }
      case 'micro-incubate':
        if (!s.inoculated) throw new Error('Inoculate first.')
        return { state: { ...s, incubating: true }, events: [act(`Put it in the incubator at ${s.tempC} °C.`)] }
    }
  },

  step(s, dt) {
    if (!s.incubating) return { state: s, events: [] }
    const hours = s.hours + dt / 3600
    const events: LabEvent[] = []
    const announced = [...s.announced]
    const once = (key: string, e: LabEvent) => {
      if (announced.includes(key)) return
      announced.push(key)
      events.push(e)
    }
    let { n, phase, stationaryFor } = s
    if (s.mode === 'broth') {
      const mu = doublingsPerHour(s.organism, s.tempC) * Math.LN2
      const K = 2e9
      if (hours > LAG_H) {
        if (phase === 'death' || (phase === 'stationary' && stationaryFor > 10)) {
          phase = 'death'
          n = n * Math.exp(-0.15 * (dt / 3600))
        } else {
          n = n + mu * n * (1 - n / K) * (dt / 3600)
          const next = n > 0.9 * K ? 'stationary' : mu > 0 ? 'log' : phase
          if (next === 'stationary') stationaryFor += dt / 3600
          phase = next
        }
      }
      if (phase === 'log') once('log', { kind: 'observation', text: `After ${hours.toFixed(0)} h the broth is starting to turn cloudy.`, tags: ['log-phase'], why: PHASE_WHY.log })
      if (phase === 'stationary') once('stationary', { kind: 'observation', text: `By ${hours.toFixed(0)} h the cloudiness has stopped increasing.`, tags: ['stationary-phase'], why: PHASE_WHY.stationary })
      if (phase === 'death') once('death', { kind: 'observation', text: `By ${hours.toFixed(0)} h the number of living bacteria is falling.`, tags: ['death-phase'], why: PHASE_WHY.death })
    } else {
      const d = lawn(s.organism, s.tempC, hours)
      if (d > 0.5) {
        if (s.mode === 'antibiotics') {
          const zones = s.discs.map((x) => (x ? `${ANTIBIOTICS[x]}: ${zoneDiameter(s.organism, x).toFixed(0)} mm` : null)).filter(Boolean)
          once('zones', { kind: 'observation', text: `After ${hours.toFixed(0)} h a cloudy lawn of bacteria covers the plate, with clear zones around the discs (${zones.join('; ')}).`, tags: ['zones'], why: whyZones(s.organism, s.discs) })
        } else {
          const real = s.colonies.filter((c) => !c.contaminant).length
          once('colonies', { kind: 'observation', text: real > 300 ? `After ${hours.toFixed(0)} h the colonies have merged: too many to count.` : `After ${hours.toFixed(0)} h there are ${real} colonies on the plate.`, tags: ['colonies', real > 300 ? 'tntc' : 'countable'], why: WHY_COLONIES })
        }
        if (s.colonies.some((c) => c.contaminant)) once('contam', { kind: 'observation', text: 'There are some fuzzy colonies of a different color: contamination!', tags: ['contaminated'], why: WHY_CONTAMINATION })
      }
      if (hours > 6 && doublingsPerHour(s.organism, s.tempC) === 0) once('nogrowth', { kind: 'observation', text: `Nothing is growing at ${s.tempC} °C.`, tags: ['no-growth'], why: X('Bacteria are like us in one way: they have a comfortable temperature range. Too cold and their chemistry slows to a stop; too hot and their proteins break down.', `${ORGANISMS[s.organism].name} grows best near ${ORGANISMS[s.organism].optimum} °C; outside its range its enzymes are too slow or denatured.`, 'Growth rate vs temperature is bounded by Tmin and Tmax; refrigeration (4 °C) halts most mesophiles without killing them.') })
    }
    return { state: { ...s, hours, n, phase, stationaryFor, announced }, events }
  },

  atRest: (s) => !s.incubating,

  measure(s, inst, target) {
    const grown = s.mode !== 'broth' && lawn(s.organism, s.tempC, s.hours) > 0.5
    switch (inst) {
      case 'ruler': {
        const a = s.discs[Number(target.split(':')[1])]
        return a && grown && s.mode === 'antibiotics' ? { quantity: `${ANTIBIOTICS[a]} zone diameter`, value: Math.round(zoneDiameter(s.organism, a)), unit: 'mm', instrument: inst } : null
      }
      case 'colony-counter': {
        if (!grown) return null
        const real = s.colonies.filter((c) => !c.contaminant).length
        if (target === 'contaminants') return { quantity: 'contaminant colonies', value: s.colonies.length - real, unit: '', instrument: inst }
        return s.mode === 'count' && real <= 300 ? { quantity: 'colonies', value: real, unit: '', instrument: inst } : null
      }
      case 'cells-per-ml': {
        const real = s.colonies.filter((c) => !c.contaminant).length
        return grown && s.mode === 'count' && real <= 300 && real > 0 ? { quantity: 'cells per mL in the culture', value: real * 10 ** s.dilution * 10, unit: '/mL', instrument: inst } : null
      }
      case 'od-meter':
        return s.mode === 'broth' && s.inoculated ? { quantity: 'OD₆₀₀', value: Math.round(Math.min(2.5, s.n / 1e9) * 1000) / 1000, unit: '', instrument: inst } : null
      case 'timer':
        return { quantity: 'incubation time', value: Math.round(s.hours * 10) / 10, unit: 'h', instrument: inst }
      default:
        return null
    }
  },
}
