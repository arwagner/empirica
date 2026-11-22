import { z } from 'zod'
import type { LabEvent } from '../../../core'
import { crossing, drag, rk4, round, terminalVelocity } from '../mechanics'
import type { Rig } from '../rig'
import { airDensity, gravity } from '../world'

/** Things to drop: mass (kg) and drag area C_d·A (m²). Feathers and filters are all drag. */
export const OBJECTS = {
  hammer: { name: 'hammer', m: 0.5, cdA: 0.003 },
  steel: { name: 'steel ball', m: 0.1, cdA: 0.00033 },
  pingpong: { name: 'ping-pong ball', m: 0.0027, cdA: 0.00063 },
  filter: { name: 'coffee filter', m: 0.001, cdA: 0.0114 },
  parachute: { name: 'toy parachute', m: 0.02, cdA: 0.082 },
  feather: { name: 'feather', m: 0.0005, cdA: 0.033 },
} as const
export type DropObject = keyof typeof OBJECTS
export type Lane = 'left' | 'right'

export interface Faller { object: DropObject | null; y: number; v: number; landedAt: number | null; gates: (number | null)[] }

export interface DropState {
  height: number
  lanes: Record<Lane, Faller>
  released: boolean
  releasedAt: number
}

const params = z.object({
  height: z.number().min(1).max(5).default(4),
  left: z.enum(['hammer', 'steel', 'pingpong', 'filter', 'parachute', 'feather']).nullable().default('hammer'),
  right: z.enum(['hammer', 'steel', 'pingpong', 'filter', 'parachute', 'feather']).nullable().default('feather'),
})

type A =
  | { type: 'drop-set'; height?: number; left?: DropObject | null; right?: DropObject | null }
  | { type: 'drop-release' }
  | { type: 'drop-reset' }

/** Light gates every metre below the top. */
export const gateDepths = (height: number) => Array.from({ length: Math.floor(height) }, (_, i) => i + 1).filter((d) => d < height)

const fresh = (object: DropObject | null, height: number): Faller => ({ object, y: height, v: 0, landedAt: null, gates: gateDepths(height).map(() => null) })
const rack = (s: DropState): DropState => ({
  ...s, released: false,
  lanes: { left: fresh(s.lanes.left.object, s.height), right: fresh(s.lanes.right.object, s.height) },
})

const objSchema = z.enum(['hammer', 'steel', 'pingpong', 'filter', 'parachute', 'feather']).nullable()

export const dropTowerRig: Rig<DropState, A, z.infer<typeof params>> = {
  kind: 'drop-tower',
  name: 'drop tower',
  schemas: {
    params,
    actions: [
      z.object({ type: z.literal('drop-set'), height: z.number().min(1).max(5).optional(), left: objSchema.optional(), right: objSchema.optional() }),
      z.object({ type: z.literal('drop-release') }),
      z.object({ type: z.literal('drop-reset') }),
    ],
  },
  instruments: [
    { id: 'fall-timer', name: 'Fall timer', targets: ['left', 'right'] },
    { id: 'speed', name: 'Speed sensor', targets: ['left', 'right'] },
    { id: 'gate', name: 'Light gates (time to each metre)', targets: ['left:1', 'left:2', 'left:3', 'left:4', 'right:1', 'right:2', 'right:3', 'right:4'] },
    { id: 'terminal-velocity', name: 'Terminal velocity (calculated)', targets: ['left', 'right'] },
  ],
  create: (p) => rack({ height: p.height, released: false, releasedAt: 0, lanes: { left: fresh(p.left, p.height), right: fresh(p.right, p.height) } }),

  apply(s, a, _w, time) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    switch (a.type) {
      case 'drop-set': {
        const n = rack({
          ...s, height: a.height ?? s.height,
          lanes: {
            left: { ...s.lanes.left, object: a.left !== undefined ? a.left : s.lanes.left.object },
            right: { ...s.lanes.right, object: a.right !== undefined ? a.right : s.lanes.right.object },
          },
        })
        const name = (o: DropObject | null) => (o ? `a ${OBJECTS[o].name}` : 'nothing')
        const bits = [a.height !== undefined && `drop height ${a.height} m`, a.left !== undefined && `left: ${name(a.left)}`, a.right !== undefined && `right: ${name(a.right)}`].filter(Boolean)
        return { state: n, events: [act(`Set up the drop tower: ${bits.join(', ')}.`)] }
      }
      case 'drop-release':
        if (s.released) return { state: s, events: [] }
        return { state: { ...rack(s), released: true, releasedAt: time }, events: [act('Released both objects at the same moment.')] }
      case 'drop-reset':
        return { state: rack(s), events: [act('Put the objects back at the top.')] }
    }
  },

  step(s, dt, w, time) {
    const g = gravity(w)
    const rho = airDensity(w)
    const events: LabEvent[] = []
    const lanes = { ...s.lanes }
    for (const lane of ['left', 'right'] as Lane[]) {
      const f = s.lanes[lane]
      if (!f.object || f.landedAt !== null) continue
      const o = OBJECTS[f.object]
      // Positive v = downward.
      const [y, v] = rk4((_t, [, u]) => [-u, g + drag(u, rho, o.cdA) / o.m], time, [f.y, f.v], dt)
      const depthsBefore = s.height - f.y
      const depthsAfter = s.height - y
      const gates = f.gates.map((t, i) => {
        if (t !== null) return t
        const tc = crossing(time, depthsBefore, time + dt, depthsAfter, gateDepths(s.height)[i])
        return tc === null ? null : tc - s.releasedAt
      })
      if (y <= 0) {
        const frac = f.y / (f.y - y)
        const landedAt = time + frac * dt - s.releasedAt
        events.push({ kind: 'observation', text: `The ${o.name} (${lane}) hits the bottom after ${landedAt.toFixed(3)} s.`, tags: ['landed', `landed:${lane}`, `landed:${f.object}`] })
        lanes[lane] = { ...f, y: 0, v: f.v + frac * (v - f.v), landedAt, gates }
      } else lanes[lane] = { ...f, y, v, gates }
    }
    const both = (['left', 'right'] as Lane[]).filter((l) => s.lanes[l].object)
    const done = both.every((l) => lanes[l].landedAt !== null)
    if (both.length === 2 && done && !both.every((l) => s.lanes[l].landedAt !== null)) {
      const [a, b] = both.map((l) => lanes[l].landedAt!)
      if (Math.abs(a - b) < 0.01) events.push({ kind: 'observation', text: 'They land at the same moment!', tags: ['together'] })
      else events.push({ kind: 'observation', text: `The ${OBJECTS[(a < b ? lanes.left : lanes.right).object!].name} wins by ${Math.abs(a - b).toFixed(2)} s.`, tags: ['apart'] })
    }
    return { state: { ...s, lanes }, events }
  },

  atRest: (s) => !s.released || (['left', 'right'] as Lane[]).every((l) => !s.lanes[l].object || s.lanes[l].landedAt !== null),

  measure(s, inst, target, w) {
    const [laneName, depth] = target.split(':') as [Lane, string?]
    const f = s.lanes[laneName]
    if (!f?.object) return null
    switch (inst) {
      case 'fall-timer':
        return f.landedAt !== null ? { quantity: `${laneName} fall time`, value: round(f.landedAt, 3), unit: 's', instrument: inst } : null
      case 'speed':
        return { quantity: `${laneName} speed`, value: round(f.v, 3), unit: 'm/s', instrument: inst }
      case 'gate': {
        const i = gateDepths(s.height).indexOf(Number(depth))
        const t = i >= 0 ? f.gates[i] : null
        return t != null ? { quantity: `${laneName} time to ${depth} m`, value: round(t, 3), unit: 's', instrument: inst } : null
      }
      case 'terminal-velocity': {
        const vt = terminalVelocity(OBJECTS[f.object].m, gravity(w), airDensity(w), OBJECTS[f.object].cdA)
        return Number.isFinite(vt) ? { quantity: `${laneName} terminal velocity`, value: round(vt, 2), unit: 'm/s', instrument: inst } : null
      }
      default:
        return null
    }
  },
}
