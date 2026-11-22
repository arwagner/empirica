import { z } from 'zod'
import type { LabEvent } from '../../../core'
import { crossing, drag, rk4, round } from '../mechanics'
import type { Rig } from '../rig'
import { airDensity, gravity, type World } from '../world'

/**
 * Oscillations station: a simple pendulum (full nonlinear motion) or a mass on a spring.
 * `q` is the angle (rad) for the pendulum, or the displacement below equilibrium (m) for the spring.
 */
export interface OscState {
  mode: 'pendulum' | 'spring'
  length: number
  mass: number
  angleDeg: number
  k: number
  pull: number
  q: number
  w: number
  released: boolean
  releasedAt: number
  lastUp: number | null
  period: number | null
  swings: number
  tenSwings: number | null
  firstUpAt: number | null
}

const BOB_CDA = 0.002 // a small brass bob
const PIVOT_DAMPING = 0.01 // 1/s, from pivot friction, when friction is on

const params = z.object({
  mode: z.enum(['pendulum', 'spring']).default('pendulum'),
  length: z.number().min(0.1).max(3).default(1),
  mass: z.number().min(0.05).max(2).default(0.2),
  angleDeg: z.number().min(1).max(90).default(10),
  k: z.number().min(2).max(200).default(20),
  pull: z.number().min(0.005).max(0.3).default(0.05),
})

type A =
  | { type: 'osc-set'; mode?: 'pendulum' | 'spring'; length?: number; mass?: number; angleDeg?: number; k?: number; pull?: number }
  | { type: 'osc-release' }
  | { type: 'osc-reset' }

const rad = (d: number) => (d * Math.PI) / 180
/** Static stretch of the spring under the hanging mass: mg/k (Hooke's law). */
export const extension = (s: OscState, w: World) => (s.mass * gravity(w)) / s.k

function deriv(s: OscState, w: World) {
  const g = gravity(w)
  const rho = airDensity(w)
  const damp = w.friction ? PIVOT_DAMPING : 0
  return (_t: number, [q, om]: number[]) => {
    if (s.mode === 'pendulum') {
      const v = s.length * om
      const a = -(g / s.length) * Math.sin(q) - damp * om + drag(v, rho, BOB_CDA) / s.mass / s.length
      return [om, a]
    }
    const a = -(s.k / s.mass) * q - damp * om + drag(om, rho, BOB_CDA) / s.mass
    return [om, a]
  }
}

/** Before release the spring hangs at rest (your pull only starts it bouncing); the pendulum is held back. */
export const liveQ = (s: OscState) => (s.mode === 'spring' && !s.released ? 0 : s.q)

const held = (s: OscState): OscState => ({
  ...s, released: false, q: s.mode === 'pendulum' ? rad(s.angleDeg) : s.pull, w: 0,
  lastUp: null, period: null, swings: 0, tenSwings: null, firstUpAt: null,
})

export const oscillatorRig: Rig<OscState, A, z.infer<typeof params>> = {
  kind: 'oscillator',
  name: 'pendulum and spring',
  schemas: {
    params,
    actions: [
      z.object({
        type: z.literal('osc-set'), mode: z.enum(['pendulum', 'spring']).optional(),
        length: z.number().min(0.1).max(3).optional(), mass: z.number().min(0.05).max(2).optional(),
        angleDeg: z.number().min(1).max(90).optional(), k: z.number().min(2).max(200).optional(), pull: z.number().min(0.005).max(0.3).optional(),
      }),
      z.object({ type: z.literal('osc-release') }),
      z.object({ type: z.literal('osc-reset') }),
    ],
  },
  instruments: [
    { id: 'period', name: 'Light gate (period)', targets: ['bob'] },
    { id: 'swing-counter', name: 'Swing counter', targets: ['bob'] },
    { id: 'stopwatch', name: 'Stopwatch (10 swings)', targets: ['bob'] },
    { id: 'angle', name: 'Protractor (angle)', targets: ['bob'] },
    { id: 'ruler', name: 'Ruler', targets: ['length', 'extension', 'displacement'] },
    { id: 'force-meter', name: 'Force meter (spring tension)', targets: ['spring'] },
    { id: 'balance', name: 'Balance', targets: ['bob'] },
  ],
  create: (p) => held({ ...p, q: 0, w: 0, released: false, releasedAt: 0, lastUp: null, period: null, swings: 0, tenSwings: null, firstUpAt: null }),

  apply(s, a, w, time) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'osc-set': {
        const n = held({ ...s, ...Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) })
        const bits = [
          a.mode && (a.mode === 'pendulum' ? 'switched to the pendulum' : 'switched to the spring'),
          a.length !== undefined && `length ${a.length} m`, a.mass !== undefined && `mass ${a.mass * 1000} g`,
          a.angleDeg !== undefined && `release angle ${a.angleDeg}°`, a.k !== undefined && `spring constant ${a.k} N/m`,
          a.pull !== undefined && `pulled down ${round(a.pull * 100, 1)} cm`,
        ].filter(Boolean)
        const events = [act(`Set up the ${n.mode}: ${bits.join(', ')}.`)]
        if (n.mode === 'spring' && (a.mass !== undefined || a.k !== undefined || a.mode))
          events.push({ kind: 'observation', text: `The spring stretches ${round(extension(n, w) * 100, 1)} cm under the ${n.mass * 1000} g mass.`, tags: ['stretched'] })
        return { state: n, events }
      }
      case 'osc-release':
        if (s.released) return { state: s, events: [] }
        return { state: { ...held(s), released: true, releasedAt: time }, events: [act(s.mode === 'pendulum' ? `Released the pendulum from ${s.angleDeg}°.` : `Released the mass ${round(s.pull * 100, 1)} cm below equilibrium.`)] }
      case 'osc-reset':
        return { state: held(s), events: [act(`Stopped the ${s.mode} and held it back at the start.`)] }
    }
  },

  step(s, dt, w, time) {
    const [q, om] = rk4(deriv(s, w), time, [s.q, s.w], dt)
    const events: LabEvent[] = []
    let { lastUp, period, swings, tenSwings, firstUpAt } = s
    // A light gate at the rest position: an upward (negative → positive) crossing marks each full cycle.
    const tc = s.q < 0 && q >= 0 ? crossing(time, s.q, time + dt, q, 0) : null
    if (tc !== null) {
      if (lastUp !== null) {
        period = tc - lastUp
        swings++
        if (swings === 1) events.push({ kind: 'observation', text: `One full swing takes ${period.toFixed(3)} s.`, tags: ['period'] })
        if (swings === 10 && firstUpAt !== null) {
          tenSwings = tc - firstUpAt
          events.push({ kind: 'observation', text: `10 full swings take ${tenSwings.toFixed(2)} s.`, tags: ['ten-swings'] })
        }
      } else firstUpAt = tc
      lastUp = tc
    }
    return { state: { ...s, q, w: om, lastUp, period, swings, tenSwings, firstUpAt }, events }
  },

  atRest: (s) => !s.released || (Math.abs(s.q) < 1e-5 && Math.abs(s.w) < 1e-5),

  measure(s, inst, target, w, time) {
    switch (inst) {
      case 'period':
        return s.period !== null ? { quantity: 'period', value: round(s.period, 3), unit: 's', instrument: inst } : null
      case 'swing-counter':
        return { quantity: 'full swings', value: s.swings, unit: '', instrument: inst }
      case 'stopwatch':
        return s.tenSwings !== null ? { quantity: 'time for 10 swings', value: round(s.tenSwings, 2), unit: 's', instrument: inst } : null
      case 'angle':
        return s.mode === 'pendulum' ? { quantity: 'angle', value: round((s.q * 180) / Math.PI, 1), unit: '°', instrument: inst } : null
      case 'ruler':
        if (target === 'length' && s.mode === 'pendulum') return { quantity: 'pendulum length', value: s.length, unit: 'm', instrument: inst }
        if (target === 'extension' && s.mode === 'spring') return { quantity: 'spring extension', value: round((extension(s, w) + liveQ(s)) * 100, 2), unit: 'cm', instrument: inst }
        if (target === 'displacement' && s.mode === 'spring') return { quantity: 'displacement from equilibrium', value: round(s.q * 100, 2), unit: 'cm', instrument: inst }
        return null
      case 'balance':
        return { quantity: 'mass', value: s.mass, unit: 'kg', instrument: inst }
      case 'force-meter':
        return s.mode === 'spring' ? { quantity: 'spring tension', value: round(s.k * (extension(s, w) + liveQ(s)), 3), unit: 'N', instrument: inst } : null
      default:
        void time
        return null
    }
  },
}
