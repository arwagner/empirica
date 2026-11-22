import type { Experiment } from '../../core'

export interface CatalogFilter {
  query: string
  domain: string | null
  topic: string | null
  difficulty: Experiment['difficulty'] | null
}

export const EMPTY_FILTER: CatalogFilter = { query: '', domain: null, topic: null, difficulty: null }

/** Matches every query word against title, summary and topics; applies facet filters. */
export function filterExperiments(all: Experiment[], f: CatalogFilter): Experiment[] {
  const words = f.query.toLowerCase().split(/\s+/).filter(Boolean)
  return all.filter((e) => {
    if (f.domain && e.domain !== f.domain) return false
    if (f.topic && !e.topics.includes(f.topic)) return false
    if (f.difficulty && e.difficulty !== f.difficulty) return false
    const hay = `${e.title} ${e.summary} ${e.topics.join(' ')}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

export const topicsOf = (all: Experiment[]) => [...new Set(all.flatMap((e) => e.topics))].sort()
