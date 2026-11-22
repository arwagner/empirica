import { z } from 'zod'
import type { Domain, Experiment } from '.'

/** A tiny domain for testing the core: a jar you add marbles to. */
const action = z.object({ type: z.literal('add'), count: z.number().int() })
const check = z.object({ atLeast: z.number().int() })
const setup = z.object({ start: z.number().int() })
type A = z.infer<typeof action>
type C = z.infer<typeof check>
type S = z.infer<typeof setup>

const e = (t: string) => ({ simple: t, intermediate: t, advanced: t })

export const marbleExperiment = (over: Partial<Experiment<A, C, S>> = {}): Experiment<A, C, S> => ({
  id: 'fill-the-jar',
  domain: 'marbles',
  title: 'Fill the jar',
  summary: 'Add marbles.',
  topics: ['counting'],
  difficulty: 'intro',
  minutes: 1,
  hazards: [],
  setup: { start: 0 },
  intro: e('Jars hold marbles.'),
  steps: [
    {
      instruction: 'Add three marbles',
      action: [{ type: 'add', count: 3 }],
      check: { atLeast: 3 },
      observation: 'Clink.',
      explanation: e('Three is more than zero.'),
    },
  ],
  conclusion: e('The jar is fuller.'),
  variations: [],
  ...over,
})

export const marbles = (experiments = [marbleExperiment()]): Domain<number, A, C, S> => ({
  id: 'marbles',
  name: 'Marbles',
  description: 'Test domain',
  materials: [{ id: 'marble', name: 'Marble', hazards: [] }],
  equipment: [{ id: 'counter', name: 'Counter', measures: ['count'] }],
  schemas: { action, check, setup },
  engine: {
    create: (s) => s.start,
    apply: (n, a) => ({
      state: n + a.count,
      events: [
        { kind: 'action', text: `Added ${a.count} marbles.`, action: a },
        { kind: 'observation', text: `${a.count} marbles added` },
      ],
    }),
    measure: (n, inst) =>
      inst === 'counter' ? { quantity: 'count', value: n, unit: '', instrument: inst } : null,
    check: (n, c) => n >= c.atLeast,
  },
  experiments,
})
