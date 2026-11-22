import { z } from 'zod'

export const LEVELS = ['simple', 'intermediate', 'advanced'] as const
export type Level = (typeof LEVELS)[number]

/** Every explanation in Empirica comes in three depths; the reader picks one. */
export const ExplanationSchema = z.object({
  simple: z.string().min(1),
  intermediate: z.string().min(1),
  advanced: z.string().min(1),
})
export type Explanation = z.infer<typeof ExplanationSchema>

export const explain = (e: Explanation, level: Level): string => e[level]
