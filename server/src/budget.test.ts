// @vitest-environment node
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { costUsd, Daily, fileStore } from './budget'
import { RateLimiter } from './rateLimit'

test('cost counts cached tokens at their own prices', () => {
  expect(costUsd('claude-sonnet-5-5', { input_tokens: 1e6, output_tokens: 1e6 })).toBe(12)
  expect(costUsd('claude-sonnet-5-5', { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 1e6 })).toBeCloseTo(2.6)
  expect(costUsd('claude-haiku-5-5', { input_tokens: 1e6, output_tokens: 0 })).toBe(0.1)
})

test('the day budget and issue count survive a restart through the state file, and reset at midnight UTC', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'empirica-')), 'state.json')
  let now = new Date('2026-11-26T23:59:00Z')
  const a = new Daily(fileStore(path), 0.3, 5, () => now)
  a.spend(0.25)
  a.issueFiled()
  const b = new Daily(fileStore(path), 0.3, 5, () => now)
  expect(b.snapshot()).toEqual({ day: '2026-11-26', spentUsd: 0.25, issuesFiled: 1 })
  expect(b.canSpend(0.05)).toBe(true)
  expect(b.canSpend(0.06)).toBe(false)
  now = new Date('2026-11-27T00:00:01Z')
  expect(b.snapshot()).toEqual({ day: '2026-11-27', spentUsd: 0, issuesFiled: 0 })
})

test('a corrupt state file starts the day fresh instead of crashing', () => {
  const path = join(mkdtempSync(join(tmpdir(), 'empirica-')), 'state.json')
  writeFileSync(path, '{nope')
  expect(new Daily(fileStore(path), 0.3, 5).snapshot().spentUsd).toBe(0)
})

test('the rate limiter keys clients by a salted hash, never the IP, and forgets them when their window empties', () => {
  let t = 0
  const rl = new RateLimiter(2, 1000, () => t)
  expect(rl.key('203.0.113.7')).not.toContain('203')
  expect([rl.take('a'), rl.take('a'), rl.take('a')]).toEqual([true, true, false])
  t = 1001
  rl.take('b')
  expect(rl.size).toBe(1)
})
