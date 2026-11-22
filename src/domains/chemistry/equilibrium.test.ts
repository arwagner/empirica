import { CO2_SOLUBILITY, pH, precipitate, releaseCO2, titratableAcidity, waterLitres, type Contents } from './equilibrium'

const L = 1000 / 18.015 // mol water per litre
const sol = (ions: Contents, litres = 1): Contents => {
  const c: Contents = { H2O: L * litres }
  for (const [k, v] of Object.entries(ions)) c[k] = v * litres
  return c
}

describe('pH from charge balance', () => {
  test.each([
    ['pure water', {}, 7.0],
    ['0.1 M HCl', { 'Cl-': 0.1 }, 1.0],
    ['0.1 M NaOH', { 'Na+': 0.1 }, 13.0],
    ['0.1 M acetic acid', { ac: 0.1 }, 2.87],
    ['acetate buffer 0.1/0.1', { ac: 0.2, 'Na+': 0.1 }, 4.74],
    ['0.1 M ammonia', { nh3: 0.1 }, 11.13],
    ['0.1 M ammonium chloride', { nh3: 0.1, 'Cl-': 0.1 }, 5.13],
    ['0.1 M sodium carbonate', { co3: 0.1, 'Na+': 0.2 }, 11.66],
    ['0.1 M sodium bicarbonate', { co3: 0.1, 'Na+': 0.1 }, 8.34],
    ['1e-8 M HCl stays just acidic', { 'Cl-': 1e-8 }, 6.98],
  ])('%s', (_, ions, expected) => {
    expect(pH(sol(ions))!).toBeCloseTo(expected, 1)
  })

  test('no water, no pH', () => expect(pH({ NaCl: 1 })).toBeNull())

  test('equal moles strong acid and base neutralize to 7', () => {
    expect(pH(sol({ 'Na+': 0.05, 'Cl-': 0.05 }))!).toBeCloseTo(7, 5)
  })
})

describe('titratable acidity', () => {
  test('0.1 mol HCl needs 0.1 mol base', () => expect(titratableAcidity(sol({ 'Cl-': 0.1 }))).toBeCloseTo(0.1, 4))
  test('0.05 mol NaOH needs 0.05 mol acid', () => expect(titratableAcidity(sol({ 'Na+': 0.05 }))).toBeCloseTo(-0.05, 4))
})

describe('precipitation', () => {
  test('AgNO3 + NaCl precipitates nearly all silver chloride', () => {
    const c = sol({ 'Ag+': 0.01, 'NO3-': 0.01, 'Na+': 0.01, 'Cl-': 0.01 })
    precipitate(c)
    expect(c.AgCl).toBeCloseTo(0.01, 4)
    expect(c['Ag+']).toBeCloseTo(Math.sqrt(1.8e-10), 6)
  })

  test('copper sulfate + sodium hydroxide gives copper hydroxide and a near-neutral solution', () => {
    const c = sol({ 'Cu2+': 0.05, 'SO42-': 0.05, 'Na+': 0.1 })
    precipitate(c)
    expect(c['Cu(OH)2']).toBeCloseTo(0.05, 3)
    expect(pH(c)!).toBeGreaterThan(5)
    expect(pH(c)!).toBeLessThan(9)
  })

  test('limewater turns milky with CO2, and excess CO2 partly redissolves it', () => {
    const lime = sol({ 'Ca2+': 0.02 }, 0.05) // 1 mmol Ca2+
    const a: Contents = { ...lime, co3: 0.001 }
    precipitate(a)
    expect(a.CaCO3!).toBeGreaterThan(0.00098)
    // Excess CO2 forms soluble Ca(HCO3)2. Hand calc at CO2 saturation: ~0.32 mmol redissolves.
    const b: Contents = { ...lime, co3: 0.003 }
    precipitate(b)
    expect(b.CaCO3!).toBeCloseTo(0.00068, 4)
  })

  test('marble dissolves in acid', () => {
    const c: Contents = { ...sol({ 'Cl-': 1 }, 0.05), CaCO3: 0.01 }
    precipitate(c)
    expect(c.CaCO3 ?? 0).toBe(0)
    expect(releaseCO2(c)).toBeGreaterThan(0.008)
    expect((c.co3 ?? 0) / waterLitres(c)).toBeLessThanOrEqual(CO2_SOLUBILITY + 1e-6)
  })
})
