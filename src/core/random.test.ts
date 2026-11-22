import { rand, reseed, Rng } from './random'

test('same seed, same numbers; different seed, different numbers', () => {
  const a = new Rng(42)
  const b = new Rng(42)
  const xs = [a.next(), a.next(), a.next()]
  expect([b.next(), b.next(), b.next()]).toEqual(xs)
  expect(new Rng(43).next()).not.toBe(xs[0])
  expect(rand(7)[1]).not.toBe(7)
  expect(reseed(42)).not.toBe(42)
})

test('distributions have the right averages', () => {
  const r = new Rng(1)
  let u = 0
  for (let i = 0; i < 20000; i++) u += r.next()
  expect(u / 20000).toBeCloseTo(0.5, 1)
  let k = 0
  for (let i = 0; i < 2000; i++) k += r.binomial(40, 0.25)
  expect(k / 2000).toBeCloseTo(10, 0)
  let big = 0
  for (let i = 0; i < 500; i++) big += r.binomial(1000, 0.75)
  expect(big / 500).toBeCloseTo(750, -1)
  let pois = 0
  for (let i = 0; i < 3000; i++) pois += r.poisson(3)
  expect(pois / 3000).toBeCloseTo(3, 0)
  const counts = [0, 0, 0]
  for (let i = 0; i < 9000; i++) counts[r.pick([1, 2, 6])]++
  expect(counts[2] / 9000).toBeCloseTo(6 / 9, 1)
})
