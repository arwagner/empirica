import { z } from 'zod'
import { settableShape, type Explanation, type LabEvent, type Rig } from '../../../core'

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })

export const FILTERS = {
  white: { name: 'no filter (white light)', factor: 1 },
  red: { name: 'red filter', factor: 0.8 },
  blue: { name: 'blue filter', factor: 0.75 },
  green: { name: 'green filter', factor: 0.15 },
} as const
export type Filter = keyof typeof FILTERS
const MAX_RATE = 60 // bubbles per minute with nothing limiting

export interface Count { distance: number; lux: number; co2: number; tempC: number; filter: Filter; lamp: boolean; n: number }
export interface PhotoState {
  distance: number
  lamp: boolean
  co2: number
  tempC: number
  filter: Filter
  counting: { since: number; n: number } | null
  bubbles: number
  counts: Count[]
}

const params = z.object({
  distance: z.number().min(5).max(100).default(20),
  lamp: z.boolean().default(true),
  co2: z.number().min(0).max(2).default(0.5),
  tempC: z.number().min(5).max(45).default(25),
  filter: z.enum(['white', 'red', 'blue', 'green']).default('white'),
})
type P = z.infer<typeof params>
type A = ({ type: 'photo-set' } & Partial<P>) | { type: 'photo-count' }

/** Light reaching the plant, relative to the lamp at 10 cm (inverse square law), through any filter. */
export const lightLevel = (s: Pick<PhotoState, 'distance' | 'lamp' | 'filter'>) => (s.lamp ? (10 / s.distance) ** 2 * FILTERS[s.filter].factor : 0.002)
const lightTerm = (s: PhotoState) => { const I = lightLevel(s); return I / (I + 0.15) }
const co2Term = (s: PhotoState) => (s.co2 + 0.02) / (s.co2 + 0.2)
/** Enzymes in photosynthesis work faster when warm, up to ~30 °C, then start to break down. */
const tempTerm = (t: number) => Math.exp(-(((t - 30) / 11) ** 2))
const smoothMin = (a: number, b: number, k = 6) => (a * b) / (a ** k + b ** k) ** (1 / k)

export function bubbleRate(s: PhotoState) {
  return MAX_RATE * smoothMin(lightTerm(s), co2Term(s)) * tempTerm(s.tempC)
}

function whyRate(s: PhotoState): Explanation {
  const L = lightTerm(s)
  const C = co2Term(s)
  const T = tempTerm(s.tempC)
  const what = s.tempC > 38 ? 'temperature-high' : T < 0.55 ? 'temperature-low' : L < C * 0.85 ? 'light' : C < L * 0.85 ? 'co2' : 'both'
  const base = 'The bubbles are oxygen. The pondweed makes it while using light energy to turn carbon dioxide and water into sugar (photosynthesis). More bubbles per minute means faster photosynthesis.'
  const lim: Record<string, [string, string, string]> = {
    light: [
      `Right now light is what's holding it back. The lamp is ${s.distance} cm away${s.filter !== 'white' ? ` behind a ${s.filter} filter` : ''}, and light spreads out as it travels: twice as far away gives only a quarter of the light. Bring the lamp closer and the plant can go faster.`,
      `Light is the limiting factor: increasing light intensity would increase the rate, while adding more CO₂ wouldn't help much. Light intensity falls with the square of distance (inverse square law)${s.filter === 'green' ? ', and chlorophyll reflects green light rather than absorbing it, so green light barely drives photosynthesis' : ''}.`,
      `Light-limited regime: rate ≈ proportional to photon flux in the linear part of the light-response curve; I ∝ 1/d². ${s.filter === 'green' ? 'Chlorophyll a/b absorb weakly at 500–570 nm (the "green gap").' : 'The light-dependent reactions supply ATP/NADPH more slowly than the Calvin cycle could use them.'}`,
    ],
    co2: [
      'Right now carbon dioxide is what\'s holding it back. The plant has plenty of light, but not enough carbon dioxide (from the hydrogen carbonate in the water) to use it all. Add more and it speeds up; moving the lamp closer won\'t help much.',
      'CO₂ is the limiting factor: the light reactions are supplying energy faster than the Calvin cycle can fix the available CO₂. Adding hydrogen carbonate (which releases CO₂) raises the rate.',
      'CO₂-limited: Rubisco carboxylation is substrate-limited (Km(CO₂) ~10–15 µM, plus O₂ competition); raising dissolved inorganic carbon increases the rate until light or Rubisco capacity limits.',
    ],
    both: [
      'Light and carbon dioxide are both nearly enough here: to go faster you\'d need to increase both together.',
      'Near co-limitation: neither light nor CO₂ alone is clearly limiting, so increasing just one gives only a small gain.',
      'Co-limitation: the system sits near the corner of the Blackman curves.',
    ],
    'temperature-low': [
      'It\'s cold, and the chemical steps of photosynthesis are carried out by enzymes, which work slowly when cold. Warm the water up and it speeds up.',
      'Temperature is limiting: the enzyme-controlled reactions (e.g. the Calvin cycle) slow down at low temperature because molecules collide less often and with less energy.',
      'Calvin-cycle enzyme kinetics follow Q10 ≈ 2 below the optimum; light reactions are far less temperature-sensitive.',
    ],
    'temperature-high': [
      'It\'s too hot. The enzymes that do photosynthesis start to lose their shape above about 35 °C, so the plant slows down even with plenty of light and CO₂.',
      'Above the optimum, enzymes begin to denature (and more CO₂ is lost to photorespiration), so the rate falls.',
      'High-temperature decline: Rubisco activase inactivation, increased photorespiration (O₂:CO₂ specificity falls with temperature) and membrane damage.',
    ],
  }
  const [a, b, c] = lim[what]
  return X(`${base} ${a}`, `${b}`, `${c}`)
}

export const photosynthesisRig: Rig<PhotoState, A, P> = {
  kind: 'photosynthesis',
  name: 'photosynthesis tank',
  dt: 0.1,
  maxWait: 600,
  schemas: {
    params,
    actions: [z.object({ type: z.literal('photo-set') }).extend(settableShape(params)), z.object({ type: z.literal('photo-count') })],
  },
  instruments: [
    { id: 'bubble-count', name: 'Bubbles counted in one minute', targets: ['latest'] },
    { id: 'light-meter', name: 'Light meter', targets: ['plant'] },
    { id: 'ruler', name: 'Ruler (lamp distance)', targets: ['lamp'] },
    { id: 'thermometer', name: 'Thermometer', targets: ['water'] },
  ],
  create: (p) => ({ ...p, counting: null, bubbles: 0, counts: [] }),

  apply(s, a) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    if (a.type === 'photo-count') {
      if (s.counting) return { state: s, events: [] }
      return { state: { ...s, counting: { since: 0, n: 0 } }, events: [act('Started counting bubbles for one minute.')] }
    }
    const patch = Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) as Partial<P>
    const bits = [
      patch.distance !== undefined && `lamp at ${patch.distance} cm`, patch.lamp !== undefined && (patch.lamp ? 'lamp on' : 'lamp off'),
      patch.co2 !== undefined && `${patch.co2}% hydrogen carbonate`, patch.tempC !== undefined && `water at ${patch.tempC} °C`,
      patch.filter && FILTERS[patch.filter].name,
    ].filter(Boolean)
    return { state: { ...s, ...patch, counting: null }, events: [act(`Changed the setup: ${bits.join(', ')}.`)] }
  },

  step(s, dt) {
    const perSec = bubbleRate(s) / 60
    const bubbles = s.bubbles + perSec * dt
    if (!s.counting) return { state: { ...s, bubbles }, events: [] }
    const since = s.counting.since + dt
    const n = s.counting.n + (Math.floor(bubbles) - Math.floor(s.bubbles))
    if (since < 60 - 1e-9) return { state: { ...s, bubbles, counting: { since, n } }, events: [] }
    const count: Count = { distance: s.distance, lux: Math.round(lightLevel(s) * 10000), co2: s.co2, tempC: s.tempC, filter: s.filter, lamp: s.lamp, n }
    return {
      state: { ...s, bubbles, counting: null, counts: [...s.counts, count] },
      events: [{ kind: 'observation', text: `${n} bubbles in one minute (lamp ${s.lamp ? `${s.distance} cm` : 'off'}, ${s.co2}% hydrogen carbonate, ${s.tempC} °C, ${FILTERS[s.filter].name}).`, tags: ['counted'], why: whyRate(s) }],
    }
  },

  atRest: (s) => !s.counting,

  measure(s, inst) {
    switch (inst) {
      case 'bubble-count': {
        const c = s.counts.at(-1)
        return c ? { quantity: 'bubbles per minute', value: c.n, unit: '/min', instrument: inst } : null
      }
      case 'light-meter':
        return { quantity: 'light intensity', value: Math.round(lightLevel(s) * 10000), unit: 'lux', instrument: inst }
      case 'ruler':
        return { quantity: 'lamp distance', value: s.distance, unit: 'cm', instrument: inst }
      case 'thermometer':
        return { quantity: 'water temperature', value: s.tempC, unit: '°C', instrument: inst }
      default:
        return null
    }
  },
}
