import { z } from 'zod'
import type { Domain, Engine, LabEvent } from '../../core'
import type { AnyRig } from './rig'
import { DEFAULT_WORLD, PLANETS, WorldSchema, type World } from './world'

/** Fixed integration step. Small enough for accurate pendulums and collisions. */
export const DT = 0.001
export const MAX_WAIT = 600

export interface PhysicsState {
  time: number
  world: World
  rig: { kind: string; state: unknown }
  tags: string[]
}

export interface PhysicsSetup {
  rig: { kind: string; params?: unknown }
  world?: Partial<World>
}

export type PhysicsAction =
  | { type: 'wait'; seconds: number }
  | { type: 'set-world'; planet?: World['planet']; air?: boolean; friction?: boolean }
  | ({ type: string } & Record<string, unknown>)

export type PhysicsCheck =
  | { type: 'observed'; tag: string }
  | { type: 'reading'; instrument: string; target: string; min?: number; max?: number }
  | { type: 'world'; planet?: World['planet']; air?: boolean; friction?: boolean }
  | { type: 'all' | 'any'; checks: PhysicsCheck[] }

const CheckSchema: z.ZodType<PhysicsCheck> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('observed'), tag: z.string().min(1) }),
    z.object({ type: z.literal('reading'), instrument: z.string(), target: z.string(), min: z.number().optional(), max: z.number().optional() }),
    z.object({ type: z.literal('world'), planet: WorldSchema.shape.planet.optional(), air: z.boolean().optional(), friction: z.boolean().optional() }),
    z.object({ type: z.enum(['all', 'any']), checks: z.array(CheckSchema) }),
  ]),
)

const describeWorld = (w: World) =>
  `${PLANETS[w.planet].name}, air resistance ${w.air ? 'on' : 'off'}, friction ${w.friction ? 'on' : 'off'}`

/** Build the physics engine around a set of rigs. */
export function createPhysicsEngine(rigs: AnyRig[]) {
  const rigOf = (kind: string) => {
    const r = rigs.find((x) => x.kind === kind)
    if (!r) throw new Error(`Unknown rig "${kind}"`)
    return r
  }
  /** Does this action schema accept this `type`? (Other fields may still be wrong.) */
  const acceptsType = (schema: z.ZodType, type: string) => {
    const r = schema.safeParse({ type })
    return r.success || r.error.issues.every((i) => i.path[0] !== 'type')
  }
  const owner = (type: string) => rigs.find((r) => r.schemas.actions.some((s) => acceptsType(s, type)))

  const tag = (state: PhysicsState, events: LabEvent[]) => {
    for (const e of events) if (e.kind === 'observation') for (const t of e.tags ?? []) if (!state.tags.includes(t)) state.tags.push(t)
  }

  function advance(state: PhysicsState, seconds: number): LabEvent[] {
    const rig = rigOf(state.rig.kind)
    const events: LabEvent[] = []
    const end = state.time + seconds
    let s = state.rig.state
    while (state.time < end - 1e-12) {
      if (rig.atRest(s)) {
        state.time = end
        break
      }
      const dt = Math.min(DT, end - state.time)
      const r = rig.step(s, dt, state.world, state.time)
      s = r.state
      state.time += dt
      events.push(...r.events)
    }
    state.rig = { kind: rig.kind, state: s }
    return events
  }

  const engine: Engine<PhysicsState, PhysicsAction, PhysicsCheck, PhysicsSetup> = {
    create(setup) {
      const world = { ...DEFAULT_WORLD, ...setup.world }
      const rig = rigOf(setup.rig.kind)
      const params = rig.schemas.params.parse(setup.rig.params ?? {})
      return { time: 0, world, rig: { kind: rig.kind, state: rig.create(params, world) }, tags: [] }
    },
    apply(prev, action) {
      const state = structuredClone(prev)
      const act = (text: string): LabEvent => ({ kind: 'action', text, action })
      let events: LabEvent[]
      if (action.type === 'wait') {
        const secs = Math.min(MAX_WAIT, (action as { seconds: number }).seconds)
        events = [act(`Waited ${secs} s.`), ...advance(state, secs)]
      } else if (action.type === 'set-world') {
        const a = action as Partial<World>
        state.world = { ...state.world, ...Object.fromEntries(Object.entries(a).filter(([k, v]) => k !== 'type' && v !== undefined)) }
        events = [act(`Set the world to: ${describeWorld(state.world)}.`)]
      } else {
        const rig = rigOf(state.rig.kind)
        if (!rig.schemas.actions.some((s) => s.safeParse(action).success)) {
          const other = owner(action.type)
          throw new Error(other && other !== rig ? `That control belongs to the ${other.name}, not the ${rig.name}.` : `The ${rig.name} can't do "${action.type}".`)
        }
        const r = rig.apply(state.rig.state, action, state.world, state.time)
        state.rig = { kind: rig.kind, state: r.state }
        events = r.events
      }
      tag(state, events)
      return { state, events }
    },
    measure(state, instrument, target) {
      return rigOf(state.rig.kind).measure(state.rig.state, instrument, target, state.world, state.time)
    },
    check(state, c): boolean {
      switch (c.type) {
        case 'observed':
          return state.tags.includes(c.tag)
        case 'reading': {
          const m = engine.measure(state, c.instrument, c.target)
          return !!m && (c.min === undefined || m.value >= c.min) && (c.max === undefined || m.value <= c.max)
        }
        case 'world':
          return (c.planet === undefined || state.world.planet === c.planet) && (c.air === undefined || state.world.air === c.air) && (c.friction === undefined || state.world.friction === c.friction)
        case 'all':
          return c.checks.every((x) => engine.check(state, x))
        case 'any':
          return c.checks.some((x) => engine.check(state, x))
      }
    },
  }

  const base = [
    z.object({ type: z.literal('wait'), seconds: z.number().positive().max(MAX_WAIT) }),
    z.object({ type: z.literal('set-world'), planet: WorldSchema.shape.planet.optional(), air: z.boolean().optional(), friction: z.boolean().optional() }),
  ]
  const actionSchema = z.union([base[0], base[1], ...rigs.flatMap((r) => r.schemas.actions)] as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]) as z.ZodType<PhysicsAction>
  const setupSchema = z.object({
    rig: z.object({ kind: z.enum(rigs.length ? (rigs.map((r) => r.kind) as [string, ...string[]]) : ['none']), params: z.unknown().optional() }),
    world: WorldSchema.partial().optional(),
  }) as z.ZodType<PhysicsSetup>

  return { engine, schemas: { action: actionSchema, check: CheckSchema, setup: setupSchema } }
}

/** Build the physics Domain from rigs. */
export function physicsDomain(rigs: AnyRig[]): Domain<PhysicsState, PhysicsAction, PhysicsCheck, PhysicsSetup> {
  const { engine, schemas } = createPhysicsEngine(rigs)
  return {
    id: 'physics',
    name: 'Physics',
    description: 'Motion, forces, energy and momentum: ramps, collisions, pendulums, projectiles and free fall.',
    materials: [],
    equipment: rigs.flatMap((r) => r.instruments.map((i) => ({ id: i.id, name: i.name, measures: [] }))),
    schemas,
    engine,
    experiments: [],
  }
}
