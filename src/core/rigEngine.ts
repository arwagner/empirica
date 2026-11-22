import { z } from 'zod'
import type { Domain, Engine } from './domain'
import type { LabEvent, Measurement } from './lab'

/**
 * A piece of apparatus at a station (a ramp, a microscope, an agar plate...). The rig engine owns
 * time and (optionally) world settings; a rig owns its own state, actions and behaviour over time.
 */
export interface Rig<S = unknown, A extends { type: string } = { type: string }, P = unknown, W = unknown> {
  kind: string
  name: string
  /** Zod schemas for setup parameters and actions (action types must be unique across rigs). */
  schemas: { params: z.ZodType<P>; actions: z.ZodType<A>[] }
  create(params: P, world: W): S
  /** Instant actions: adjust apparatus, release, reset... */
  apply(s: S, action: A, world: W, time: number): { state: S; events: LabEvent[] }
  /** Advance by dt seconds; report anything notable as events. */
  step(s: S, dt: number, world: W, time: number): { state: S; events: LabEvent[] }
  /** Nothing is changing, so time can skip ahead safely. */
  atRest(s: S): boolean
  measure(s: S, instrument: string, target: string, world: W, time: number): Measurement | null
  instruments: { id: string; name: string; targets: string[] }[]
  /** Integration step in seconds (default 1 ms). Slow processes (bacteria, populations) use bigger steps. */
  dt?: number
  /** Longest single wait in seconds (default 600). */
  maxWait?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRig<W = any> = Rig<any, any, any, W>

export interface RigState<W> {
  time: number
  world: W
  rig: { kind: string; state: unknown }
  tags: string[]
}
export interface RigSetup<W> {
  rig: { kind: string; params?: unknown }
  world?: Partial<W>
}
export type RigAction = { type: 'wait'; seconds: number } | ({ type: string } & Record<string, unknown>)
export type RigCheck =
  | { type: 'observed'; tag: string }
  | { type: 'reading'; instrument: string; target: string; min?: number; max?: number }
  | ({ type: 'world' } & Record<string, unknown>)
  | { type: 'all' | 'any'; checks: RigCheck[] }

/** Optional world settings shared by every rig in a domain (physics: planet, air, friction). */
export interface WorldConfig<W> {
  schema: z.ZodObject<z.ZodRawShape>
  defaults: W
  describe: (w: W) => string
}

/**
 * The shape for a "change some settings" action: every field optional and with NO defaults.
 * (Using `params.partial()` keeps defaults, so validation would silently reset unspecified settings.)
 */
type Settable<T extends z.ZodRawShape> = { [K in keyof T]: z.ZodOptional<T[K] extends z.ZodDefault<infer I extends z.ZodTypeAny> ? I : T[K]> }
export function settableShape<T extends z.ZodRawShape>(params: z.ZodObject<T>): Settable<T> {
  return Object.fromEntries(
    Object.entries(params.shape).map(([k, f]) => {
      const field = f as z.ZodTypeAny
      const inner = field instanceof z.ZodDefault ? (field.unwrap() as z.ZodTypeAny) : field
      return [k, inner.optional()]
    }),
  ) as Settable<T>
}

const DEFAULT_DT = 0.001
const DEFAULT_MAX_WAIT = 600

/** Build an engine around a set of rigs. */
export function createRigEngine<W extends object>(rigs: AnyRig<W>[], world?: WorldConfig<W>) {
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
  const tag = (state: RigState<W>, events: LabEvent[]) => {
    for (const e of events) if (e.kind === 'observation') for (const t of e.tags ?? []) if (!state.tags.includes(t)) state.tags.push(t)
  }

  function advance(state: RigState<W>, seconds: number): LabEvent[] {
    const rig = rigOf(state.rig.kind)
    const events: LabEvent[] = []
    const end = state.time + seconds
    const step = rig.dt ?? DEFAULT_DT
    let s = state.rig.state
    while (state.time < end - 1e-12) {
      if (rig.atRest(s)) {
        state.time = end
        break
      }
      const dt = Math.min(step, end - state.time)
      const r = rig.step(s, dt, state.world, state.time)
      s = r.state
      state.time += dt
      events.push(...r.events)
    }
    state.rig = { kind: rig.kind, state: s }
    return events
  }

  const describeWait = (secs: number) =>
    secs >= 86400 * 2 ? `${+(secs / 86400).toFixed(1)} days` : secs >= 3600 ? `${+(secs / 3600).toFixed(1)} h` : secs >= 120 ? `${+(secs / 60).toFixed(1)} min` : `${+secs.toFixed(2)} s`

  const engine: Engine<RigState<W>, RigAction, RigCheck, RigSetup<W>> = {
    create(setup) {
      const w = { ...(world?.defaults ?? ({} as W)), ...setup.world } as W
      const rig = rigOf(setup.rig.kind)
      const params = rig.schemas.params.parse(setup.rig.params ?? {})
      return { time: 0, world: w, rig: { kind: rig.kind, state: rig.create(params, w) }, tags: [] }
    },
    apply(prev, action) {
      const state = structuredClone(prev)
      const act = (text: string): LabEvent => ({ kind: 'action', text, action })
      let events: LabEvent[]
      if (action.type === 'wait') {
        const rig = rigOf(state.rig.kind)
        const secs = Math.min(rig.maxWait ?? DEFAULT_MAX_WAIT, (action as { seconds: number }).seconds)
        events = [act(`Waited ${describeWait(secs)}.`), ...advance(state, secs)]
      } else if (action.type === 'set-world' && world) {
        const patch = Object.fromEntries(Object.entries(action).filter(([k, v]) => k !== 'type' && v !== undefined))
        state.world = { ...state.world, ...patch }
        events = [act(`Set the world to: ${world.describe(state.world)}.`)]
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
          return state.tags.includes((c as { tag: string }).tag)
        case 'reading': {
          const r = c as Extract<RigCheck, { type: 'reading' }>
          const m = engine.measure(state, r.instrument, r.target)
          return !!m && (r.min === undefined || m.value >= r.min) && (r.max === undefined || m.value <= r.max)
        }
        case 'world':
          return Object.entries(c).every(([k, v]) => k === 'type' || v === undefined || (state.world as Record<string, unknown>)[k] === v)
        case 'all':
          return (c as { checks: RigCheck[] }).checks.every((x) => engine.check(state, x))
        case 'any':
          return (c as { checks: RigCheck[] }).checks.some((x) => engine.check(state, x))
        default:
          return false
      }
    },
  }

  const maxWait = Math.max(DEFAULT_MAX_WAIT, ...rigs.map((r) => r.maxWait ?? 0))
  const base: z.ZodTypeAny[] = [z.object({ type: z.literal('wait'), seconds: z.number().positive().max(maxWait) })]
  if (world) base.push(z.object({ type: z.literal('set-world') }).extend(world.schema.partial().shape))
  const actionSchema = z.union([...base, ...rigs.flatMap((r) => r.schemas.actions)] as unknown as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]) as z.ZodType<RigAction>
  const checkSchema: z.ZodType<RigCheck> = z.lazy(() =>
    z.union([
      z.object({ type: z.literal('observed'), tag: z.string().min(1) }),
      z.object({ type: z.literal('reading'), instrument: z.string(), target: z.string(), min: z.number().optional(), max: z.number().optional() }),
      z.object({ type: z.literal('world') }).extend((world?.schema ?? z.object({})).partial().shape),
      z.object({ type: z.enum(['all', 'any']), checks: z.array(checkSchema) }),
    ]),
  ) as z.ZodType<RigCheck>
  const setupSchema = z.object({
    rig: z.object({ kind: z.enum(rigs.length ? (rigs.map((r) => r.kind) as [string, ...string[]]) : ['none']), params: z.unknown().optional() }),
    world: (world?.schema ?? z.object({})).partial().optional(),
  }) as unknown as z.ZodType<RigSetup<W>>

  return { engine, schemas: { action: actionSchema, check: checkSchema, setup: setupSchema } }
}

/** A Domain made of rigs. */
export function rigDomain<W extends object>(
  meta: { id: string; name: string; description: string },
  rigs: AnyRig<W>[],
  world?: WorldConfig<W>,
): Domain<RigState<W>, RigAction, RigCheck, RigSetup<W>> {
  const { engine, schemas } = createRigEngine(rigs, world)
  return {
    ...meta,
    materials: [],
    equipment: rigs.flatMap((r) => r.instruments.map((i) => ({ id: i.id, name: i.name, measures: [] }))),
    schemas,
    engine,
    experiments: [],
  }
}
