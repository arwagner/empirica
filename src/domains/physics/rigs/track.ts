import { z } from 'zod'
import type { LabEvent } from '../../../core'
import { round } from '../mechanics'
import type { Rig } from '../rig'
import { gravity, type World } from '../world'

/** How the gliders' facing bumpers behave. */
export const BUMPERS = {
  elastic: { name: 'spring bumpers (elastic)', e: 1 },
  sticky: { name: 'Velcro pads (sticky)', e: 0 },
  custom: { name: 'custom bounciness', e: 0.5 },
} as const
export type Bumper = keyof typeof BUMPERS

export const GLIDER_W = 0.15
const TRACK = 2
const AIR_TRACK_MU = 0.004 // a little friction left over even on an air track

export interface Glider { id: 'A' | 'B'; m: number; x: number; v: number; stopped: boolean }

export interface Totals { p: number; ke: number }

export interface TrackState {
  mode: 'push' | 'explode'
  bumper: Bumper
  e: number
  springJ: number
  /** Initial pushes (m/s) and start positions, set before launching. */
  push: { A: number; B: number }
  start: { A: number; B: number }
  gliders: [Glider, Glider]
  launched: boolean
  stuck: boolean
  collisions: number
  before: Totals | null
  after: Totals | null
}

const params = z.object({
  mA: z.number().min(0.1).max(2).default(0.5),
  mB: z.number().min(0.1).max(2).default(0.5),
  vA: z.number().min(-2).max(2).default(0.5),
  vB: z.number().min(-2).max(2).default(0),
  xA: z.number().min(0.1).max(1.9).default(0.4),
  xB: z.number().min(0.1).max(1.9).default(1.2),
  bumper: z.enum(['elastic', 'sticky', 'custom']).default('elastic'),
  e: z.number().min(0).max(1).default(0.5),
  mode: z.enum(['push', 'explode']).default('push'),
  springJ: z.number().min(0.01).max(1).default(0.1),
})

type A =
  | { type: 'track-set'; mA?: number; mB?: number; vA?: number; vB?: number; xA?: number; xB?: number; bumper?: Bumper; e?: number; mode?: 'push' | 'explode'; springJ?: number }
  | { type: 'track-launch' }
  | { type: 'track-reset' }

const restitution = (s: TrackState) => (s.bumper === 'custom' ? s.e : BUMPERS[s.bumper].e)
export const totals = (g: Glider[]): Totals => ({
  p: g.reduce((a, x) => a + x.m * x.v, 0),
  ke: g.reduce((a, x) => a + 0.5 * x.m * x.v * x.v, 0),
})

/** Back to the starting line-up, not moving. In explode mode the gliders start touching in the middle. */
function rack(s: TrackState): TrackState {
  const [a, b] = s.gliders
  const touching = s.mode === 'explode'
  const xA = touching ? TRACK / 2 - GLIDER_W / 2 : Math.min(s.start.A, s.start.B - GLIDER_W)
  const xB = touching ? TRACK / 2 + GLIDER_W / 2 : Math.max(s.start.B, s.start.A + GLIDER_W)
  return {
    ...s, launched: false, stuck: false, collisions: 0, before: null, after: null,
    gliders: [{ ...a, x: xA, v: 0, stopped: false }, { ...b, x: xB, v: 0, stopped: false }],
  }
}

/** Velocities after a 1D collision with coefficient of restitution e (momentum always conserved). */
export function collide(mA: number, vA: number, mB: number, vB: number, e: number) {
  const P = mA * vA + mB * vB
  return { vA: (P - mB * e * (vA - vB)) / (mA + mB), vB: (P + mA * e * (vA - vB)) / (mA + mB) }
}

const friction = (w: World) => (w.friction ? AIR_TRACK_MU * gravity(w) : 0)

/** Slow a velocity by friction deceleration f over dt, never reversing it. */
const slow = (v: number, f: number, dt: number) => (Math.abs(v) <= f * dt ? 0 : v - Math.sign(v) * f * dt)

export const trackRig: Rig<TrackState, A, z.infer<typeof params>> = {
  kind: 'track',
  name: 'collision track',
  schemas: {
    params,
    actions: [
      z.object({
        type: z.literal('track-set'),
        mA: z.number().min(0.1).max(2).optional(), mB: z.number().min(0.1).max(2).optional(),
        vA: z.number().min(-2).max(2).optional(), vB: z.number().min(-2).max(2).optional(),
        xA: z.number().min(0.1).max(1.9).optional(), xB: z.number().min(0.1).max(1.9).optional(),
        bumper: z.enum(['elastic', 'sticky', 'custom']).optional(), e: z.number().min(0).max(1).optional(),
        mode: z.enum(['push', 'explode']).optional(), springJ: z.number().min(0.01).max(1).optional(),
      }),
      z.object({ type: z.literal('track-launch') }),
      z.object({ type: z.literal('track-reset') }),
    ],
  },
  instruments: [
    { id: 'velocity', name: 'Motion sensor (velocity)', targets: ['A', 'B'] },
    { id: 'momentum', name: 'Total momentum', targets: ['now', 'before', 'after'] },
    { id: 'kinetic-energy', name: 'Total kinetic energy', targets: ['now', 'before', 'after'] },
  ],

  create(p) {
    return rack({
      mode: p.mode, bumper: p.bumper, e: p.e, springJ: p.springJ,
      push: { A: p.vA, B: p.vB }, start: { A: p.xA, B: p.xB },
      gliders: [{ id: 'A', m: p.mA, x: p.xA, v: 0, stopped: false }, { id: 'B', m: p.mB, x: p.xB, v: 0, stopped: false }],
      launched: false, stuck: false, collisions: 0, before: null, after: null,
    })
  },

  apply(s, a) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'track-set': {
        const [ga, gb] = s.gliders
        const n: TrackState = {
          ...s,
          mode: a.mode ?? s.mode, bumper: a.bumper ?? s.bumper, e: a.e ?? s.e, springJ: a.springJ ?? s.springJ,
          push: { A: a.vA ?? s.push.A, B: a.vB ?? s.push.B },
          start: { A: a.xA ?? s.start.A, B: a.xB ?? s.start.B },
          gliders: [{ ...ga, m: a.mA ?? ga.m }, { ...gb, m: a.mB ?? gb.m }],
        }
        const bits = [
          a.mA !== undefined && `glider A ${a.mA} kg`, a.mB !== undefined && `glider B ${a.mB} kg`,
          a.vA !== undefined && `push A ${a.vA} m/s`, a.vB !== undefined && `push B ${a.vB} m/s`,
          a.bumper && BUMPERS[a.bumper].name, a.e !== undefined && `bounciness ${a.e}`,
          a.mode && (a.mode === 'explode' ? 'spring-loaded explosion' : 'pushes'), a.springJ !== undefined && `spring energy ${a.springJ} J`,
          (a.xA !== undefined || a.xB !== undefined) && 'moved the gliders',
        ].filter(Boolean)
        return { state: rack(n), events: [act(`Set the track: ${bits.join(', ')}.`)] }
      }
      case 'track-reset':
        return { state: rack(s), events: [act('Put the gliders back.')] }
      case 'track-launch': {
        if (s.launched) return { state: s, events: [] }
        const [ga, gb] = s.gliders
        let vA = s.push.A
        let vB = s.push.B
        if (s.mode === 'explode') {
          // Spring energy E splits so momentum stays zero: ½mAvA² + ½mBvB² = E, mAvA = −mBvB.
          const M = ga.m + gb.m
          vA = -Math.sqrt((2 * s.springJ * gb.m) / (ga.m * M))
          vB = Math.sqrt((2 * s.springJ * ga.m) / (gb.m * M))
        }
        const gliders: [Glider, Glider] = [{ ...ga, v: vA }, { ...gb, v: vB }]
        // Explosion: before = at rest; after = just after the spring fires. Pushes: set at the first collision.
        const n = s.mode === 'explode'
          ? { ...s, launched: true, gliders, before: { p: 0, ke: 0 }, after: totals(gliders) }
          : { ...s, launched: true, gliders }
        return {
          state: n,
          events: [act(s.mode === 'explode' ? 'Released the spring between the gliders.' : 'Launched the gliders.'),
            ...(s.mode === 'explode' ? [{ kind: 'observation' as const, text: `The spring pushes them apart: A at ${vA.toFixed(2)} m/s, B at ${vB.toFixed(2)} m/s.`, tags: ['explosion'] }] : [])],
        }
      }
    }
  },

  step(s, dt, w) {
    const events: LabEvent[] = []
    const f = friction(w)
    const [a, b] = s.gliders.map((g) => ({ ...g })) as [Glider, Glider]
    let { stuck, collisions, after, before } = s
    if (stuck) {
      const v = slow(a.v, f, dt)
      a.v = v
      b.v = v
    } else {
      a.v = slow(a.v, f, dt)
      b.v = slow(b.v, f, dt)
    }
    a.x += a.v * dt
    b.x += b.v * dt
    // Glider–glider collision: overlapping and approaching.
    if (!stuck && b.x - a.x < GLIDER_W && a.v > b.v) {
      const e = restitution(s)
      const pre = totals([a, b])
      const r = collide(a.m, a.v, b.m, b.v, e)
      a.v = r.vA
      b.v = r.vB
      const overlap = GLIDER_W - (b.x - a.x)
      a.x -= overlap / 2
      b.x += overlap / 2
      collisions++
      if (e === 0) stuck = true
      const post = totals([a, b])
      if (collisions === 1 && s.mode === 'push') {
        before = pre
        after = post
      }
      const kind = e === 1 ? 'elastic' : e === 0 ? 'perfectly inelastic: they stick together' : 'partly elastic'
      events.push({ kind: 'observation', text: `The gliders collide (${kind}). A: ${a.v.toFixed(2)} m/s, B: ${b.v.toFixed(2)} m/s.`, tags: ['collision', `collision:${s.bumper}`] })
    }
    // End stops absorb whatever hits them.
    for (const g of [a, b]) {
      const lo = GLIDER_W / 2
      const hi = TRACK - GLIDER_W / 2
      if ((g.x <= lo && g.v < 0) || (g.x >= hi && g.v > 0)) {
        g.x = Math.min(hi, Math.max(lo, g.x))
        if (g.v !== 0) events.push({ kind: 'observation', text: `Glider ${g.id} hits the end stop and stops.`, tags: ['end-stop'] })
        g.v = 0
        if (stuck) {
          a.v = 0
          b.v = 0
        }
      }
    }
    a.stopped = a.v === 0
    b.stopped = b.v === 0
    if (s.launched && a.stopped && b.stopped && !s.gliders.every((g) => g.stopped))
      events.push({ kind: 'observation', text: 'Both gliders have come to rest.', tags: ['at-rest'] })
    return { state: { ...s, gliders: [a, b], stuck, collisions, before, after }, events }
  },

  atRest: (s) => !s.launched || s.gliders.every((g) => g.v === 0),

  measure(s, inst, target) {
    if (inst === 'velocity') {
      const g = s.gliders.find((x) => x.id === target)
      return g ? { quantity: `glider ${g.id} velocity`, value: round(g.v, 3), unit: 'm/s', instrument: inst } : null
    }
    const pick = target === 'now' ? totals(s.gliders) : target === 'before' ? s.before : target === 'after' ? s.after : null
    if (!pick) return null
    if (inst === 'momentum') return { quantity: `total momentum (${target})`, value: round(pick.p, 4), unit: 'kg·m/s', instrument: inst }
    if (inst === 'kinetic-energy') return { quantity: `total kinetic energy (${target})`, value: round(pick.ke, 4), unit: 'J', instrument: inst }
    return null
  },
}
