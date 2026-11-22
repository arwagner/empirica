import { z } from 'zod'
import { Rng, type Explanation, type LabEvent, type Rig } from '../../../core'

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })

/** Potato tissue behaves like ~0.30 M sucrose; mass change follows the water-potential gradient. */
export const POTATO_ISOTONIC = 0.3
const K_PER_M = 0.6 // fractional mass change at equilibrium per 1 M of gradient
const TAU = 1200 // s: time constant of water movement (20 min)
const MIN_FRACTION = -0.4 // fully plasmolysed: can't lose more than this
/** Effective diffusion coefficient of acid into agar at 20 °C (cm²/s); doubles per +20 °C. */
const D20 = 4.2e-4

export interface Tube { conc: number; m0: number }
export interface Cube { side: number; clearedAt: number | null }

export interface OsmosisState {
  mode: 'osmosis' | 'diffusion'
  seed: number
  tubes: Tube[]
  cubes: Cube[]
  tempC: number
  running: boolean
  elapsed: number
  announced: boolean
}

const params = z.object({
  mode: z.enum(['osmosis', 'diffusion']).default('osmosis'),
  concentrations: z.array(z.number().min(0).max(2)).default([0, 0.2, 0.4, 0.6, 0.8, 1.0]),
  sides: z.array(z.number().min(0.5).max(4)).default([1, 2, 3]),
  tempC: z.number().min(5).max(60).default(20),
  seed: z.number().int().default(2024),
})
type P = z.infer<typeof params>
type A =
  | { type: 'osm-mode'; mode: 'osmosis' | 'diffusion' }
  | { type: 'osm-set'; concentrations?: number[]; sides?: number[]; tempC?: number }
  | { type: 'osm-start' }
  | { type: 'osm-reset' }

/** Fractional mass change of a potato cylinder after t seconds in sucrose of concentration c. */
export function massChange(c: number, t: number) {
  const eq = Math.max(MIN_FRACTION, K_PER_M * (POTATO_ISOTONIC - c))
  return eq * (1 - Math.exp(-t / TAU))
}
const diffusivity = (tempC: number) => D20 * 2 ** ((tempC - 20) / 20)
/** How far the acid has soaked into the agar (cm) after t seconds. */
export const depth = (tempC: number, t: number) => Math.sqrt(2 * diffusivity(tempC) * t)

function tubesFrom(concs: number[], seed: number): { tubes: Tube[]; seed: number } {
  const rng = new Rng(seed)
  // Real cylinders aren't identical: 2.00 g ± a little.
  const tubes = concs.map((conc) => ({ conc, m0: Math.round(rng.normal(2, 0.04) * 100) / 100 }))
  return { tubes, seed: rng.seed }
}

const WHY_OSMOSIS = X(
  'Water moves through the potato\'s cell walls and membranes towards wherever there\'s more dissolved sugar, as if trying to even things out. In plain water the potato cells have more dissolved stuff inside, so water rushes in and they swell and get heavier. In strong sugar water the outside is "sugarier", so water leaves the cells and the potato shrinks and goes floppy.',
  'Osmosis is the movement of water across a partially permeable membrane from a dilute solution (high water potential) to a concentrated one (low water potential). Cells gain mass in solutions more dilute than their cytoplasm and lose mass in more concentrated ones. Where there\'s no change, the solution matches the cells: that\'s the isotonic point.',
  'Net water flux ∝ Ψ_out − Ψ_cell, where Ψ = Ψ_s + Ψ_p and Ψ_s = −iCRT. Turgid cells stop gaining water when wall pressure balances the solute gradient; in hypertonic solutions they plasmolyse. The x-intercept of %Δm vs [sucrose] estimates the tissue\'s osmotic concentration (~0.3 M).',
)
const WHY_DIFFUSION = X(
  'The acid creeps into each cube from the outside, turning the pink dye colourless as it goes. It travels the same distance into every cube in the same time, but a big cube has much further to go to reach its middle. That\'s why living cells stay small: if they were huge, food and oxygen couldn\'t get to the middle fast enough.',
  'Diffusion moves the acid inward at the same rate for every cube, but the time to reach the centre grows with the square of the distance. Small cubes have a larger surface area compared with their volume (SA:V = 6/side), so substances reach every part quickly.',
  'Penetration depth x ≈ √(2Dt), so time to clear ∝ (side/2)²; doubling the side quadruples the time. SA:V scales as 1/L, which limits cell size and drives adaptations (microvilli, flattened shapes, circulatory systems).',
)

export const osmosisRig: Rig<OsmosisState, A, P> = {
  kind: 'osmosis',
  name: 'osmosis and diffusion bench',
  dt: 5,
  maxWait: 86400,
  schemas: {
    params,
    actions: [
      z.object({ type: z.literal('osm-mode'), mode: z.enum(['osmosis', 'diffusion']) }),
      z.object({ type: z.literal('osm-set'), concentrations: params.shape.concentrations.unwrap().optional(), sides: params.shape.sides.unwrap().optional(), tempC: z.number().min(5).max(60).optional() }),
      z.object({ type: z.literal('osm-start') }),
      z.object({ type: z.literal('osm-reset') }),
    ],
  },
  instruments: [
    { id: 'balance', name: 'Balance (blotted cylinder)', targets: ['tube:0', 'tube:1', 'tube:2', 'tube:3', 'tube:4', 'tube:5'] },
    { id: 'percent-change', name: 'Percentage change in mass', targets: ['tube:0', 'tube:1', 'tube:2', 'tube:3', 'tube:4', 'tube:5'] },
    { id: 'isotonic', name: 'Isotonic point (from the graph)', targets: ['potato'] },
    { id: 'clear-time', name: 'Time for a cube to go colourless', targets: ['cube:0', 'cube:1', 'cube:2'] },
    { id: 'ruler', name: 'Ruler (colourless edge depth)', targets: ['cube:0', 'cube:1', 'cube:2'] },
    { id: 'timer', name: 'Stopwatch', targets: ['bench'] },
  ],
  create(p) {
    const { tubes, seed } = tubesFrom(p.concentrations, p.seed)
    return { mode: p.mode, seed, tubes, cubes: p.sides.map((side) => ({ side, clearedAt: null })), tempC: p.tempC, running: false, elapsed: 0, announced: false }
  },

  apply(s, a) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    const reset = (x: OsmosisState): OsmosisState => ({ ...x, running: false, elapsed: 0, announced: false, cubes: x.cubes.map((c) => ({ ...c, clearedAt: null })) })
    switch (a.type) {
      case 'osm-mode':
        return { state: reset({ ...s, mode: a.mode }), events: [act(a.mode === 'osmosis' ? 'Set up potato cylinders and sugar solutions.' : 'Set up pink agar cubes and a beaker of acid.')] }
      case 'osm-set': {
        let n = { ...s }
        if (a.concentrations) {
          const r = tubesFrom(a.concentrations, s.seed)
          n = { ...n, tubes: r.tubes, seed: r.seed }
        }
        if (a.sides) n.cubes = a.sides.map((side) => ({ side, clearedAt: null }))
        if (a.tempC !== undefined) n.tempC = a.tempC
        return { state: reset(n), events: [act(`Changed the setup${a.concentrations ? `: solutions ${a.concentrations.join(', ')} M` : ''}${a.sides ? `: cubes ${a.sides.join(', ')} cm` : ''}${a.tempC !== undefined ? `: ${a.tempC} °C` : ''}.`)] }
      }
      case 'osm-reset': {
        const r = tubesFrom(s.tubes.map((t) => t.conc), s.seed)
        return { state: reset({ ...s, tubes: r.tubes, seed: r.seed }), events: [act('Cut fresh cylinders / cubes and started again.')] }
      }
      case 'osm-start':
        if (s.running) return { state: s, events: [] }
        return { state: { ...reset(s), running: true }, events: [act(s.mode === 'osmosis' ? `Weighed the cylinders (${s.tubes.map((t) => t.m0.toFixed(2)).join(', ')} g) and put them into the solutions.` : 'Dropped the agar cubes into the acid and started the stopwatch.')] }
    }
  },

  step(s, dt) {
    if (!s.running) return { state: s, events: [] }
    const elapsed = s.elapsed + dt
    const events: LabEvent[] = []
    let announced = s.announced
    let cubes = s.cubes
    if (s.mode === 'osmosis') {
      if (!announced && elapsed >= 1800) {
        announced = true
        events.push({ kind: 'observation', text: 'After 30 minutes, the cylinders from the weakest solutions feel firm and heavier; those from the strongest are floppy and lighter.', tags: ['osmosis-seen'], why: WHY_OSMOSIS })
      }
    } else {
      const d = depth(s.tempC, elapsed)
      cubes = s.cubes.map((c, i) => {
        if (c.clearedAt !== null || d < c.side / 2) return c
        events.push({ kind: 'observation', text: `The ${c.side} cm cube has gone completely colourless after ${(elapsed / 60).toFixed(1)} min.`, tags: ['cleared', `cleared:${i}`], why: WHY_DIFFUSION })
        return { ...c, clearedAt: elapsed }
      })
    }
    const done = s.mode === 'diffusion' && cubes.every((c) => c.clearedAt !== null)
    return { state: { ...s, elapsed, announced, cubes, running: !done }, events }
  },

  atRest: (s) => !s.running || (s.mode === 'osmosis' && s.announced && s.elapsed > TAU * 12),

  measure(s, inst, target) {
    const i = Number(target.split(':')[1])
    switch (inst) {
      case 'balance':
      case 'percent-change': {
        const t = s.tubes[i]
        if (!t || s.mode !== 'osmosis') return null
        const f = massChange(t.conc, s.elapsed)
        return inst === 'balance'
          ? { quantity: `mass in ${t.conc} M`, value: Math.round(t.m0 * (1 + f) * 100) / 100, unit: 'g', instrument: inst }
          : { quantity: `% change in ${t.conc} M`, value: Math.round(f * 1000) / 10, unit: '%', instrument: inst }
      }
      case 'isotonic': {
        if (s.mode !== 'osmosis' || s.elapsed < 600) return null
        const pts = s.tubes.map((t) => [t.conc, massChange(t.conc, s.elapsed)] as const).sort((a, b) => a[0] - b[0])
        for (let k = 1; k < pts.length; k++) {
          const [c0, f0] = pts[k - 1]
          const [c1, f1] = pts[k]
          if (f0 >= 0 && f1 <= 0) return { quantity: 'isotonic point', value: Math.round((c0 + (f0 / (f0 - f1)) * (c1 - c0)) * 100) / 100, unit: 'M', instrument: inst }
        }
        return null
      }
      case 'clear-time': {
        const c = s.cubes[i]
        return c?.clearedAt != null ? { quantity: `${c.side} cm cube clearing time`, value: Math.round(c.clearedAt / 6) / 10, unit: 'min', instrument: inst } : null
      }
      case 'ruler': {
        const c = s.cubes[i]
        return c ? { quantity: `${c.side} cm cube: colourless edge`, value: Math.round(Math.min(c.side / 2, depth(s.tempC, s.elapsed)) * 100) / 100, unit: 'cm', instrument: inst } : null
      }
      case 'timer':
        return { quantity: 'time', value: Math.round(s.elapsed / 6) / 10, unit: 'min', instrument: inst }
      default:
        return null
    }
  },
}
