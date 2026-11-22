import { z } from 'zod'
import { Rng, type Explanation, type LabEvent, type Rig, settableShape } from '../../../core'

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })
export const YEAR = 365.25 * 86400

export interface EcoPoint { t: number; a: number; b: number }
export interface EcoState {
  mode: 'predator-prey' | 'selection'
  // predator–prey
  rabbits: number
  foxes: number
  K: number
  predation: number
  foxDeath: number
  // selection
  environment: 'clean' | 'sooty'
  darkAllele: number
  popSize: number
  generation: number
  seed: number
  running: boolean
  years: number
  history: EcoPoint[]
  rising: { r: boolean; f: boolean }
  lastPeak: { r: number | null; f: number | null }
  /** Months between the latest rabbit peak and the fox peak that followed it. */
  lag: number | null
  announced: string[]
}

const params = z.object({
  mode: z.enum(['predator-prey', 'selection']).default('predator-prey'),
  rabbits: z.number().min(0).max(10000).default(800),
  foxes: z.number().min(0).max(1000).default(60),
  K: z.number().min(200).max(20000).default(8000),
  predation: z.number().min(0.0005).max(0.02).default(0.004),
  foxDeath: z.number().min(0.1).max(2).default(0.6),
  environment: z.enum(['clean', 'sooty']).default('sooty'),
  darkAllele: z.number().min(0).max(1).default(0.02),
  popSize: z.number().int().min(50).max(10000).default(1000),
  seed: z.number().int().default(1848),
})
type P = z.infer<typeof params>
type A = ({ type: 'eco-set' } & Partial<Omit<P, 'seed'>>) | { type: 'eco-run' } | { type: 'eco-reset' }

const RABBIT_BIRTH = 1.2 // per year
const FOX_EFFICIENCY = 0.1 // foxes made per rabbit eaten
/** Chance a moth survives to breed, by color and bark. */
export const SURVIVAL = { clean: { light: 0.6, dark: 0.4 }, sooty: { light: 0.4, dark: 0.6 } } as const

/** Dark (melanic) moths carry at least one dominant dark allele: p² + 2pq (Hardy–Weinberg). */
export const darkFraction = (p: number) => p * p + 2 * p * (1 - p)

const WHY_CYCLE = X(
  'When there are lots of rabbits, the foxes have plenty to eat and raise more cubs, so fox numbers rise. But more foxes eat more rabbits, so the rabbits drop, and then the foxes go hungry and drop too. With few foxes, the rabbits bounce back, and round it goes. The fox peak always comes a bit after the rabbit peak, because it takes time for well-fed foxes to have young.',
  'Predator and prey populations are linked by feedback: prey abundance raises predator births, and predator abundance raises prey deaths. This produces oscillations, with the predator peak lagging the prey peak. Limited grass (carrying capacity) damps the swings over time.',
  'Lotka–Volterra with logistic prey: dR/dt = rR(1 − R/K) − aRF, dF/dt = baRF − mF. The coexistence equilibrium is R* = m/(ba), F* = r(1 − R*/K)/a; the K term makes it a stable focus (damped oscillations, phase lag ≈ ¼ period).',
)
const WHY_LOGISTIC = X(
  'With no foxes to eat them, the rabbits multiply quickly at first, but the island only has so much grass. As food runs short, fewer babies survive, and the numbers level off at the most the island can feed: its carrying capacity.',
  'Without predators, the rabbits grow logistically: nearly exponential at first, then slowing as competition for food increases, levelling off at the carrying capacity K.',
  'dR/dt = rR(1 − R/K): an S-shaped curve with inflection at K/2 and asymptote K.',
)
const WHY_SELECTION = X(
  'Birds eat the moths they can see. On dark, sooty bark the light moths stand out and get eaten more, while the dark ones are camouflaged and survive to lay eggs. Moth color is passed on from parents, so each generation there are more dark moths. That\'s natural selection: nobody chooses, the better-hidden ones just leave more offspring.',
  'Natural selection: there is variation (light vs dark), it\'s inherited (a dark allele, dominant), and it affects survival (camouflage against predators). Better-camouflaged moths leave more offspring, so the dark allele\'s frequency rises over generations. When the bark is clean, the advantage reverses.',
  'Each generation, genotype frequencies start in Hardy–Weinberg proportions; viability selection by phenotype changes the allele frequency (Δp depends on the relative fitness of dark vs light); finite N adds binomial drift. Melanism rose in industrial Britain (Kettlewell) and fell after the Clean Air Acts.',
)

const fresh = (s: EcoState, p?: Partial<P>): EcoState => ({
  ...s, running: false, years: 0, generation: 0, history: [], rising: { r: true, f: true }, lastPeak: { r: null, f: null }, lag: null, announced: [],
  rabbits: p?.rabbits ?? s.rabbits, foxes: p?.foxes ?? s.foxes, darkAllele: p?.darkAllele ?? s.darkAllele,
})

export const ecologyRig: Rig<EcoState, A, P> = {
  kind: 'ecology',
  name: 'ecology station',
  dt: YEAR / 100,
  maxWait: 200 * YEAR,
  schemas: {
    params,
    actions: [z.object({ type: z.literal('eco-set') }).extend(settableShape(params.omit({ seed: true }))), z.object({ type: z.literal('eco-run') }), z.object({ type: z.literal('eco-reset') })],
  },
  instruments: [
    { id: 'census', name: 'Population count', targets: ['rabbits', 'foxes', 'moths'] },
    { id: 'dark-percent', name: 'Dark moths (%)', targets: ['moths'] },
    { id: 'allele-frequency', name: 'Dark allele frequency', targets: ['moths'] },
    { id: 'peak-lag', name: 'Fox peak lag behind rabbit peak', targets: ['cycle'] },
    { id: 'timer', name: 'Years / generations', targets: ['years', 'generations'] },
  ],
  create: (p) => fresh({ ...p, generation: 0, running: false, years: 0, history: [], rising: { r: true, f: true }, lastPeak: { r: null, f: null }, lag: null, announced: [] }),

  apply(s, a) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'eco-set': {
        const patch = Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) as Partial<P>
        const restart = ['mode', 'rabbits', 'foxes', 'darkAllele', 'popSize'].some((k) => k in patch)
        const n = { ...s, ...patch }
        const bits = Object.entries(patch).map(([k, v]) => `${k === 'K' ? 'grass for' : k} ${v}${k === 'K' ? ' rabbits' : ''}`)
        // Changing the environment mid-run is an event in the story (e.g. clean air laws), not a restart.
        return { state: restart ? fresh(n, patch) : n, events: [act(patch.environment && !restart ? `The bark is now ${patch.environment === 'clean' ? 'clean and pale (pollution cleaned up)' : 'covered in soot (pollution)'}.` : `Changed the setup: ${bits.join(', ')}.`)] }
      }
      case 'eco-reset':
        return { state: fresh({ ...s, seed: s.seed + 1 }), events: [act('Reset the populations.')] }
      case 'eco-run':
        if (s.running) return { state: s, events: [] }
        return {
          state: { ...s, running: true, history: s.history.length ? s.history : [{ t: 0, a: s.mode === 'selection' ? darkFraction(s.darkAllele) * 100 : s.rabbits, b: s.mode === 'selection' ? s.darkAllele : s.foxes }] },
          events: [act(s.mode === 'selection' ? `Released ${s.popSize} moths (${(darkFraction(s.darkAllele) * 100).toFixed(1)}% dark) onto ${s.environment} bark.` : `Released ${Math.round(s.rabbits)} rabbits and ${Math.round(s.foxes)} foxes on the island.`)],
        }
    }
  },

  step(s, dt) {
    if (!s.running) return { state: s, events: [] }
    const events: LabEvent[] = []
    const announced = [...s.announced]
    const once = (key: string, e: LabEvent) => {
      if (!announced.includes(key)) {
        announced.push(key)
        events.push(e)
      }
    }
    const years = s.years + dt / YEAR
    if (s.mode === 'predator-prey') {
      const h = dt / YEAR
      const R = s.rabbits
      const F = s.foxes
      const dR = RABBIT_BIRTH * R * (1 - R / s.K) - s.predation * R * F
      const dF = FOX_EFFICIENCY * s.predation * R * F - s.foxDeath * F
      let rabbits = Math.max(0, R + dR * h)
      let foxes = Math.max(0, F + dF * h)
      if (rabbits < 2 && R >= 2) { rabbits = 0; once('rabbits-extinct', { kind: 'observation', text: `The rabbits have died out after ${years.toFixed(1)} years.`, tags: ['extinct', 'extinct:rabbits'] }) }
      if (foxes < 2 && F >= 2) {
        foxes = 0
        once('foxes-extinct', { kind: 'observation', text: `The foxes have died out after ${years.toFixed(1)} years: there weren't enough rabbits to feed them.`, tags: ['extinct', 'extinct:foxes'], why: X('Foxes need to eat a certain number of rabbits to survive and raise cubs. If rabbits get too scarce for too long, the foxes starve faster than they can breed.', 'If prey density stays below the level that lets predators replace their losses (R* = m/(ba)), the predator population declines to extinction.', 'Predator persistence requires K > m/(ba); below that, F → 0.') })
      }
      // Peak detection for the predator lag.
      const rising = { r: rabbits > R, f: foxes > F }
      const lastPeak = { ...s.lastPeak }
      let lag = s.lag
      if (s.rising.r && !rising.r && R > 50) lastPeak.r = years
      if (s.rising.f && !rising.f && F > 5) {
        lastPeak.f = years
        if (lastPeak.r !== null) lag = Math.round((years - lastPeak.r) * 12)
        if (lastPeak.r !== null) once('cycle', { kind: 'observation', text: `The foxes peaked ${((years - lastPeak.r) * 12).toFixed(0)} months after the rabbits did.`, tags: ['cycle', 'predator-lag'], why: WHY_CYCLE })
      }
      if (s.foxes === 0 && rabbits > 0.95 * s.K) once('carrying', { kind: 'observation', text: `With no foxes, the rabbits level off at about ${Math.round(rabbits)}: all the island can feed.`, tags: ['carrying-capacity'], why: WHY_LOGISTIC })
      const history = Math.floor(years * 10) > Math.floor(s.years * 10) ? [...s.history, { t: years, a: rabbits, b: foxes }] : s.history
      return { state: { ...s, rabbits, foxes, years, rising, lastPeak, lag, history: history.slice(-2000), announced }, events }
    }
    // Selection: one generation per year boundary.
    if (Math.floor(years) === Math.floor(s.years)) return { state: { ...s, years }, events }
    const p = s.darkAllele
    const surv = SURVIVAL[s.environment]
    const DD = p * p
    const Dd = 2 * p * (1 - p)
    const dd = (1 - p) ** 2
    const wDD = DD * surv.dark
    const wDd = Dd * surv.dark
    const wdd = dd * surv.light
    const pSel = (wDD + wDd / 2) / (wDD + wDd + wdd)
    const rng = new Rng(s.seed)
    const darkAllele = rng.binomial(2 * s.popSize, pSel) / (2 * s.popSize)
    const generation = s.generation + 1
    const before = darkFraction(p)
    const after = darkFraction(darkAllele)
    if (before < 0.5 && after >= 0.5) once(`dark-majority-${s.environment}`, { kind: 'observation', text: `Generation ${generation}: dark moths are now the majority (${(after * 100).toFixed(0)}%).`, tags: ['dark-majority'], why: WHY_SELECTION })
    if (before >= 0.5 && after < 0.5) once(`light-majority-${s.environment}`, { kind: 'observation', text: `Generation ${generation}: light moths are the majority again (${((1 - after) * 100).toFixed(0)}%).`, tags: ['light-majority'], why: WHY_SELECTION })
    if (darkAllele === 0 && p > 0) once('lost', { kind: 'observation', text: `Generation ${generation}: the dark allele has been lost completely.`, tags: ['allele-lost'] })
    return { state: { ...s, years, generation, darkAllele, seed: rng.seed, history: [...s.history, { t: generation, a: after * 100, b: darkAllele }].slice(-500), announced }, events }
  },

  atRest: (s) => !s.running || (s.mode === 'predator-prey' && s.rabbits === 0 && s.foxes === 0),

  measure(s, inst, target) {
    switch (inst) {
      case 'census':
        if (target === 'rabbits') return { quantity: 'rabbits', value: Math.round(s.rabbits), unit: '', instrument: inst }
        if (target === 'foxes') return { quantity: 'foxes', value: Math.round(s.foxes), unit: '', instrument: inst }
        return { quantity: 'moths', value: s.popSize, unit: '', instrument: inst }
      case 'dark-percent':
        return { quantity: 'dark moths', value: Math.round(darkFraction(s.darkAllele) * 1000) / 10, unit: '%', instrument: inst }
      case 'allele-frequency':
        return { quantity: 'dark allele frequency', value: Math.round(s.darkAllele * 1000) / 1000, unit: '', instrument: inst }
      case 'peak-lag':
        return s.lag !== null ? { quantity: 'fox peak lag', value: s.lag, unit: 'months', instrument: inst } : null
      case 'timer':
        return target === 'generations' ? { quantity: 'generations', value: s.generation, unit: '', instrument: inst } : { quantity: 'time', value: Math.round(s.years * 10) / 10, unit: 'years', instrument: inst }
      default:
        return null
    }
  },
}
