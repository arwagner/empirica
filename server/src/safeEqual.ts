import { timingSafeEqual } from 'node:crypto'

/** Compares a signature we computed with one the browser sent back, in constant time. */
export function safeEqual(want: string, got: string): boolean {
  const a = Buffer.from(want)
  const b = Buffer.from(got)
  return a.length === b.length && timingSafeEqual(a, b)
}
