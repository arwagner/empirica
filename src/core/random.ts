/**
 * Seeded randomness that keeps engines deterministic: every draw returns the next seed, which the
 * caller stores in state. Same seed → same results; a fresh run just uses a different seed.
 */

/** One mulberry32 step: a uniform number in [0, 1) and the next seed. */
export function rand(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) >>> 0
  const next = t
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next]
}

/** A random stream for code that draws many numbers; read `.seed` afterwards to store it. */
export class Rng {
  seed: number
  constructor(seed: number) {
    this.seed = seed >>> 0 || 1
  }
  next(): number {
    const [v, s] = rand(this.seed)
    this.seed = s
    return v
  }
  /** Standard normal (Box–Muller). */
  normal(mean = 0, sd = 1): number {
    const u = Math.max(1e-12, this.next())
    const v = this.next()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  /** Pick an index with the given (unnormalised) weights. */
  pick(weights: number[]): number {
    const total = weights.reduce((a, b) => a + b, 0)
    let r = this.next() * total
    for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return i
    return weights.length - 1
  }
  /** Number of successes in n trials of probability p (exact for small n, normal approx for large). */
  binomial(n: number, p: number): number {
    if (n <= 200) {
      let k = 0
      for (let i = 0; i < n; i++) if (this.next() < p) k++
      return k
    }
    return Math.max(0, Math.min(n, Math.round(this.normal(n * p, Math.sqrt(n * p * (1 - p))))))
  }
  /** Poisson with mean λ (Knuth for small λ, normal approx for large). */
  poisson(lambda: number): number {
    if (lambda > 50) return Math.max(0, Math.round(this.normal(lambda, Math.sqrt(lambda))))
    const L = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= this.next()
    } while (p > L)
    return k - 1
  }
}

/** A fresh seed from an existing one (e.g. "run again" with new results). */
export const reseed = (seed: number) => (Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0) || 1
