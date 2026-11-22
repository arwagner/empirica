import { z } from 'zod'
import type { Rig } from './rig'
import { crossing, drag, rk4, round } from './mechanics'
import { airDensity, gravity } from './world'

/** Toy rig for testing the core: a ball dropped from a height past one light gate. */
interface S { y: number; v: number; m: number; cdA: number; released: boolean; landed: boolean; gateY: number; gateTime: number | null }
type A = { type: 'drop' } | { type: 'set-height'; h: number }
const params = z.object({ h: z.number().default(2), m: z.number().default(0.1), cdA: z.number().default(0.001), gateY: z.number().default(1) })

export const dropRig: Rig<S, A, z.infer<typeof params>> = {
  kind: 'test-drop',
  name: 'test drop',
  schemas: {
    params,
    actions: [z.object({ type: z.literal('drop') }), z.object({ type: z.literal('set-height'), h: z.number().positive() })],
  },
  create: (p) => ({ y: p.h, v: 0, m: p.m, cdA: p.cdA, released: false, landed: false, gateY: p.gateY, gateTime: null }),
  apply(s, a, _w, time) {
    if (a.type === 'drop') return { state: { ...s, released: true }, events: [{ kind: 'action', text: `Dropped at t=${time}`, action: a }] }
    return { state: { ...s, y: a.h, v: 0, released: false, landed: false, gateTime: null }, events: [{ kind: 'action', text: `Height ${a.h}`, action: a }] }
  },
  step(s, dt, w, time) {
    const [y1, v] = rk4((_, [, vv]) => [vv, -gravity(w) + drag(vv, airDensity(w), s.cdA) / s.m], time, [s.y, s.v], dt)
    let y = y1
    const events: import('../../core').LabEvent[] = []
    let gateTime = s.gateTime
    const tc = crossing(time, s.y, time + dt, y, s.gateY)
    if (tc !== null && gateTime === null) {
      gateTime = tc
      events.push({ kind: 'observation', text: 'Gate', tags: ['gate'] })
    }
    let landed = false
    if (y <= 0) {
      y = 0
      landed = true
      events.push({ kind: 'observation', text: 'Thud', tags: ['landed'] })
    }
    return { state: { ...s, y, v: landed ? 0 : v, landed, gateTime }, events }
  },
  atRest: (s) => !s.released || s.landed,
  measure: (s, inst) =>
    inst === 'gate-timer' && s.gateTime !== null ? { quantity: 'time', value: round(s.gateTime, 4), unit: 's', instrument: inst } : null,
  instruments: [{ id: 'gate-timer', name: 'Gate timer', targets: ['gate'] }],
}
