import { z } from 'zod'

export const VesselKindSchema = z.enum(['beaker-250', 'beaker-100', 'flask-250', 'test-tube', 'boiling-tube', 'calorimeter', 'crucible'])
export type VesselKind = z.infer<typeof VesselKindSchema>

const id = z.string().min(1)

export const ChemActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('add-vessel'), id, vessel: VesselKindSchema }),
  z.object({ type: z.literal('add'), vessel: id, reagent: id, amount: z.number().positive() }),
  z.object({ type: z.literal('pour'), from: id, to: id, amount: z.number().positive().optional() }),
  z.object({ type: z.literal('filter'), from: id, to: id }),
  z.object({ type: z.literal('heat'), vessel: id, watts: z.number().min(0).max(2000) }),
  z.object({ type: z.literal('wait'), seconds: z.number().positive().max(3600) }),
  z.object({ type: z.literal('stir'), vessel: id }),
  z.object({ type: z.literal('flame-test'), vessel: id }),
  z.object({ type: z.literal('splint'), vessel: id, splint: z.enum(['burning', 'glowing']) }),
  z.object({ type: z.literal('connect-gas'), from: id, to: id.nullable() }),
  z.object({ type: z.literal('burn'), vessel: id }),
  z.object({ type: z.literal('empty'), vessel: id }),
  z.object({ type: z.literal('remove-vessel'), vessel: id }),
])
export type ChemAction = z.infer<typeof ChemActionSchema>

const range = { min: z.number().optional(), max: z.number().optional() }

export type ChemCheck =
  | { type: 'observed'; tag: string }
  | { type: 'ph' | 'temperature' | 'volume'; vessel: string; min?: number; max?: number }
  | { type: 'contains'; vessel: string; species: string; min?: number; max?: number }
  | { type: 'gas-evolved'; vessel: string; gas: string; minMl?: number }
  | { type: 'vessel-exists'; vessel: string }
  | { type: 'heater'; vessel: string; min?: number; max?: number }
  | { type: 'connected'; from: string; to: string }
  | { type: 'all' | 'any'; checks: ChemCheck[] }

export const ChemCheckSchema: z.ZodType<ChemCheck> = z.lazy(() =>
  z.union([
    z.object({ type: z.literal('observed'), tag: id }),
    z.object({ type: z.enum(['ph', 'temperature', 'volume']), vessel: id, ...range }),
    z.object({ type: z.literal('contains'), vessel: id, species: id, ...range }),
    z.object({ type: z.literal('gas-evolved'), vessel: id, gas: id, minMl: z.number().optional() }),
    z.object({ type: z.literal('vessel-exists'), vessel: id }),
    z.object({ type: z.literal('heater'), vessel: id, ...range }),
    z.object({ type: z.literal('connected'), from: id, to: id }),
    z.object({ type: z.enum(['all', 'any']), checks: z.array(ChemCheckSchema) }),
  ]),
)

export const ChemSetupSchema = z.object({
  roomTempC: z.number().optional(),
  vessels: z
    .array(z.object({ id, kind: VesselKindSchema, contents: z.array(z.object({ reagent: id, amount: z.number().positive() })).optional() }))
    .optional(),
})
export type ChemSetup = z.infer<typeof ChemSetupSchema>
