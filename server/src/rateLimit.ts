import { createHmac, randomBytes } from 'node:crypto'

/**
 * A sliding-window limit per client. Clients are keyed by an HMAC of their IP with a salt made fresh
 * each time the server starts, kept only in memory, and forgotten once their window is empty:
 * nothing that identifies a visitor is ever written down.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>()
  private salt = randomBytes(16)

  readonly limit: number
  readonly windowMs: number
  private now: () => number

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit
    this.windowMs = windowMs
    this.now = now
  }

  key(ip: string): string {
    return createHmac('sha256', this.salt).update(ip).digest('base64url').slice(0, 22)
  }

  /** Counts a request and says whether it's allowed. Requests over the limit aren't counted. */
  take(ip: string): boolean {
    const k = this.key(ip)
    const t = this.now()
    const recent = (this.hits.get(k) ?? []).filter((h) => h > t - this.windowMs)
    if (recent.length >= this.limit) {
      this.hits.set(k, recent)
      return false
    }
    recent.push(t)
    this.hits.set(k, recent)
    this.sweep(t)
    return true
  }

  /** How many clients are being tracked (for tests and health checks). */
  get size() {
    return this.hits.size
  }

  private sweep(t: number) {
    for (const [k, hs] of this.hits) if (!hs.some((h) => h > t - this.windowMs)) this.hits.delete(k)
  }
}
