import { Daily, memoryStore } from './budget'
import type { Catalog } from './catalog'
import type { IssueTracker } from './github'
import type { ProfessorModel, TopicChecker } from './models'
import { createProfessor, type ProfessorDeps } from './professor'
import { RateLimiter } from './rateLimit'
import type { Draft } from './tickets'

export const CATALOG: Catalog = {
  stations: [{ id: 'flame-station', name: 'Flame Test Station', blurb: 'Bunsen burner and wire loop.', room: 'Chemistry Lab', domain: 'chemistry', comingSoon: false }],
  domains: [
    {
      id: 'chemistry', name: 'Chemistry', description: 'Acids and bases.',
      equipment: [{ id: 'bunsen', name: 'Bunsen burner', measures: [] }, { id: 'thermometer', name: 'Thermometer', measures: ['temperature'] }],
      materials: [{ id: 'kcl', name: 'Potassium chloride' }],
      experiments: [{ id: 'flame-tests', title: 'Flame tests', summary: 'Metal ions colour a flame.', station: 'flame-station', topics: ['ions'], difficulty: 'intro' }],
    },
  ],
}

export const DRAFT: Draft = {
  equipment: 'Geiger counter',
  question: 'How radioactive is a banana?',
  measures: 'Counts per minute of ionising radiation',
  location: 'Physics Hall',
  phone: 'Tap Start and Stop; the count shows in large digits that fit a 360px screen.',
}

/** A professor wired to fakes that record every call, so tests can prove when no model or GitHub call happened. */
export function setup(over: Partial<ProfessorDeps> & { reply?: Awaited<ReturnType<ProfessorModel['reply']>>; onTopic?: boolean; open?: { number: number; title: string; url: string }[] } = {}) {
  const calls = { topic: 0, model: 0, create: [] as { title: string; body: string; labels: string[] }[], comment: [] as number[] }
  const topic: TopicChecker = {
    check: async () => (calls.topic++, { onTopic: over.onTopic ?? true, costUsd: 0.0001 }),
  }
  const model: ProfessorModel = {
    reply: async () => (calls.model++, over.reply ?? { text: 'What do you think the colour tells you?', refused: false, costUsd: 0.01 }),
  }
  const tracker: IssueTracker = {
    openSuggestions: async () => over.open ?? [],
    create: async (i) => (calls.create.push(i), { number: 42, url: 'https://github.com/x/y/issues/42' }),
    comment: async (n) => (calls.comment.push(n), { url: 'u' }),
  }
  let t = 1_000_000
  const deps: ProfessorDeps = {
    catalog: CATALOG, topic, model, tracker,
    daily: new Daily(memoryStore(), 0.3, 5, () => new Date(t)),
    chatLimit: new RateLimiter(20, 3600_000, () => t),
    ticketLimit: new RateLimiter(5, 3600_000, () => t),
    secret: 'test-secret',
    now: () => t,
    ...over,
  }
  return { professor: createProfessor(deps), calls, deps, advance: (ms: number) => void (t += ms) }
}

export const ask = (message: string, extra: object = {}) => ({ history: [], notebook: [], message, ...extra })
