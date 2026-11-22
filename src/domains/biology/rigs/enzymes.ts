import { z } from 'zod'
import { settableShape, type Explanation, type LabEvent, type Rig } from '../../../core'

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })

export const ENZYME_SOURCES = {
  liver: { name: 'liver', vmax: 4.5e-5 },
  potato: { name: 'potato', vmax: 4.5e-6 },
  none: { name: 'no enzyme (water)', vmax: 0 },
} as const
export type EnzymeSource = keyof typeof ENZYME_SOURCES

const VOLUME_L = 0.02
const M_PER_PCT = 0.294 // 3% hydrogen peroxide ≈ 0.88 M
const KM = 0.3 // mol/L
const SYRINGE_ML = 100
const ML_PER_MOL = 24000

export interface EnzymeState {
  tempC: number
  pH: number
  substratePct: number
  source: EnzymeSource
  amount: number
  boiled: boolean
  running: boolean
  startedAt: number
  /** Hydrogen peroxide left, mol. */
  s: number
  /** Oxygen given off, mL (syringe caps at 100). */
  o2: number
  /** Fraction of enzyme still working (denaturation). */
  active: number
  elapsed: number
  at30: number | null
  full: boolean
  stopped: boolean
}

const params = z.object({
  tempC: z.number().min(0).max(90).default(37),
  pH: z.number().min(3).max(11).default(7),
  substratePct: z.number().min(0.5).max(6).default(3),
  source: z.enum(['liver', 'potato', 'none']).default('liver'),
  amount: z.number().min(0.25).max(5).default(1),
  boiled: z.boolean().default(false),
})
type P = z.infer<typeof params>
type A = ({ type: 'enz-set' } & Partial<P>) | { type: 'enz-start' } | { type: 'enz-reset' }

/** Rate multiplier from temperature: doubling every 10 °C (collision theory), relative to 37 °C. */
export const tempFactor = (t: number) => 2 ** ((t - 37) / 10)
/** Denaturation rate constant (1/s): zero until ~40 °C, then rising steeply. */
export const denatureRate = (t: number) => (t <= 40 ? 0 : 0.002 * Math.exp((t - 40) / 4))
/** Activity vs pH: catalase works best near neutral. */
export const pHFactor = (pH: number) => Math.exp(-(((pH - 7) / 1.8) ** 2))

function rate(s: EnzymeState) {
  if (s.boiled) return 0
  const conc = s.s / VOLUME_L
  return ENZYME_SOURCES[s.source].vmax * s.amount * (conc / (KM + conc)) * tempFactor(s.tempC) * pHFactor(s.pH) * s.active
}

const fresh = (s: EnzymeState): EnzymeState => ({
  ...s, running: false, s: s.substratePct * M_PER_PCT * VOLUME_L, o2: 0, active: 1, elapsed: 0, at30: null, full: false, stopped: false,
})

const WHY_START = X(
  'The liver contains an enzyme called catalase. An enzyme is a tiny protein machine with a pocket (the "active site") exactly the right shape for one kind of molecule. Hydrogen peroxide molecules bump into the pocket, get broken apart into water and oxygen, and the enzyme is free to grab the next one, thousands of times a second. The oxygen bubbles out into the syringe.',
  'Catalase speeds up 2H₂O₂ → 2H₂O + O₂ by binding hydrogen peroxide in its active site, which lowers the activation energy. The enzyme isn\'t used up, so a little enzyme can process a lot of substrate. More collisions between enzyme and substrate per second means a faster rate.',
  'Catalase (kcat ≈ 10⁶–10⁷ s⁻¹, near diffusion-limited) follows Michaelis–Menten kinetics, v = Vmax[S]/(Km + [S]); Vmax ∝ [E]. Initial rate is measured before [S] falls appreciably.',
)
const WHY_BOILED = X(
  'Boiling wrecks the enzyme. Its shape depends on delicate folds held together by weak bonds; heat shakes them apart, the active site loses its shape, and the hydrogen peroxide no longer fits. A broken enzyme can\'t be fixed by cooling it down.',
  'Boiling denatures catalase: the hydrogen bonds and other weak interactions holding its 3D shape break, the active site is destroyed, and the substrate can\'t bind. Denaturation is irreversible.',
  'Thermal denaturation unfolds the tertiary structure (loss of the haem-binding pocket conformation); refolding doesn\'t occur on cooling, so activity is zero.',
)
const WHY_DENATURE = X(
  'It started fast because heat makes molecules move and collide more, but it\'s too hot: the heat is slowly shaking the enzyme out of shape, so fewer and fewer enzymes still work, and the fizzing dies away.',
  'Above about 40 °C the enzyme denatures over time: its active site changes shape and stops binding substrate. So the rate starts high (more collisions) but falls as more enzyme molecules are destroyed. That\'s why there\'s an optimum temperature.',
  'The observed rate is v(T)·e^(−k_d t), with k_d rising roughly exponentially above ~40 °C. The apparent optimum depends on the measuring time: shorter assays give higher apparent optima.',
)
const WHY_PH = X(
  'The enzyme\'s pocket only keeps its exact shape in the right acidity. Too acidic or too alkaline, and the charges on the protein change, the pocket loses its shape, and the reaction slows right down.',
  'pH changes the charges on amino acids in the active site and on the bonds holding the protein\'s shape, so the substrate binds less well away from the optimum pH (about 7 for catalase).',
  'Ionisation states of catalytic residues (and the haem environment) shift with pH; activity follows a bell-shaped curve with an optimum near neutral.',
)

export const enzymeRig: Rig<EnzymeState, A, P> = {
  kind: 'enzymes',
  name: 'enzyme bench',
  dt: 0.1,
  maxWait: 600,
  schemas: {
    params,
    actions: [
      z.object({ type: z.literal('enz-set') }).extend(settableShape(params)),
      z.object({ type: z.literal('enz-start') }),
      z.object({ type: z.literal('enz-reset') }),
    ],
  },
  instruments: [
    { id: 'gas-syringe', name: 'Gas syringe', targets: ['oxygen'] },
    { id: 'initial-rate', name: 'Initial rate (first 30 s)', targets: ['oxygen'] },
    { id: 'timer', name: 'Stopwatch', targets: ['reaction'] },
    { id: 'thermometer', name: 'Water bath thermometer', targets: ['bath'] },
    { id: 'ph', name: 'Buffer pH', targets: ['tube'] },
  ],
  create: (p) => fresh({ ...p, running: false, startedAt: 0, s: 0, o2: 0, active: 1, elapsed: 0, at30: null, full: false, stopped: false }),

  apply(s, a, _w, time) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'enz-set': {
        const patch = Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) as Partial<P>
        const n = fresh({ ...s, ...patch })
        const bits = [
          patch.tempC !== undefined && `water bath ${patch.tempC} °C`, patch.pH !== undefined && `pH ${patch.pH} buffer`,
          patch.substratePct !== undefined && `${patch.substratePct}% hydrogen peroxide`, patch.source && ENZYME_SOURCES[patch.source].name,
          patch.amount !== undefined && `${patch.amount} g`, patch.boiled !== undefined && (patch.boiled ? 'boiled first' : 'fresh'),
        ].filter(Boolean)
        return { state: n, events: [act(`Set up: ${bits.join(', ')}.`)] }
      }
      case 'enz-reset':
        return { state: fresh(s), events: [act('Washed out the tube and reset the syringe.')] }
      case 'enz-start': {
        if (s.running) return { state: s, events: [] }
        const n = { ...fresh(s), running: true, startedAt: time }
        const events: LabEvent[] = [act(`Dropped the ${ENZYME_SOURCES[s.source].name} into the hydrogen peroxide and started the stopwatch.`)]
        if (s.source === 'none') events.push({ kind: 'observation', text: 'Nothing happens: hardly any bubbles.', tags: ['no-reaction'], why: X('Hydrogen peroxide does break down on its own, but so slowly you can\'t see it. Without the enzyme there\'s nothing to speed it up. This is your control.', 'Uncatalysed decomposition has a high activation energy, so at room temperature it\'s negligible. The control shows the bubbles in other tubes are due to the enzyme.', 'k_uncat for H₂O₂ decomposition is ~10⁻⁸ s⁻¹ at 25 °C, about 10¹³ times slower than catalase turnover.') })
        else if (s.boiled) events.push({ kind: 'observation', text: 'Nothing happens: the boiled enzyme makes no bubbles.', tags: ['no-reaction', 'boiled'], why: WHY_BOILED })
        else events.push({ kind: 'observation', text: 'It fizzes as oxygen bubbles up into the gas syringe.', tags: ['fizzing'], why: s.pH < 5 || s.pH > 9 ? WHY_PH : WHY_START })
        return { state: n, events }
      }
    }
  },

  step(s, dt) {
    if (!s.running || s.stopped) return { state: s, events: [] }
    const events: LabEvent[] = []
    const v = rate(s)
    const ds = Math.min(s.s, v * dt * 2) // 2 H2O2 per O2... v is mol H2O2/s as written; O2 = half
    const o2 = Math.min(SYRINGE_ML, s.o2 + (ds / 2) * ML_PER_MOL)
    const active = s.active * Math.exp(-denatureRate(s.tempC) * dt)
    const elapsed = s.elapsed + dt
    let at30 = s.at30
    let full: boolean = s.full
    let stopped: boolean = s.stopped
    if (at30 === null && elapsed >= 30) at30 = o2
    if (!full && o2 >= SYRINGE_ML) {
      full = true
      stopped = true
      at30 ??= o2
      events.push({ kind: 'observation', text: `The gas syringe is full (100 mL) after ${elapsed.toFixed(0)} s.`, tags: ['syringe-full'] })
    }
    const vNext = rate({ ...s, s: s.s - ds, active })
    if (!stopped && elapsed > 5 && vNext * ML_PER_MOL < 0.002) {
      stopped = true
      at30 ??= o2 // finished early: everything it made was in the first 30 s
      if (o2 < 0.5) return { state: { ...s, s: s.s - ds, o2, active, elapsed, at30, full, stopped }, events }
      const dead = active < 0.05
      events.push(dead
        ? { kind: 'observation', text: `The fizzing dies away after ${elapsed.toFixed(0)} s, with ${o2.toFixed(0)} mL collected.`, tags: ['denatured'], why: WHY_DENATURE }
        : { kind: 'observation', text: `The reaction slows to a stop after ${elapsed.toFixed(0)} s: ${o2.toFixed(0)} mL of oxygen.`, tags: ['used-up'], why: X('The bubbles stopped because the hydrogen peroxide ran out, not the enzyme. The enzyme isn\'t used up: add more hydrogen peroxide and it would start again.', 'The substrate has been used up; the rate falls as [S] falls (fewer collisions), reaching zero when it\'s gone. Total gas depends on how much substrate there was, not how much enzyme.', 'v → 0 as [S] → 0; final V(O₂) = ½·n(H₂O₂)·24 L/mol, independent of [E].') })
    }
    return { state: { ...s, s: s.s - ds, o2, active, elapsed, at30, full, stopped }, events }
  },

  atRest: (s) => !s.running || s.stopped,

  measure(s, inst) {
    switch (inst) {
      case 'gas-syringe':
        return { quantity: 'oxygen collected', value: Math.round(s.o2 * 10) / 10, unit: 'mL', instrument: inst }
      case 'initial-rate':
        return s.at30 !== null ? { quantity: 'initial rate', value: Math.round((s.at30 / 30) * 1000) / 1000, unit: 'mL/s', instrument: inst } : null
      case 'timer':
        return { quantity: 'time', value: Math.round(s.elapsed * 10) / 10, unit: 's', instrument: inst }
      case 'thermometer':
        return { quantity: 'temperature', value: s.tempC, unit: '°C', instrument: inst }
      case 'ph':
        return { quantity: 'pH', value: s.pH, unit: '', instrument: inst }
      default:
        return null
    }
  },
}
