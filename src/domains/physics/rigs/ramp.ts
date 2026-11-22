import { z } from 'zod'
import type { LabEvent } from '../../../core'
import { crossing, drag, rk4, round } from '../mechanics'
import type { Rig } from '../rig'
import { airDensity, gravity, type World } from '../world'

/** Track surfaces and their friction coefficient (used when friction is on). */
export const SURFACES = { smooth: { name: 'smooth plastic', mu: 0.02 }, wood: { name: 'wood', mu: 0.2 }, felt: { name: 'felt', mu: 0.35 } } as const
export type Surface = keyof typeof SURFACES

export interface Gate { id: string; x: number; time: number | null; speed: number | null }

export interface RampState {
  angleDeg: number
  length: number
  mass: number
  /** Mass hanging off the pulley at the bottom end, kg (0 = no pulley). */
  hanging: number
  surface: Surface
  /** Distance travelled down the track from the start line, m. */
  x: number
  v: number
  /** Acceleration during the last step, m/s². */
  a: number
  released: boolean
  releasedAt: number
  stopped: boolean
  atBottom: boolean
  gates: Gate[]
}

const CD_A = 0.004 // a small cart: drag coefficient × frontal area, m²
const START = 0.05

const params = z.object({
  angleDeg: z.number().min(0).max(60).default(10),
  length: z.number().min(0.5).max(3).default(2),
  mass: z.number().min(0.1).max(5).default(0.5),
  hanging: z.number().min(0).max(2).default(0),
  surface: z.enum(['smooth', 'wood', 'felt']).default('smooth'),
  gates: z.array(z.object({ id: z.string(), x: z.number() })).default([{ id: 'A', x: 0.5 }, { id: 'B', x: 1.5 }]),
})

type A =
  | { type: 'ramp-set'; angleDeg?: number; mass?: number; hanging?: number; surface?: Surface }
  | { type: 'ramp-release' }
  | { type: 'ramp-reset' }
  | { type: 'ramp-move-gate'; gate: string; x: number }

const mu = (s: RampState, w: World) => (w.friction ? SURFACES[s.surface].mu : 0)
const rad = (d: number) => (d * Math.PI) / 180

/**
 * Acceleration along the track (positive = downhill). The hanging mass (if any) pulls downhill
 * too and has to be accelerated along with the cart: a = ΣF / (M + m).
 */
function accel(s: RampState, w: World, v: number) {
  const g = gravity(w)
  const th = rad(s.angleDeg)
  const kinetic = v !== 0 ? -Math.sign(v) * mu(s, w) * s.mass * g * Math.cos(th) : 0
  const driving = s.mass * g * Math.sin(th) + s.hanging * g
  return (driving + kinetic + drag(v, airDensity(w), CD_A)) / (s.mass + s.hanging)
}

/** Will friction hold the cart still? (driving force ≤ maximum static friction) */
const holds = (s: RampState, w: World) =>
  s.mass * Math.sin(rad(s.angleDeg)) + s.hanging <= mu(s, w) * s.mass * Math.cos(rad(s.angleDeg)) + 1e-12

const fresh = (s: RampState): RampState => ({
  ...s, x: START, v: 0, a: 0, released: false, stopped: false, atBottom: false,
  gates: s.gates.map((g) => ({ ...g, time: null, speed: null })),
})

export const rampRig: Rig<RampState, A, z.infer<typeof params>> = {
  kind: 'ramp',
  name: 'ramp and cart',
  schemas: {
    params,
    actions: [
      z.object({ type: z.literal('ramp-set'), angleDeg: z.number().min(0).max(60).optional(), mass: z.number().min(0.1).max(5).optional(), hanging: z.number().min(0).max(2).optional(), surface: z.enum(['smooth', 'wood', 'felt']).optional() }),
      z.object({ type: z.literal('ramp-release') }),
      z.object({ type: z.literal('ramp-reset') }),
      z.object({ type: z.literal('ramp-move-gate'), gate: z.string(), x: z.number().min(0.1).max(3) }),
    ],
  },
  instruments: [
    { id: 'light-gate', name: 'Light gate (time since release)', targets: ['A', 'B'] },
    { id: 'gate-speed', name: 'Light gate (speed)', targets: ['A', 'B'] },
    { id: 'speedometer', name: 'Motion sensor (speed)', targets: ['cart'] },
    { id: 'accelerometer', name: 'Accelerometer', targets: ['cart'] },
    { id: 'ruler', name: 'Ruler (distance from start)', targets: ['cart', 'A', 'B'] },
    { id: 'protractor', name: 'Protractor', targets: ['ramp'] },
    { id: 'balance', name: 'Balance', targets: ['cart', 'hanging'] },
  ],
  create: (p) => fresh({ ...p, x: START, v: 0, a: 0, released: false, releasedAt: 0, stopped: false, atBottom: false, gates: p.gates.map((g) => ({ ...g, time: null, speed: null })) }),

  apply(s, a, w, time) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'ramp-set': {
        const n = fresh({ ...s, ...Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) })
        const bits = [
          a.angleDeg !== undefined && `angle ${a.angleDeg}°`,
          a.mass !== undefined && `cart mass ${a.mass} kg`,
          a.hanging !== undefined && (a.hanging ? `${a.hanging * 1000} g hanging from the pulley` : 'no hanging mass'),
          a.surface && `${SURFACES[a.surface].name} surface`,
        ].filter(Boolean)
        return { state: n, events: [act(`Set the ramp: ${bits.join(', ')}. Cart back at the start.`)] }
      }
      case 'ramp-release': {
        if (s.released) return { state: s, events: [] }
        const n = { ...s, released: true, releasedAt: time }
        const events: LabEvent[] = [act('Released the cart.')]
        if (holds(n, w)) events.push({ kind: 'observation', text: 'The cart doesn\'t move: friction holds it in place.', tags: ['stuck'] })
        return { state: n, events }
      }
      case 'ramp-reset':
        return { state: fresh(s), events: [act('Put the cart back at the start line.')] }
      case 'ramp-move-gate': {
        const x = Math.min(s.length - 0.05, a.x)
        return { state: fresh({ ...s, gates: s.gates.map((g) => (g.id === a.gate ? { ...g, x } : g)) }), events: [act(`Moved light gate ${a.gate} to ${round(x, 2)} m.`)] }
      }
    }
  },

  step(s, dt, w, time) {
    const events: LabEvent[] = []
    const [x, v0] = rk4((_, [, v]) => [v, accel(s, w, v)], time, [s.x, s.v], dt)
    let v = v0
    // Kinetic friction can't push the cart back up: if the velocity flipped, it stopped.
    let stopped = false
    if (s.v > 0 && v <= 0) {
      v = 0
      if (holds(s, w)) stopped = true
    }
    const gates = s.gates.map((g) => {
      if (g.time !== null) return g
      const tc = crossing(time, s.x, time + dt, x, g.x)
      if (tc === null) return g
      const t = tc - s.releasedAt
      const speed = s.v + ((tc - time) / dt) * (v - s.v)
      events.push({ kind: 'observation', text: `The cart passes light gate ${g.id} at t = ${t.toFixed(3)} s.`, tags: ['gate', `gate:${g.id}`] })
      return { ...g, time: t, speed }
    })
    let atBottom = false
    let nx = x
    if (x >= s.length) {
      nx = s.length
      atBottom = true
      stopped = true
      events.push({ kind: 'observation', text: `The cart hits the end stop at ${v.toFixed(2)} m/s.`, tags: ['bottom'] })
      v = 0
    }
    if (stopped && !atBottom) events.push({ kind: 'observation', text: 'Friction brings the cart to a stop.', tags: ['stopped'] })
    return { state: { ...s, x: nx, v, a: atBottom || stopped ? 0 : accel(s, w, v), gates, stopped, atBottom }, events }
  },

  atRest: (s) => !s.released || s.stopped || s.atBottom,

  measure(s, inst, target, _w, time) {
    const gate = s.gates.find((g) => g.id === target)
    switch (inst) {
      case 'light-gate':
        return gate?.time != null ? { quantity: `gate ${gate.id} time`, value: round(gate.time, 3), unit: 's', instrument: inst } : null
      case 'gate-speed':
        return gate?.speed != null ? { quantity: `gate ${gate.id} speed`, value: round(gate.speed, 3), unit: 'm/s', instrument: inst } : null
      case 'accelerometer':
        return target === 'cart' ? { quantity: 'acceleration', value: round(s.a, 3), unit: 'm/s²', instrument: inst } : null
      case 'speedometer':
        return target === 'cart' ? { quantity: 'speed', value: round(s.v, 3), unit: 'm/s', instrument: inst } : null
      case 'ruler':
        if (target === 'cart') return { quantity: 'distance', value: round(s.x, 3), unit: 'm', instrument: inst }
        return gate ? { quantity: `gate ${gate.id} position`, value: round(gate.x, 3), unit: 'm', instrument: inst } : null
      case 'protractor':
        return target === 'ramp' ? { quantity: 'angle', value: s.angleDeg, unit: '°', instrument: inst } : null
      case 'balance':
        if (target === 'cart') return { quantity: 'cart mass', value: s.mass, unit: 'kg', instrument: inst }
        return target === 'hanging' ? { quantity: 'hanging mass', value: s.hanging, unit: 'kg', instrument: inst } : null
      default:
        void time
        return null
    }
  },
}
