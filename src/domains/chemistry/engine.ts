import type { Engine, LabEvent, Measurement } from '../../core'
import { flameColor, solutionColor, visibleSolid } from './appearance'
import {
  addIons, asDissolved, hasWater, pH, precipitate, releaseCO2, solveUpTo, titratableAcidity, waterLitres, type Contents,
} from './equilibrium'
import { DROP_ML, INDICATOR_MOL_PER_DROP, reagent } from './reagents'
import type { ChemAction, ChemCheck, ChemSetup, VesselKind } from './schemas'
import { SPECIES, species } from './species'
import {
  WHY_ALKALI, WHY_BOILING, WHY_MG_BURNS, WHY_DECOMPOSE, WHY_DRY, whyColor, whyDeposit, whyDissolved, whyFlame, whyGas, whyHeat, whyPrecipitate, whySplint, type Cause,
} from './why'
import type { Explanation } from '../../core'

export interface Vessel {
  id: string
  kind: VesselKind
  contents: Contents
  tempC: number
  heaterW: number
  /** Gas from this vessel bubbles into that vessel (delivery tube). */
  gasOutlet?: string
  /** Gas lingering in the mouth of the vessel (for splint tests); fades over time. */
  headspace: Record<string, number>
  /** All gas ever given off (what a gas syringe would have collected), mol. */
  evolved: Record<string, number>
  boiling?: boolean
}

export interface ChemState {
  time: number
  roomTempC: number
  vessels: Record<string, Vessel>
  /** Every observation tag seen this session, for guided-step checks. */
  tags: string[]
}

export const VESSEL_KINDS: Record<VesselKind, { name: string; capacityMl: number; heatCapacity: number; lossWPerK: number }> = {
  'beaker-250': { name: '250 mL beaker', capacityMl: 250, heatCapacity: 40, lossWPerK: 0.6 },
  'beaker-100': { name: '100 mL beaker', capacityMl: 100, heatCapacity: 25, lossWPerK: 0.4 },
  'flask-250': { name: '250 mL conical flask', capacityMl: 250, heatCapacity: 50, lossWPerK: 0.5 },
  'test-tube': { name: 'test tube', capacityMl: 20, heatCapacity: 8, lossWPerK: 0.15 },
  'boiling-tube': { name: 'boiling tube', capacityMl: 40, heatCapacity: 14, lossWPerK: 0.2 },
  calorimeter: { name: 'polystyrene cup calorimeter', capacityMl: 200, heatCapacity: 2, lossWPerK: 0.03 },
  crucible: { name: 'crucible', capacityMl: 30, heatCapacity: 30, lossWPerK: 0.3 },
}

const MOLAR_GAS_ML = 24000 // mL per mol at room temperature and pressure
const NEUTRALIZATION_KJ = -57.1
const FARADAY = 96485
const TRACE = 1e-6
const GAS_NAMES: Record<string, string> = { H2: 'hydrogen', O2: 'oxygen', CO2: 'carbon dioxide' }

const round = (v: number, dp: number) => Math.round(v * 10 ** dp) / 10 ** dp
const bump = (rec: Record<string, number>, id: string, n: number) => {
  const v = (rec[id] ?? 0) + n
  if (v <= 1e-12) delete rec[id]
  else rec[id] = v
}
const fmt = (n: number) => (Math.abs(n) >= 10 ? n.toFixed(0) : n.toPrecision(2))

export function heatCapacity(v: Vessel) {
  let c = VESSEL_KINDS[v.kind].heatCapacity
  for (const [id, n] of Object.entries(v.contents)) {
    const s = SPECIES[id]
    if (!s) continue
    c += n * s.molarMass * (id === 'H2O' ? 4.18 : 0.8)
  }
  return c
}

export const volumeMl = (v: Vessel) => waterLitres(v.contents) * 1000

export function massG(c: Contents) {
  let m = 0
  for (const [id, n] of Object.entries(c)) m += n * (SPECIES[id]?.molarMass ?? 0)
  return m
}

// ---------- observation helpers ----------

interface Snapshot {
  solids: Record<string, number>
  color: string
  tempC: number
}

const snapshot = (v: Vessel): Snapshot => ({
  solids: Object.fromEntries(Object.entries(v.contents).filter(([id]) => SPECIES[id]?.phase === 's')),
  color: solutionColor(v.contents).name,
  tempC: v.tempC,
})

const obs = (text: string, ...tags: string[]): LabEvent => ({ kind: 'observation', text, tags })
const because = (e: LabEvent, why: Explanation): LabEvent => ({ ...e, why } as LabEvent)

function diff(v: Vessel, before: Snapshot, gases: Record<string, number>, causes: Cause[] = []): LabEvent[] {
  const out: LabEvent[] = []
  const after = snapshot(v)
  for (const [id, n] of Object.entries(after.solids)) {
    const was = before.solids[id] ?? 0
    if (!visibleSolid(n, v.contents) || (visibleSolid(was, v.contents) && n - was < n * 0.2)) continue
    const s = species(id)
    if (s.metal) out.push(because(obs(`${s.color!.name[0].toUpperCase()}${s.color!.name.slice(1)} ${s.name} metal forms in the ${v.id}.`, 'deposit', `deposit:${id}`), whyDeposit(s, causes)))
    else out.push(because(obs(`A ${s.color?.name ?? ''} precipitate of ${s.name} (${s.formula}) forms.`.replace('  ', ' '), 'precipitate', `precipitate:${id}`), whyPrecipitate(s)))
  }
  for (const [id, n] of Object.entries(before.solids)) {
    if (!visibleSolid(n, v.contents) || visibleSolid(after.solids[id] ?? 0, v.contents)) continue
    const s = species(id)
    out.push(because(obs(s.metal ? `The ${s.name} is used up.` : `The ${s.name} dissolves.`, s.metal ? 'consumed' : 'dissolved', `dissolved:${id}`), whyDissolved(s)))
  }
  for (const [gas, n] of Object.entries(gases)) {
    if (n <= TRACE) continue
    const vigor = n > 0.002 ? 'Vigorous fizzing:' : 'Bubbles:'
    out.push(because(obs(`${vigor} ${GAS_NAMES[gas]} gas is given off (${fmt(n * MOLAR_GAS_ML)} mL).`, 'gas', `gas:${gas}`), whyGas(gas, causes)))
  }
  const dT = after.tempC - before.tempC
  if (Math.abs(dT) >= 1)
    out.push(because(dT > 0
      ? obs(`The ${v.id} gets warmer (+${dT.toFixed(1)} °C).`, 'exothermic')
      : obs(`The ${v.id} gets colder (${dT.toFixed(1)} °C).`, 'endothermic'), whyHeat(dT, causes)))
  if (after.color !== before.color && hasWater(v.contents))
    out.push(because(obs(after.color === 'colorless' ? 'The solution becomes colorless.' : `The solution turns ${after.color}.`, 'color-change', `color:${after.color}`), whyColor(solutionColor(v.contents), before.color)))
  return out
}

// ---------- chemistry ----------

const ALKALI_NOTES: Record<string, string> = {
  Li: 'The lithium floats and fizzes steadily.',
  Na: 'The sodium melts into a silvery ball and skates across the surface, fizzing.',
  K: 'The potassium bursts into a lilac flame and whizzes around violently.',
  Ca: 'The calcium sinks and fizzes steadily; the water turns cloudy.',
}

/**
 * Bring a vessel to equilibrium: dissolve, react, precipitate, release gas, account for heat.
 * Mutates the vessel. Returns gases released and notable notes.
 */
function settle(v: Vessel, extraHeatKJ = 0): { gases: Record<string, number>; notes: LabEvent[]; causes: Cause[] } {
  const c = v.contents
  const gases: Record<string, number> = {}
  const notes: LabEvent[] = []
  let heatKJ = extraHeatKJ
  const causes: Cause[] = extraHeatKJ ? [{ kind: 'neutralize', kJ: extraHeatKJ }] : []

  if (hasWater(c)) {
    // 1. soluble compounds dissolve into ions
    for (const [id, n] of Object.entries(c)) {
      const s = SPECIES[id]
      if (!s?.ions || s.ksp !== undefined) continue
      delete c[id]
      addIons(c, s, n)
      if (s.phase === 's') {
        heatKJ += (s.dissolveKJ ?? 0) * n
        causes.push({ kind: 'dissolve', species: id, kJ: (s.dissolveKJ ?? 0) * n })
      }
    }
    // 2. catalytic decomposition of hydrogen peroxide
    if (c.H2O2 && c.MnO2) {
      const n = c.H2O2
      delete c.H2O2
      bump(c, 'H2O', n)
      bump(gases, 'O2', n / 2)
      heatKJ += -98.2 * n
      causes.push({ kind: 'catalysis', kJ: -98.2 * n })
    }
    // 3a. very reactive metals with water
    for (const [id, n] of Object.entries(c)) {
      const m = SPECIES[id]?.metal
      if (!m?.reactsWithWater) continue
      delete c[id]
      bump(c, m.ion, n)
      bump(c, 'H2O', -n * m.n)
      bump(gases, 'H2', (n * m.n) / 2)
      heatKJ += m.reactionKJ * n
      causes.push({ kind: 'alkali', metal: id, kJ: m.reactionKJ * n })
      notes.push(because(obs(ALKALI_NOTES[id], 'violent', `reacts-with-water:${id}`), WHY_ALKALI(id)))
    }
    // 3b. displacement: a metal pushes a less reactive metal out of solution
    for (const [id] of Object.entries(c)) {
      const m = SPECIES[id]?.metal
      if (!m) continue
      const targets = Object.values(SPECIES)
        .filter((t) => t.metal && t.metal.e0 > m.e0 && (c[t.metal.ion] ?? 0) > 0)
        .sort((a, b) => b.metal!.e0 - a.metal!.e0)
      for (const t of targets) {
        const metalLeft = c[id] ?? 0
        if (metalLeft <= 0) break
        const tm = t.metal!
        const x = Math.min(metalLeft, ((c[tm.ion] ?? 0) * tm.n) / m.n) // mol of metal reacting
        bump(c, id, -x)
        bump(c, m.ion, x)
        bump(c, tm.ion, (-x * m.n) / tm.n)
        bump(c, t.id, (x * m.n) / tm.n)
        heatKJ += (-m.n * FARADAY * (tm.e0 - m.e0) * x) / 1000
        if (x > 0) causes.push({ kind: 'displace', metal: id, target: t.id, kJ: (-m.n * FARADAY * (tm.e0 - m.e0) * x) / 1000 })
      }
    }
    // 3c. metals above hydrogen dissolve in acid, giving hydrogen
    for (const [id, n] of Object.entries(c)) {
      const m = SPECIES[id]?.metal
      if (!m || m.reactsWithWater || m.e0 > -0.2 || (pH(c) ?? 7) > 5) continue
      const x = solveUpTo(n, 5, (x) => pH({ ...c, [id]: n - x, [m.ion]: (c[m.ion] ?? 0) + x })!)
      bump(c, id, -x)
      bump(c, m.ion, x)
      bump(gases, 'H2', (x * m.n) / 2)
      heatKJ += m.reactionKJ * x
      if (x > 0) causes.push({ kind: 'acid-metal', metal: id, kJ: m.reactionKJ * x })
    }
    // 4. precipitation equilibria, 5. carbon dioxide leaves
    precipitate(c)
    const co2 = releaseCO2(c)
    bump(gases, 'CO2', co2)
    if (co2 > 0) causes.push({ kind: 'carbonate' })
  }

  v.tempC += (-heatKJ * 1000) / heatCapacity(v)
  for (const [g, n] of Object.entries(gases)) {
    bump(v.evolved, g, n)
    bump(v.headspace, g, n)
  }
  return { gases, notes, causes }
}

function heatOfNeutralization(existing: Contents, added: Contents): number {
  if (!hasWater(existing)) return 0
  const probe = asDissolved(hasWater(added) ? added : { ...added, H2O: 55.5 })
  const a = titratableAcidity(asDissolved(existing))
  const b = titratableAcidity(probe)
  return a * b < 0 ? NEUTRALIZATION_KJ * Math.min(Math.abs(a), Math.abs(b)) : 0
}

/** Combine `added` into vessel, settle, and narrate what changed. */
function combine(state: ChemState, v: Vessel, added: Contents, addedTempC: number): LabEvent[] {
  const priorColor = solutionColor(v.contents).name
  const neutralKJ = heatOfNeutralization(v.contents, added)
  const cAdded = heatCapacity({ ...v, kind: 'test-tube', contents: added }) - VESSEL_KINDS['test-tube'].heatCapacity
  const cHere = heatCapacity(v)
  v.tempC = (v.tempC * cHere + addedTempC * cAdded) / (cHere + cAdded || 1)
  for (const [id, n] of Object.entries(added)) bump(v.contents, id, n)
  // Solids are compared after adding (so added solids aren't "new"); color against how it looked before.
  const before = { ...snapshot(v), color: priorColor }
  const { gases, notes, causes } = settle(v, neutralKJ)
  const events = [...notes, ...diff(v, before, gases, causes), ...overflow(v), ...route(state, v, gases)]
  return events
}

function overflow(v: Vessel): LabEvent[] {
  const cap = VESSEL_KINDS[v.kind].capacityMl
  const vol = volumeMl(v)
  if (vol <= cap) return []
  const keep = cap / vol
  for (const [id, n] of Object.entries(v.contents)) if (SPECIES[id]?.phase !== 's' || id === 'H2O') v.contents[id] = n * keep
  return [obs(`The ${v.id} overflows! ${Math.round(vol - cap)} mL spills onto the bench.`, 'overflow')]
}

/** Send gas down a delivery tube, if one is connected. CO2 arrives in portions, as real bubbling does. */
function route(state: ChemState, v: Vessel, gases: Record<string, number>): LabEvent[] {
  const target = v.gasOutlet && state.vessels[v.gasOutlet]
  if (!target || !Object.keys(gases).length) return []
  const events: LabEvent[] = [obs(`Gas bubbles through the delivery tube into the ${target.id}.`, 'gas-routed')]
  const seen = new Set<string>()
  const co2 = gases.CO2 ?? 0
  for (const [g, n] of Object.entries(gases)) if (g !== 'CO2' || !hasWater(target.contents)) bump(target.headspace, g, n)
  if (co2 > 0 && hasWater(target.contents)) {
    const PORTIONS = 12
    for (let i = 0; i < PORTIONS; i++) {
      const before = snapshot(target)
      bump(target.contents, 'co3', co2 / PORTIONS)
      const r = settle(target)
      for (const e of diff(target, before, r.gases, r.causes)) {
        if (e.kind === 'observation' && (e.tags?.includes('exothermic') || e.tags?.includes('endothermic'))) continue
        if (!seen.has(e.text)) events.push(e)
        seen.add(e.text)
      }
    }
  }
  return events
}

function contentsOf(reagentId: string, amount: number): { contents: Contents; text: string } {
  const r = reagent(reagentId)
  const c: Contents = {}
  if (r.kind === 'liquid' || r.kind === 'solution') {
    c.H2O = (amount * 0.997) / 18.015
    // Bottled solutions are already dissolved: add ions directly so no heat of solution is counted.
    const dissolve = (id: string, molarity: number) => {
      const s = species(id)
      const n = (molarity * amount) / 1000
      if (s.ions) addIons(c, s, n)
      else bump(c, id, n)
    }
    if (r.molarity) dissolve(r.species, r.molarity)
    if (r.acidified) dissolve(r.acidified.species, r.acidified.molarity)
    return { contents: c, text: `${amount} mL of ${r.name}` }
  }
  if (r.kind === 'indicator') {
    c.H2O = (amount * DROP_ML) / 18.015
    c[r.species] = amount * INDICATOR_MOL_PER_DROP
    return { contents: c, text: `${amount} drop${amount === 1 ? '' : 's'} of ${r.name.toLowerCase()}` }
  }
  c[r.species] = amount / species(r.species).molarMass
  return { contents: c, text: `${amount} g of ${r.name.toLowerCase()}` }
}

// ---------- time ----------

const DECOMPOSITIONS: { from: string; minC: number; products: Record<string, number>; gas?: [string, number]; text: string; tag: string }[] = [
  { from: 'CuSO4.5H2O', minC: 110, products: { CuSO4: 1 }, text: 'The blue crystals crumble into a white powder as steam is given off.', tag: 'dehydrated' },
  { from: 'NaHCO3', minC: 80, products: { Na2CO3: 0.5 }, gas: ['CO2', 0.5], text: 'The baking soda decomposes, giving off carbon dioxide and steam.', tag: 'decomposed' },
  { from: 'CuCO3', minC: 290, products: { CuO: 1 }, gas: ['CO2', 1], text: 'The green powder turns black, giving off carbon dioxide.', tag: 'decomposed' },
]

function tick(state: ChemState, v: Vessel, dt: number, events: LabEvent[]) {
  const kind = VESSEL_KINDS[v.kind]
  const net = v.heaterW * 0.5 - kind.lossWPerK * (v.tempC - state.roomTempC)
  const wet = hasWater(v.contents)
  if (wet && v.tempC >= 100 && net > 0) {
    if (!v.boiling) events.push(because(obs(`The liquid in the ${v.id} starts to boil.`, 'boiling'), WHY_BOILING))
    v.boiling = true
    v.tempC = 100
    bump(v.contents, 'H2O', -(net * dt) / 40650)
    if (!hasWater(v.contents)) {
      delete v.contents.H2O
      v.boiling = false
      events.push(because(obs(`All the water in the ${v.id} has boiled away, leaving a solid residue.`, 'evaporated-dry'), WHY_DRY))
    }
    return
  }
  if (v.boiling && (net <= 0 || v.tempC < 100)) v.boiling = false
  v.tempC += (net * dt) / heatCapacity(v)
  if (!wet) {
    for (const d of DECOMPOSITIONS) {
      const n = v.contents[d.from]
      if (!n || v.tempC < d.minC) continue
      delete v.contents[d.from]
      for (const [p, k] of Object.entries(d.products)) bump(v.contents, p, n * k)
      const gases: Record<string, number> = {}
      if (d.gas) bump(gases, d.gas[0], n * d.gas[1])
      for (const [g, m] of Object.entries(gases)) {
        bump(v.evolved, g, m)
        bump(v.headspace, g, m)
      }
      events.push(because(obs(d.text, d.tag, `${d.tag}:${d.from}`), WHY_DECOMPOSE[d.from]), ...route(state, v, gases))
    }
  }
}

// ---------- engine ----------

function makeVessel(id: string, kind: VesselKind, roomTempC: number): Vessel {
  return { id, kind, contents: {}, tempC: roomTempC, heaterW: 0, headspace: {}, evolved: {} }
}

function need(state: ChemState, id: string) {
  const v = state.vessels[id]
  if (!v) throw new Error(`No vessel "${id}" on the bench`)
  return v
}

function step(state: ChemState, a: ChemAction): LabEvent[] {
  const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
  switch (a.type) {
    case 'add-vessel': {
      if (state.vessels[a.id]) throw new Error(`Vessel "${a.id}" already exists`)
      state.vessels[a.id] = makeVessel(a.id, a.vessel, state.roomTempC)
      return [act(`Placed a ${VESSEL_KINDS[a.vessel].name} (${a.id}) on the bench.`)]
    }
    case 'add': {
      const v = need(state, a.vessel)
      const { contents, text } = contentsOf(a.reagent, a.amount)
      return [act(`Added ${text} to the ${v.id}.`), ...combine(state, v, contents, state.roomTempC)]
    }
    case 'pour': {
      const from = need(state, a.from)
      const to = need(state, a.to)
      const vol = volumeMl(from)
      const f = a.amount === undefined || vol <= 0 ? 1 : Math.min(1, a.amount / vol)
      const moved: Contents = {}
      for (const [id, n] of Object.entries(from.contents)) {
        if (SPECIES[id]?.metal) continue // pieces of metal stay behind
        moved[id] = n * f
        bump(from.contents, id, -n * f)
      }
      const amountText = a.amount === undefined ? 'everything' : `${a.amount} mL`
      return [act(`Poured ${amountText} from the ${from.id} into the ${to.id}.`), ...combine(state, to, moved, from.tempC)]
    }
    case 'filter': {
      const from = need(state, a.from)
      const to = need(state, a.to)
      const moved: Contents = {}
      for (const [id, n] of Object.entries(from.contents)) {
        if (SPECIES[id]?.phase === 's') continue
        moved[id] = n
        delete from.contents[id]
      }
      const left = Object.keys(from.contents).map((id) => species(id).name)
      return [
        act(`Filtered the ${from.id} into the ${to.id}.`),
        ...(left.length ? [obs(`The filter paper holds: ${left.join(', ')}.`, 'residue')] : []),
        ...combine(state, to, moved, from.tempC),
      ]
    }
    case 'heat': {
      const v = need(state, a.vessel)
      v.heaterW = a.watts
      return [act(a.watts > 0 ? `Set the heater under the ${v.id} to ${a.watts} W.` : `Turned off the heater under the ${v.id}.`)]
    }
    case 'wait': {
      const events: LabEvent[] = [act(`Waited ${a.seconds} s.`)]
      const dt = 1
      const snaps = Object.fromEntries(Object.values(state.vessels).map((v) => [v.id, snapshot(v)]))
      for (let t = 0; t < a.seconds; t += dt) {
        for (const v of Object.values(state.vessels)) {
          tick(state, v, Math.min(dt, a.seconds - t), events)
          for (const g of Object.keys(v.headspace)) v.headspace[g] *= 0.5 ** (dt / 20)
        }
      }
      state.time += a.seconds
      for (const v of Object.values(state.vessels)) {
        const r = settle(v)
        const d = diff(v, snaps[v.id], r.gases, r.causes).filter((e) => !(e.kind === 'observation' && e.tags?.some((t) => t === 'exothermic' || t === 'endothermic')))
        events.push(...r.notes, ...d)
      }
      return events
    }
    case 'stir': {
      need(state, a.vessel)
      return [act(`Stirred the ${a.vessel}.`)]
    }
    case 'flame-test': {
      const v = need(state, a.vessel)
      const f = flameColor(v.contents)
      return [
        act(`Dipped a clean wire loop in the ${v.id} and held it in the Bunsen flame.`),
        because(f ? obs(`The flame turns ${f.name}.`, 'flame', `flame:${f.ion}`) : obs('No distinctive flame color: the flame stays blue.', 'flame', 'flame:none'), whyFlame(f?.ion ?? null)),
      ]
    }
    case 'splint': {
      const v = need(state, a.vessel)
      const h = v.headspace
      const has = (g: string) => (h[g] ?? 0) > 2e-5
      const events: LabEvent[] = [act(`Held a ${a.splint} splint at the mouth of the ${v.id}.`)]
      if (a.splint === 'burning') {
        if (has('H2')) {
          delete h.H2
          events.push(because(obs('A squeaky pop! Hydrogen is present.', 'test', 'test:H2'), whySplint('H2')))
        } else if (has('CO2') && (h.CO2 ?? 0) > (h.O2 ?? 0)) events.push(because(obs('The burning splint goes out.', 'test', 'test:CO2'), whySplint('CO2')))
        else if (has('O2')) events.push(because(obs('The splint flares up and burns more brightly.', 'test', 'test:O2'), whySplint('O2')))
        else events.push(because(obs('The splint keeps burning normally.', 'test', 'test:none'), whySplint('none')))
      } else if (has('O2')) events.push(because(obs('The glowing splint bursts back into flame! Oxygen is present.', 'test', 'test:O2'), whySplint('O2')))
      else events.push(because(obs('The glowing splint just goes out.', 'test', 'test:none'), whySplint('none')))
      return events
    }
    case 'connect-gas': {
      const v = need(state, a.from)
      if (a.to) need(state, a.to)
      v.gasOutlet = a.to ?? undefined
      return [act(a.to ? `Connected a delivery tube from the ${v.id} into the ${a.to}.` : `Removed the delivery tube from the ${v.id}.`)]
    }
    case 'burn': {
      const v = need(state, a.vessel)
      const mg = v.contents.Mg ?? 0
      const events: LabEvent[] = [act(`Held the contents of the ${v.id} in the Bunsen flame with tongs.`)]
      if (mg <= 0) return [...events, obs('Nothing catches fire.', 'no-burn')]
      if (hasWater(v.contents)) return [...events, obs('It is too wet to burn.', 'no-burn')]
      delete v.contents.Mg
      bump(v.contents, 'MgO', mg)
      return [...events, because(obs('The magnesium burns with a dazzling white light, leaving a white ash of magnesium oxide. (Never look directly at it!)', 'combustion', 'burned:Mg'), WHY_MG_BURNS)]
    }
    case 'remove-vessel': {
      const v = need(state, a.vessel)
      delete state.vessels[v.id]
      for (const o of Object.values(state.vessels)) if (o.gasOutlet === v.id) o.gasOutlet = undefined
      return [act(`Put the ${v.id} away.`)]
    }
    case 'empty': {
      const v = need(state, a.vessel)
      state.vessels[v.id] = makeVessel(v.id, v.kind, state.roomTempC)
      return [act(`Emptied and rinsed the ${v.id}.`)]
    }
  }
}

function check(state: ChemState, c: ChemCheck): boolean {
  const within = (x: number | null, min?: number, max?: number) =>
    x !== null && (min === undefined || x >= min) && (max === undefined || x <= max)
  switch (c.type) {
    case 'observed':
      return state.tags.includes(c.tag)
    case 'ph':
      return !!state.vessels[c.vessel] && within(pH(state.vessels[c.vessel].contents), c.min, c.max)
    case 'temperature':
      return !!state.vessels[c.vessel] && within(state.vessels[c.vessel].tempC, c.min, c.max)
    case 'volume':
      return !!state.vessels[c.vessel] && within(volumeMl(state.vessels[c.vessel]), c.min, c.max)
    case 'contains':
      return !!state.vessels[c.vessel] && within(state.vessels[c.vessel].contents[c.species] ?? 0, c.min ?? TRACE, c.max)
    case 'gas-evolved':
      return !!state.vessels[c.vessel] && (state.vessels[c.vessel].evolved[c.gas] ?? 0) * MOLAR_GAS_ML >= (c.minMl ?? 0.1)
    case 'vessel-exists':
      return !!state.vessels[c.vessel]
    case 'connected':
      return state.vessels[c.from]?.gasOutlet === c.to
    case 'heater':
      return !!state.vessels[c.vessel] && within(state.vessels[c.vessel].heaterW, c.min, c.max)
    case 'all':
      return c.checks.every((x) => check(state, x))
    case 'any':
      return c.checks.some((x) => check(state, x))
  }
}

function measure(state: ChemState, instrument: string, target: string): Measurement | null {
  const v = state.vessels[target]
  if (!v) return null
  switch (instrument) {
    case 'thermometer':
      return { quantity: 'temperature', value: round(v.tempC, 1), unit: '°C', instrument }
    case 'ph-meter': {
      const p = pH(v.contents)
      return p === null ? null : { quantity: 'pH', value: round(p, 2), unit: '', instrument }
    }
    case 'balance':
      return { quantity: 'mass', value: round(massG(v.contents), 2), unit: 'g', instrument }
    case 'gas-syringe': {
      const mol = Object.values(v.evolved).reduce((a, b) => a + b, 0)
      return { quantity: 'gas volume', value: round(mol * MOLAR_GAS_ML, 1), unit: 'mL', instrument }
    }
    default:
      return null
  }
}

export const chemistryEngine: Engine<ChemState, ChemAction, ChemCheck, ChemSetup> = {
  create(setup) {
    let state: ChemState = { time: 0, roomTempC: setup.roomTempC ?? 20, vessels: {}, tags: [] }
    for (const v of setup.vessels ?? []) {
      state = chemistryEngine.apply(state, { type: 'add-vessel', id: v.id, vessel: v.kind }).state
      for (const c of v.contents ?? []) state = chemistryEngine.apply(state, { type: 'add', vessel: v.id, reagent: c.reagent, amount: c.amount }).state
    }
    return { ...state, tags: [] }
  },
  apply(prev, action) {
    const state = structuredClone(prev)
    const events = step(state, action)
    for (const e of events) if (e.kind === 'observation') for (const t of e.tags ?? []) if (!state.tags.includes(t)) state.tags.push(t)
    return { state, events }
  },
  measure,
  check,
}
