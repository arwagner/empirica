import { z } from 'zod'
import { ExplanationSchema } from './explanation'
import { HazardSchema } from './lab'

export const DIFFICULTIES = ['intro', 'core', 'advanced'] as const

const stepShape = <A extends z.ZodType, C extends z.ZodType>(action: A, check: C) =>
  z.object({
    instruction: z.string().min(1),
    /** The canonical way to do the step. Drives hints and the procedure tests. */
    action: z.array(action).min(1),
    /** Done when this holds, however the user got there. */
    check,
    observation: z.string().min(1),
    explanation: ExplanationSchema,
    hint: z.string().optional(),
  })

/** Builds the experiment schema for one domain, plugging in its action/check/setup schemas. */
export const experimentSchema = <A extends z.ZodType, C extends z.ZodType, S extends z.ZodType>(
  s: { action: A; check: C; setup: S },
) =>
  z.object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'kebab-case id'),
    domain: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().min(1),
    topics: z.array(z.string()).min(1),
    difficulty: z.enum(DIFFICULTIES),
    minutes: z.number().int().positive(),
    station: z.string().optional(),
    hazards: z.array(HazardSchema).default([]),
    setup: s.setup,
    intro: ExplanationSchema,
    steps: z.array(stepShape(s.action, s.check)).min(1),
    conclusion: ExplanationSchema,
    variations: z
      .array(z.object({ prompt: z.string().min(1), explanation: ExplanationSchema.optional() }))
      .default([]),
  })

export interface Step<Action, Check> {
  instruction: string
  action: Action[]
  check: Check
  observation: string
  explanation: z.infer<typeof ExplanationSchema>
  hint?: string
}

export interface Experiment<Action = unknown, Check = unknown, Setup = unknown> {
  id: string
  domain: string
  title: string
  summary: string
  topics: string[]
  difficulty: (typeof DIFFICULTIES)[number]
  minutes: number
  station?: string
  hazards: z.infer<typeof HazardSchema>[]
  setup: Setup
  intro: z.infer<typeof ExplanationSchema>
  steps: Step<Action, Check>[]
  conclusion: z.infer<typeof ExplanationSchema>
  variations: { prompt: string; explanation?: z.infer<typeof ExplanationSchema> }[]
}
