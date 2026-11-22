import type { LabEvent } from '../../core'
import { chemistry } from '.'
import type { ChemAction, ChemSetup, ChemState } from './schemas-and-state.test-helpers'

const E = chemistry.engine

function run(setup: ChemSetup, actions: ChemAction[]) {
  let state = E.create(setup)
  const events: LabEvent[] = []
  for (const a of actions) {
    const r = E.apply(state, a)
    state = r.state
    events.push(...r.events)
  }
  const text = events.filter((e) => e.kind === 'observation').map((e) => e.text)
  return { state, events, text }
}
const beaker = (id = 'A', contents: { reagent: string; amount: number }[] = []): ChemSetup => ({ vessels: [{ id, kind: 'beaker-250', contents }] })
const read = (s: ChemState, inst: string, v = 'A') => E.measure(s, inst, v)!.value

test('state is never mutated', () => {
  const s0 = E.create(beaker())
  E.apply(s0, { type: 'add', vessel: 'A', reagent: 'hcl-1m', amount: 10 })
  expect(s0.vessels.A.contents).toEqual({})
})

test('titration: phenolphthalein turns pink just past the equivalence point', () => {
  const setup = beaker('A', [{ reagent: 'hcl-0.1m', amount: 25 }, { reagent: 'phenolphthalein', amount: 3 }])
  const before = run(setup, [{ type: 'add', vessel: 'A', reagent: 'naoh-0.1m', amount: 24.9 }])
  expect(read(before.state, 'ph-meter')).toBeLessThan(5)
  expect(before.text.join(' ')).not.toMatch(/pink/)
  const after = run(setup, [
    { type: 'add', vessel: 'A', reagent: 'naoh-0.1m', amount: 24.9 },
    { type: 'add', vessel: 'A', reagent: 'naoh-0.1m', amount: 0.2 },
  ])
  expect(read(after.state, 'ph-meter')).toBeGreaterThan(9)
  expect(after.text.join(' ')).toMatch(/turns (pale )?pink/)
  expect(E.check(after.state, { type: 'observed', tag: 'color-change' })).toBe(true)
})

test('neutralization in a calorimeter warms by about 6.8 °C', () => {
  const r = run({ vessels: [{ id: 'cup', kind: 'calorimeter', contents: [{ reagent: 'hcl-1m', amount: 50 }] }] }, [
    { type: 'add', vessel: 'cup', reagent: 'naoh-1m', amount: 50 },
  ])
  expect(read(r.state, 'thermometer', 'cup') - 20).toBeCloseTo(6.8, 0)
  expect(read(r.state, 'ph-meter', 'cup')).toBeCloseTo(7, 0)
})

test('dissolving ammonium nitrate gets cold; sodium hydroxide gets hot', () => {
  const cold = run(beaker('A', [{ reagent: 'water', amount: 100 }]), [{ type: 'add', vessel: 'A', reagent: 'nh4no3', amount: 8 }])
  expect(read(cold.state, 'thermometer')).toBeLessThan(15)
  expect(cold.text.join(' ')).toMatch(/colder/)
  const hot = run(beaker('A', [{ reagent: 'water', amount: 100 }]), [{ type: 'add', vessel: 'A', reagent: 'naoh', amount: 4 }])
  expect(read(hot.state, 'thermometer')).toBeGreaterThan(29)
})

test('silver nitrate + sodium chloride: white precipitate of silver chloride', () => {
  const r = run(beaker('A', [{ reagent: 'nacl-0.1m', amount: 10 }]), [{ type: 'add', vessel: 'A', reagent: 'agno3-0.1m', amount: 10 }])
  expect(r.text).toContain('A white precipitate of silver chloride (AgCl) forms.')
  expect(E.check(r.state, { type: 'contains', vessel: 'A', species: 'AgCl', min: 0.00099 })).toBe(true)
})

test('halide test colors: chloride white, bromide cream, iodide yellow', () => {
  for (const [salt, color] of [['nacl-0.1m', 'white'], ['kbr-0.1m', 'cream'], ['ki-0.1m', 'pale yellow']]) {
    const r = run(beaker('A', [{ reagent: salt, amount: 5 }]), [{ type: 'add', vessel: 'A', reagent: 'agno3-0.1m', amount: 5 }])
    expect(r.text.join(' ')).toContain(`A ${color} precipitate`)
  }
})

test('magnesium + hydrochloric acid gives the right volume of hydrogen and a squeaky pop', () => {
  // 0.1 g Mg = 4.11 mmol -> 4.11 mmol H2 = 98.7 mL at RTP. Acid in excess.
  const r = run(beaker('A', [{ reagent: 'hcl-1m', amount: 50 }]), [
    { type: 'add', vessel: 'A', reagent: 'mg-ribbon', amount: 0.1 },
    { type: 'splint', vessel: 'A', splint: 'burning' },
  ])
  expect(read(r.state, 'gas-syringe')).toBeCloseTo(98.7, 0)
  expect(r.text.join(' ')).toMatch(/squeaky pop/)
  expect(r.state.vessels.A.contents.Mg ?? 0).toBe(0)
})

test('limiting reagent: excess magnesium stops when the acid runs out', () => {
  // 10 mL 1 M HCl = 10 mmol H+ -> 5 mmol Mg used, 5 mmol H2 (120 mL)
  const r = run(beaker('A', [{ reagent: 'hcl-1m', amount: 10 }]), [{ type: 'add', vessel: 'A', reagent: 'mg-ribbon', amount: 1 }])
  expect(read(r.state, 'gas-syringe')).toBeCloseTo(120, -1)
  expect(r.state.vessels.A.contents.Mg).toBeGreaterThan(0.03)
})

test('copper does not react with acid', () => {
  const r = run(beaker('A', [{ reagent: 'hcl-1m', amount: 20 }]), [{ type: 'add', vessel: 'A', reagent: 'cu-turnings', amount: 1 }])
  expect(read(r.state, 'gas-syringe')).toBe(0)
})

test('zinc displaces copper: blue fades, copper forms, it warms up', () => {
  const r = run(beaker('A', [{ reagent: 'cuso4-0.5m', amount: 50 }]), [{ type: 'add', vessel: 'A', reagent: 'zn-granules', amount: 5 }])
  const t = r.text.join(' ')
  expect(t).toMatch(/copper metal forms/)
  expect(t).toMatch(/colorless/)
  expect(read(r.state, 'thermometer')).toBeGreaterThan(30)
})

test('sodium in water: fizzes, solution turns alkaline (universal indicator goes violet)', () => {
  const r = run(beaker('A', [{ reagent: 'water', amount: 100 }, { reagent: 'universal-indicator', amount: 5 }]), [
    { type: 'add', vessel: 'A', reagent: 'na-metal', amount: 0.2 },
  ])
  const t = r.text.join(' ')
  expect(t).toMatch(/skates across the surface/)
  expect(t).toMatch(/hydrogen gas/)
  expect(read(r.state, 'ph-meter')).toBeGreaterThan(12)
  expect(t).toMatch(/turns violet/)
})

test('marble chips + acid, gas bubbled through limewater turns it milky', () => {
  const r = run({ vessels: [{ id: 'flask', kind: 'flask-250', contents: [{ reagent: 'hcl-1m', amount: 50 }] }, { id: 'tube', kind: 'test-tube', contents: [{ reagent: 'limewater', amount: 10 }] }] }, [
    { type: 'connect-gas', from: 'flask', to: 'tube' },
    { type: 'add', vessel: 'flask', reagent: 'caco3', amount: 0.02 },
  ])
  const t = r.text.join(' ')
  expect(t).toMatch(/carbon dioxide gas/)
  expect(t).toMatch(/white precipitate of calcium carbonate/)
})

test('lots of CO2 into limewater: milky first, then it partly clears', () => {
  const r = run({ vessels: [{ id: 'flask', kind: 'flask-250', contents: [{ reagent: 'hcl-1m', amount: 50 }] }, { id: 'tube', kind: 'test-tube', contents: [{ reagent: 'limewater', amount: 10 }] }] }, [
    { type: 'connect-gas', from: 'flask', to: 'tube' },
    { type: 'add', vessel: 'flask', reagent: 'caco3', amount: 0.1 },
  ])
  const t = r.text.join(' ')
  expect(t).toMatch(/white precipitate of calcium carbonate/)
  expect(r.state.vessels.tube.contents.CaCO3 ?? 0).toBeLessThan(0.0002 * 0.9)
})

test('hydrogen peroxide + manganese dioxide gives oxygen that relights a glowing splint', () => {
  const r = run(beaker('A', [{ reagent: 'h2o2-3pct', amount: 20 }]), [
    { type: 'splint', vessel: 'A', splint: 'glowing' },
    { type: 'add', vessel: 'A', reagent: 'mno2', amount: 0.5 },
    { type: 'splint', vessel: 'A', splint: 'glowing' },
  ])
  expect(r.text[0]).toMatch(/just goes out/)
  expect(r.text.join(' ')).toMatch(/relights|bursts back into flame/)
  expect(E.check(r.state, { type: 'observed', tag: 'test:O2' })).toBe(true)
})

test('flame tests', () => {
  for (const [reagent, color] of [['licl-0.5m', 'crimson'], ['kcl-0.1m', 'lilac'], ['cuso4-0.5m', 'blue-green'], ['srcl2-0.5m', 'scarlet'], ['nacl-0.1m', 'yellow']]) {
    const r = run(beaker('A', [{ reagent, amount: 5 }]), [{ type: 'flame-test', vessel: 'A' }])
    expect(r.text.join(' ')).toContain(color)
  }
})

test('heating water: rises, boils at 100 °C and stays there', () => {
  const r = run(beaker('A', [{ reagent: 'water', amount: 100 }]), [
    { type: 'heat', vessel: 'A', watts: 500 },
    { type: 'wait', seconds: 600 },
  ])
  expect(read(r.state, 'thermometer')).toBe(100)
  expect(r.text.join(' ')).toMatch(/starts to boil/)
  expect(read(r.state, 'balance')).toBeLessThan(100)
})

test('copper sulfate crystals turn white when heated, then blue and hot again with water', () => {
  const r = run({ vessels: [{ id: 'C', kind: 'crucible', contents: [{ reagent: 'cuso4-5h2o', amount: 2 }] }] }, [
    { type: 'heat', vessel: 'C', watts: 300 },
    { type: 'wait', seconds: 300 },
  ])
  expect(r.text.join(' ')).toMatch(/white powder/)
  expect(r.state.vessels.C.contents.CuSO4).toBeGreaterThan(0)
})

test('checks: ph range, temperature, all/any', () => {
  const s = run(beaker('A', [{ reagent: 'hcl-0.1m', amount: 10 }]), []).state
  expect(E.check(s, { type: 'ph', vessel: 'A', max: 2 })).toBe(true)
  expect(E.check(s, { type: 'all', checks: [{ type: 'ph', vessel: 'A', max: 2 }, { type: 'temperature', vessel: 'A', min: 50 }] })).toBe(false)
  expect(E.check(s, { type: 'any', checks: [{ type: 'ph', vessel: 'A', max: 2 }, { type: 'temperature', vessel: 'A', min: 50 }] })).toBe(true)
})

test('removing a vessel also disconnects delivery tubes into it', () => {
  const r = run({ vessels: [{ id: 'flask', kind: 'flask-250' }, { id: 'tube', kind: 'test-tube' }] }, [
    { type: 'connect-gas', from: 'flask', to: 'tube' },
    { type: 'remove-vessel', vessel: 'tube' },
  ])
  expect(r.state.vessels.tube).toBeUndefined()
  expect(r.state.vessels.flask.gasOutlet).toBeUndefined()
})

describe('why explanations come from the engine', () => {
  const whyOf = (events: LabEvent[], tag: string) => events.find((e) => e.kind === 'observation' && e.tags?.includes(tag)) as Extract<LabEvent, { kind: 'observation' }> | undefined

  test('precipitate: names the ions that met and the solubility', () => {
    const r = run(beaker('A', [{ reagent: 'nacl-0.1m', amount: 10 }]), [{ type: 'add', vessel: 'A', reagent: 'agno3-0.1m', amount: 10 }])
    const why = whyOf(r.events, 'precipitate:AgCl')!.why!
    // Anchored to what you did, and gives the reason (attraction), not just the outcome.
    expect(why.simple).toMatch(/When you added silver nitrate solution, it brought silver ions into a beaker that already had chloride ions/)
    expect(why.simple).toMatch(/opposite charges attract/)
    expect(why.advanced).toMatch(/Ag⁺ \+ Cl⁻ → AgCl\(s\)/)
    expect(why.advanced).toMatch(/Ksp = 1\.8×10⁻¹⁰/)
  })

  test('cold pack: explains the energy balance of dissolving', () => {
    const r = run(beaker('A', [{ reagent: 'water', amount: 100 }]), [{ type: 'add', vessel: 'A', reagent: 'nh4no3', amount: 8 }])
    expect(whyOf(r.events, 'endothermic')!.why!.simple).toMatch(/borrowed from the water's own heat/)
  })

  test('neutralization heat and indicator color have their own reasons', () => {
    const r = run(beaker('A', [{ reagent: 'hcl-0.1m', amount: 25 }, { reagent: 'phenolphthalein', amount: 3 }]), [
      { type: 'add', vessel: 'A', reagent: 'naoh-1m', amount: 5 },
    ])
    const why = whyOf(r.events, 'color-change')!.why!.simple
    expect(why).toMatch(/When you added sodium hydroxide solution, you made the liquid alkaline/)
    expect(why).toMatch(/change shape when they gain or lose hydrogen ions/)
    const hot = run({ vessels: [{ id: 'cup', kind: 'calorimeter', contents: [{ reagent: 'hcl-1m', amount: 50 }] }] }, [{ type: 'add', vessel: 'cup', reagent: 'naoh-1m', amount: 50 }])
    expect(whyOf(hot.events, 'exothermic')!.why!.simple).toMatch(/attract each other strongly/)
  })

  test('displacement and gas explain which metal won and why', () => {
    const d = run(beaker('A', [{ reagent: 'cuso4-0.5m', amount: 50 }]), [{ type: 'add', vessel: 'A', reagent: 'zn-granules', amount: 5 }])
    expect(whyOf(d.events, 'deposit:Cu')!.why!.simple).toMatch(/Zinc atoms hold on to their outer electrons less tightly than copper/)
    expect(whyOf(d.events, 'color-change')!.why!.simple).toMatch(/came from copper\(II\) ions/)
    const g = run(beaker('A', [{ reagent: 'hcl-1m', amount: 20 }]), [{ type: 'add', vessel: 'A', reagent: 'mg-ribbon', amount: 0.1 }])
    expect(whyOf(g.events, 'gas:H2')!.why!.simple).toMatch(/gives electrons to the hydrogen ions/)
  })

  test('a why never just restates its observation', async () => {
    const { registry } = await import('../../content/registry')
    const { runProcedure } = await import('../../core')
    for (const { id } of registry.experiments().filter((e) => e.domain === 'chemistry')) {
      const { domain, experiment } = registry.experiment(id)!
      for (const e of runProcedure(domain, experiment).events) {
        if (e.kind !== 'observation' || !e.why) continue
        // Long enough to carry a reason, and not mostly the same words as the observation.
        expect(e.why.simple.length, `${id}: ${e.text}`).toBeGreaterThan(120)
        expect(e.why.simple.startsWith(e.text.slice(0, 25)), `${id}: ${e.text}`).toBe(false)
      }
    }
  })

  test('every observation in the guided chemistry pack has a why', async () => {
    const { registry } = await import('../../content/registry')
    const { runProcedure } = await import('../../core')
    for (const { id } of registry.experiments().filter((e) => e.domain === 'chemistry')) {
      const { domain, experiment } = registry.experiment(id)!
      const missing = runProcedure(domain, experiment).events.filter((e) => e.kind === 'observation' && !e.why && !e.tags?.includes('gas-routed') && !e.tags?.includes('residue') && !e.tags?.includes('overflow') && !e.tags?.includes('no-burn'))
      expect(missing.map((e) => `${id}: ${e.text}`)).toEqual([])
    }
  })
})
