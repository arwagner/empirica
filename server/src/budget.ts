import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/** $ per million tokens. Cache writes are 1.25x input, cache reads 0.1x (5-minute TTL). */
export const PRICES = {
  'claude-sonnet-5-5': { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
} as const
export type PricedModel = keyof typeof PRICES

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

export function costUsd(model: PricedModel, u: TokenUsage): number {
  const p = PRICES[model]
  return (
    (u.input_tokens * p.input + u.output_tokens * p.output + (u.cache_creation_input_tokens ?? 0) * p.cacheWrite + (u.cache_read_input_tokens ?? 0) * p.cacheRead) /
    1e6
  )
}

/** The only state the server keeps across restarts: today's spend and today's new issues. */
export interface DayCounters {
  day: string
  spentUsd: number
  issuesFiled: number
}

export interface CounterStore {
  load(): DayCounters | null
  save(c: DayCounters): void
}

export const memoryStore = (): CounterStore => {
  let c: DayCounters | null = null
  return { load: () => c, save: (n) => void (c = n) }
}

/** Counters in a small JSON file, so a restart doesn't hand out a fresh day's budget. */
export const fileStore = (path: string): CounterStore => ({
  load() {
    if (!existsSync(path)) return null
    try {
      const c = JSON.parse(readFileSync(path, 'utf8'))
      return typeof c.day === 'string' && typeof c.spentUsd === 'number' && typeof c.issuesFiled === 'number' ? c : null
    } catch {
      return null
    }
  },
  save: (c) => writeFileSync(path, JSON.stringify(c)),
})

export const utcDay = (now: Date) => now.toISOString().slice(0, 10)

/** The daily budget and the daily cap on new issues. Both reset at midnight UTC. */
export class Daily {
  private store: CounterStore
  readonly budgetUsd: number
  readonly maxIssues: number
  private now: () => Date

  constructor(store: CounterStore, budgetUsd: number, maxIssues: number, now: () => Date = () => new Date()) {
    this.store = store
    this.budgetUsd = budgetUsd
    this.maxIssues = maxIssues
    this.now = now
  }

  private today(): DayCounters {
    const day = utcDay(this.now())
    const c = this.store.load()
    return c && c.day === day ? c : { day, spentUsd: 0, issuesFiled: 0 }
  }

  /** Is there room for a call that could cost up to `worstCaseUsd`? */
  canSpend(worstCaseUsd: number): boolean {
    return this.today().spentUsd + worstCaseUsd <= this.budgetUsd
  }

  spend(usd: number) {
    const c = this.today()
    this.store.save({ ...c, spentUsd: c.spentUsd + usd })
  }

  canFileIssue(): boolean {
    return this.today().issuesFiled < this.maxIssues
  }

  issueFiled() {
    const c = this.today()
    this.store.save({ ...c, issuesFiled: c.issuesFiled + 1 })
  }

  snapshot(): DayCounters {
    return this.today()
  }
}
