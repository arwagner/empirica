import { z } from 'zod'
import type { LabEvent } from '../../../core'
import { rk4, round } from '../mechanics'
import type { Rig } from '../rig'
import { airDensity, gravity } from '../world'

/** Balls you can launch: mass (kg), radius (m), drag coefficient. */
export const BALLS = {
  steel: { name: 'steel ball', m: 0.1, r: 0.015, cd: 0.47 },
  golf: { name: 'golf ball', m: 0.046, r: 0.0214, cd: 0.3 },
  pingpong: { name: 'ping-pong ball', m: 0.0027, r: 0.02, cd: 0.5 },
  foam: { name: 'foam ball', m: 0.01, r: 0.04, cd: 0.5 },
} as const
export type Ball = keyof typeof BALLS

export interface Shot { angleDeg: number; speed: number; height: number; ball: Ball; range: number; maxHeight: number; time: number }

export interface LauncherState {
  angleDeg: number
  speed: number
  height: number
  ball: Ball
  targetX: number
  x: number
  y: number
  vx: number
  vy: number
  flying: boolean
  firedAt: number
  maxHeight: number
  landed: Shot | null
  shots: Shot[]
}

const TARGET_RADIUS = 0.25

const params = z.object({
  angleDeg: z.number().min(0).max(90).default(45),
  speed: z.number().min(1).max(15).default(8),
  height: z.number().min(0).max(2).default(0),
  ball: z.enum(['steel', 'golf', 'pingpong', 'foam']).default('steel'),
  targetX: z.number().min(1).max(25).default(6),
})

type A =
  | { type: 'launch-set'; angleDeg?: number; speed?: number; height?: number; ball?: Ball; targetX?: number }
  | { type: 'launch-fire' }
  | { type: 'launch-reset' }
  | { type: 'launch-clear' }

const rad = (d: number) => (d * Math.PI) / 180
const ready = (s: LauncherState): LauncherState => ({ ...s, x: 0, y: s.height, vx: 0, vy: 0, flying: false, maxHeight: s.height, landed: null })

export const launcherRig: Rig<LauncherState, A, z.infer<typeof params>> = {
  kind: 'launcher',
  name: 'projectile launcher',
  schemas: {
    params,
    actions: [
      z.object({
        type: z.literal('launch-set'), angleDeg: z.number().min(0).max(90).optional(), speed: z.number().min(1).max(15).optional(),
        height: z.number().min(0).max(2).optional(), ball: z.enum(['steel', 'golf', 'pingpong', 'foam']).optional(), targetX: z.number().min(1).max(25).optional(),
      }),
      z.object({ type: z.literal('launch-fire') }),
      z.object({ type: z.literal('launch-reset') }),
      z.object({ type: z.literal('launch-clear') }),
    ],
  },
  instruments: [
    { id: 'tape', name: 'Measuring tape (range)', targets: ['range', 'target'] },
    { id: 'height-gauge', name: 'Height gauge (highest point)', targets: ['ball'] },
    { id: 'flight-timer', name: 'Flight timer', targets: ['ball'] },
    { id: 'speedometer', name: 'Speed', targets: ['ball'] },
    { id: 'protractor', name: 'Protractor', targets: ['launcher'] },
  ],
  create: (p) => ready({ ...p, x: 0, y: p.height, vx: 0, vy: 0, flying: false, firedAt: 0, maxHeight: p.height, landed: null, shots: [] }),

  apply(s, a, _w, time) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'launch-set': {
        const n = ready({ ...s, ...Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) })
        const bits = [
          a.angleDeg !== undefined && `angle ${a.angleDeg}°`, a.speed !== undefined && `speed ${a.speed} m/s`,
          a.height !== undefined && `launch height ${a.height} m`, a.ball && BALLS[a.ball].name, a.targetX !== undefined && `target at ${a.targetX} m`,
        ].filter(Boolean)
        return { state: n, events: [act(`Set the launcher: ${bits.join(', ')}.`)] }
      }
      case 'launch-fire': {
        if (s.flying) return { state: s, events: [] }
        const r = ready(s)
        return {
          state: { ...r, flying: true, firedAt: time, vx: s.speed * Math.cos(rad(s.angleDeg)), vy: s.speed * Math.sin(rad(s.angleDeg)) },
          events: [act(`Fired the ${BALLS[s.ball].name} at ${s.speed} m/s, ${s.angleDeg}°.`)],
        }
      }
      case 'launch-reset':
        return { state: ready(s), events: [act('Loaded another ball.')] }
      case 'launch-clear':
        return { state: { ...ready(s), shots: [] }, events: [act('Cleared the landing marks.')] }
    }
  },

  step(s, dt, w, time) {
    const b = BALLS[s.ball]
    const g = gravity(w)
    const k = (0.5 * airDensity(w) * b.cd * Math.PI * b.r * b.r) / b.m
    const [x, y, vx, vy] = rk4((_t, [, , ux, uy]) => {
      const sp = Math.hypot(ux, uy)
      return [ux, uy, -k * sp * ux, -g - k * sp * uy]
    }, time, [s.x, s.y, s.vx, s.vy], dt)
    const maxHeight = Math.max(s.maxHeight, y)
    if (y > 0) return { state: { ...s, x, y, vx, vy, maxHeight }, events: [] }
    // Landed during this step: interpolate to the floor.
    const f = s.y / (s.y - y)
    const lx = s.x + f * (x - s.x)
    const t = time + f * dt - s.firedAt
    const shot: Shot = { angleDeg: s.angleDeg, speed: s.speed, height: s.height, ball: s.ball, range: lx, maxHeight, time: t }
    const events: LabEvent[] = [{ kind: 'observation', text: `The ball lands ${lx.toFixed(2)} m away after ${t.toFixed(2)} s (highest point ${maxHeight.toFixed(2)} m).`, tags: ['landed'] }]
    if (Math.abs(lx - s.targetX) <= TARGET_RADIUS) events.push({ kind: 'observation', text: 'Bullseye! It hits the target.', tags: ['target-hit'] })
    return {
      state: { ...s, x: lx, y: 0, vx: s.vx + f * (vx - s.vx), vy: s.vy + f * (vy - s.vy), flying: false, maxHeight, landed: shot, shots: [...s.shots.slice(-11), shot] },
      events,
    }
  },

  atRest: (s) => !s.flying,

  measure(s, inst, target, _w, time) {
    switch (inst) {
      case 'tape':
        if (target === 'target') return { quantity: 'target distance', value: s.targetX, unit: 'm', instrument: inst }
        return s.landed ? { quantity: 'range', value: round(s.landed.range, 3), unit: 'm', instrument: inst } : null
      case 'height-gauge':
        return s.landed || s.flying ? { quantity: 'highest point', value: round(s.maxHeight, 3), unit: 'm', instrument: inst } : null
      case 'flight-timer':
        if (s.landed) return { quantity: 'flight time', value: round(s.landed.time, 3), unit: 's', instrument: inst }
        return s.flying ? { quantity: 'flight time', value: round(time - s.firedAt, 3), unit: 's', instrument: inst } : null
      case 'speedometer':
        return { quantity: 'ball speed', value: round(Math.hypot(s.vx, s.vy), 3), unit: 'm/s', instrument: inst }
      case 'protractor':
        return { quantity: 'launch angle', value: s.angleDeg, unit: '°', instrument: inst }
      default:
        return null
    }
  },
}
