import { z } from 'zod'
import { ExplanationSchema } from './explanation'

export const HAZARD_KINDS = [
  'flammable', 'corrosive', 'toxic', 'oxidizer', 'explosive', 'irritant',
  'radiation', 'biohazard', 'hot', 'cryogenic', 'electrical', 'laser', 'pressure',
] as const

export const HazardSchema = z.object({
  kind: z.enum(HAZARD_KINDS),
  note: z.string().optional(),
})
export type Hazard = z.infer<typeof HazardSchema>

/** Something you can put into an experiment: a chemical, a specimen, a light source, a star. */
export const MaterialSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  hazards: z.array(HazardSchema).default([]),
})
export type Material = z.infer<typeof MaterialSchema>

/** A tool on the bench. Instruments name the quantities they can measure. */
export const EquipmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  measures: z.array(z.string()).default([]),
  explanation: ExplanationSchema.optional(),
})
export type Equipment = z.infer<typeof EquipmentSchema>

export interface Measurement {
  quantity: string
  value: number
  unit: string
  instrument: string
}

/** Everything that happens in a session, in order. The notebook is a view of these. */
export type LabEvent =
  | { kind: 'action'; text: string; action: unknown }
  /** `why`: an engine-generated explanation of the cause, at three levels. */
  | { kind: 'observation'; text: string; tags?: string[]; why?: z.infer<typeof ExplanationSchema> }
  | { kind: 'measurement'; text: string; measurement: Measurement }
