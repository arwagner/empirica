import { z } from 'zod'
import { Rng, reseed, type Explanation, type LabEvent, type Rig } from '../../../core'

const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })

export type Organism = 'pea' | 'fly'
export interface Gene { id: string; trait: string; dominant: string; recessive: string; xLinked?: boolean }

export const GENES: Record<Organism, Gene[]> = {
  pea: [
    { id: 'R', trait: 'seed shape', dominant: 'round', recessive: 'wrinkled' },
    { id: 'Y', trait: 'seed color', dominant: 'yellow', recessive: 'green' },
    { id: 'P', trait: 'flower color', dominant: 'purple', recessive: 'white' },
    { id: 'T', trait: 'plant height', dominant: 'tall', recessive: 'dwarf' },
  ],
  fly: [
    { id: 'W', trait: 'eye color', dominant: 'red-eyed', recessive: 'white-eyed', xLinked: true },
    { id: 'V', trait: 'wings', dominant: 'normal-winged', recessive: 'vestigial-winged' },
    { id: 'E', trait: 'body color', dominant: 'grey', recessive: 'ebony' },
  ],
}
export const ORGANISMS: Record<Organism, { name: string; plural: string; defaultN: number }> = {
  pea: { name: 'pea plant', plural: 'pea plants', defaultN: 400 },
  fly: { name: 'fruit fly', plural: 'fruit flies', defaultN: 200 },
}

/** Per gene, two allele letters: upper = dominant, lower = recessive, '-' = the Y chromosome (males, X-linked). */
export type Genotype = Record<string, string>
export type Sex = 'F' | 'M'
export interface Parent { label: string; genotype: Genotype; sex?: Sex; known: boolean }
export interface Generation { id: number; label: string; parents: [string, string]; counts: Record<string, number> }

export interface GeneticsState {
  organism: Organism
  seed: number
  parents: [Parent | null, Parent | null]
  scored: string[]
  n: number
  generations: Generation[]
}

type Pheno = 'dominant' | 'recessive'
const params = z.object({ organism: z.enum(['pea', 'fly']).default('pea'), seed: z.number().int().default(12345) })
type A =
  | { type: 'gen-organism'; organism: Organism }
  | { type: 'gen-stock'; slot: 0 | 1; traits: Record<string, Pheno>; sex?: Sex }
  | { type: 'gen-pick'; slot: 0 | 1; generation: number; phenotype: Record<string, Pheno>; sex?: Sex }
  | { type: 'gen-score'; genes: string[] }
  | { type: 'gen-cross'; n?: number }
  | { type: 'gen-clear' }

// ---------- genotype helpers ----------

const geneOf = (o: Organism, id: string) => GENES[o].find((g) => g.id === id)!
const isMale = (gt: Genotype) => gt.sex === 'M'
export const phenoOf = (gene: Gene, pair: string): Pheno => (pair.includes(gene.id) ? 'dominant' : 'recessive')
export const phenoName = (gene: Gene, p: Pheno) => (p === 'dominant' ? gene.dominant : gene.recessive)
const keyOf = (o: Organism, gt: Genotype) => [...GENES[o].map((g) => `${g.id}:${gt[g.id]}`), ...(o === 'fly' ? [`sex:${gt.sex}`] : [])].join('|')
const parseKey = (k: string): Genotype => Object.fromEntries(k.split('|').map((p) => p.split(':')))

/** A class label for the scored traits, e.g. "round yellow" or "white-eyed male". */
export function classOf(o: Organism, scored: string[], gt: Genotype): string {
  const parts = scored.map((id) => phenoName(geneOf(o, id), phenoOf(geneOf(o, id), gt[id])))
  if (o === 'fly' && scored.some((id) => geneOf(o, id).xLinked)) parts.push(gt.sex === 'M' ? 'male' : 'female')
  return parts.join(' ')
}

function stockGenotype(o: Organism, traits: Record<string, Pheno>, sex?: Sex): Genotype {
  const gt: Genotype = {}
  for (const g of GENES[o]) {
    const a = (traits[g.id] ?? 'dominant') === 'dominant' ? g.id : g.id.toLowerCase()
    gt[g.id] = g.xLinked && sex === 'M' ? `${a}-` : `${a}${a}`
  }
  if (o === 'fly') gt.sex = sex ?? 'F'
  return gt
}

function describe(o: Organism, gt: Genotype) {
  const ph = GENES[o].map((g) => phenoName(g, phenoOf(g, gt[g.id])))
  return `${ph.join(', ')}${o === 'fly' ? ` ${gt.sex === 'M' ? 'male' : 'female'}` : ''}`
}

/** Gametes a parent can make, for the given genes, with probabilities. */
function gametes(o: Organism, gt: Genotype, genes: string[]): { g: Record<string, string>; p: number }[] {
  let out = [{ g: {} as Record<string, string>, p: 1 }]
  const male = isMale(gt)
  const xs = genes.filter((id) => geneOf(o, id).xLinked)
  const autos = genes.filter((id) => !geneOf(o, id).xLinked)
  for (const id of autos) out = out.flatMap((x) => [...gt[id]].map((a) => ({ g: { ...x.g, [id]: a }, p: x.p / 2 })))
  if (o === 'fly') {
    // Sex chromosome travels as a unit: X (with its X-linked alleles) or Y.
    if (male) out = out.flatMap((x) => [{ g: { ...x.g, chr: 'X', ...Object.fromEntries(xs.map((id) => [id, gt[id][0]])) }, p: x.p / 2 }, { g: { ...x.g, chr: 'Y', ...Object.fromEntries(xs.map((id) => [id, '-'])) }, p: x.p / 2 }])
    else out = out.flatMap((x) => (xs.length ? [0, 1].map((i) => ({ g: { ...x.g, chr: 'X', ...Object.fromEntries(xs.map((id) => [id, gt[id][i]])) }, p: x.p / 2 })) : [{ g: { ...x.g, chr: 'X' }, p: x.p }]))
  }
  return out
}

const sortPair = (a: string, b: string) => (a === '-' ? a + b : b === '-' ? b + a : a <= b ? a + b : b + a)
function zygote(o: Organism, g1: Record<string, string>, g2: Record<string, string>, genes: string[]): Genotype {
  const gt: Genotype = {}
  for (const id of genes) {
    const pair = sortPair(g1[id], g2[id])
    gt[id] = pair.startsWith('-') ? pair.slice(1) + '-' : pair
  }
  if (o === 'fly') gt.sex = g1.chr === 'Y' || g2.chr === 'Y' ? 'M' : 'F'
  return gt
}

/** Exact predicted proportions of each scored-trait class for a cross. */
export function predict(o: Organism, p1: Genotype, p2: Genotype, scored: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const a of gametes(o, p1, scored)) for (const b of gametes(o, p2, scored)) {
    const c = classOf(o, scored, zygote(o, a.g, b.g, scored))
    out[c] = (out[c] ?? 0) + a.p * b.p
  }
  return out
}

export function observed(o: Organism, gen: Generation, scored: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, n] of Object.entries(gen.counts)) {
    const c = classOf(o, scored, parseKey(k))
    out[c] = (out[c] ?? 0) + n
  }
  return out
}

// ---------- statistics ----------

/** Regularised upper incomplete gamma Q(a, x), for chi-square p-values. */
function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1
  const lnGamma = (z: number) => {
    const c = [76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.5395239384953e-5]
    let y = z
    const t = z + 5.5 - (z + 0.5) * Math.log(z + 5.5)
    let s = 1.000000000190015
    for (const ci of c) s += ci / ++y
    return -t + Math.log((2.5066282746310002 * s) / z)
  }
  if (x < a + 1) {
    let sum = 1 / a
    let del = sum
    for (let n = 1; n < 200; n++) {
      del *= x / (a + n)
      sum += del
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break
    }
    return 1 - sum * Math.exp(-x + a * Math.log(x) - lnGamma(a))
  }
  let b = x + 1 - a
  let c = 1e300
  let d = 1 / b
  let h = d
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < 1e-300) d = 1e-300
    c = b + an / c
    if (Math.abs(c) < 1e-300) c = 1e-300
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-12) break
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h
}

export function chiSquare(obs: Record<string, number>, expected: Record<string, number>) {
  const total = Object.values(obs).reduce((a, b) => a + b, 0)
  const classes = Object.keys(expected).filter((c) => expected[c] > 0)
  let chi = 0
  for (const c of classes) {
    const e = expected[c] * total
    chi += ((obs[c] ?? 0) - e) ** 2 / e
  }
  const df = Math.max(1, classes.length - 1)
  return { chi, df, p: classes.length < 2 ? 1 : gammaQ(df / 2, chi / 2) }
}

// ---------- why ----------

const fmtPair = (pair: string) => (pair.endsWith('-') ? `${pair[0]}/Y` : pair)

export function whyCross(o: Organism, p1: Parent, p2: Parent, scored: string[]): Explanation {
  const id = scored[0]
  const g = geneOf(o, id)
  const a = p1.genotype[id]
  const b = p2.genotype[id]
  const pred = predict(o, p1.genotype, p2.genotype, [id])
  const ratio = Object.entries(pred).map(([c, p]) => `${Math.round(p * 100)}% ${c}`).join(', ')
  const dom = g.dominant
  const rec = g.recessive
  const gam = (pair: string) => (pair.endsWith('-') ? `${pair[0]} (on its X) or Y` : pair[0] === pair[1] ? `only ${pair[0]}` : `${pair[0]} or ${pair[1]}, half the time each`)
  const simple = g.xLinked
    ? `The eye-color gene sits on the X chromosome. Females have two X's, males have one X and one Y, and the Y carries no eye-color gene. So a son gets his only eye-color gene from his mother, while a daughter gets one from each parent. One copy of the red version is enough for red eyes; white eyes only show when there's no red copy at all. That's why the result (${ratio}) differs between sons and daughters.`
    : `Every ${ORGANISMS[o].name} carries two copies of the ${g.trait} gene, one from each parent, and passes on just one copy, chosen at random, to each offspring. The ${dom} version is "dominant": one copy is enough to make the offspring ${dom}. The ${rec} version only shows when an offspring gets two ${rec} copies. Here the parents can pass on ${gam(a)} and ${gam(b)}, so by chance you expect ${ratio}.`
  return X(
    simple,
    `Parents: ${fmtPair(a)} × ${fmtPair(b)} (${g.id} = ${dom}, ${g.id.toLowerCase()} = ${rec}). Gametes: ${gam(a)}; ${gam(b)}. Combining them at random (a Punnett square) predicts ${ratio}. ${scored.length > 1 ? 'Genes on different chromosomes are inherited independently, so the ratios for two traits multiply (e.g. 3:1 × 3:1 = 9:3:3:1).' : ''}`,
    `Mendel's first law (segregation): alleles separate in meiosis, so each gamete carries one allele with probability ½. ${scored.length > 1 ? 'Second law (independent assortment) holds for unlinked loci. ' : ''}${g.xLinked ? 'Hemizygous males express the single X-linked allele (criss-cross inheritance). ' : ''}Observed counts scatter around the expectation binomially; χ² tests whether the deviation is larger than chance.`,
  )
}

// ---------- rig ----------

const slotName = (slot: 0 | 1) => (slot === 0 ? 'first' : 'second')

export const geneticsRig: Rig<GeneticsState, A, z.infer<typeof params>> = {
  kind: 'genetics',
  name: 'genetics station',
  schemas: {
    params,
    actions: [
      z.object({ type: z.literal('gen-organism'), organism: z.enum(['pea', 'fly']) }),
      z.object({ type: z.literal('gen-stock'), slot: z.union([z.literal(0), z.literal(1)]), traits: z.record(z.string(), z.enum(['dominant', 'recessive'])), sex: z.enum(['F', 'M']).optional() }),
      z.object({ type: z.literal('gen-pick'), slot: z.union([z.literal(0), z.literal(1)]), generation: z.number().int(), phenotype: z.record(z.string(), z.enum(['dominant', 'recessive'])), sex: z.enum(['F', 'M']).optional() }),
      z.object({ type: z.literal('gen-score'), genes: z.array(z.string()).min(1).max(2) }),
      z.object({ type: z.literal('gen-cross'), n: z.number().int().min(10).max(2000).optional() }),
      z.object({ type: z.literal('gen-clear') }),
    ],
  },
  instruments: [
    { id: 'count', name: 'Offspring count (latest cross)', targets: ['total', 'class'] },
    { id: 'proportion', name: 'Proportion of a class (latest cross)', targets: ['class'] },
    { id: 'chi-square', name: 'Chi-square vs prediction (latest cross)', targets: ['latest'] },
    { id: 'p-value', name: 'p-value (latest cross)', targets: ['latest'] },
  ],
  create: (p) => ({ organism: p.organism, seed: p.seed, parents: [null, null], scored: [GENES[p.organism][0].id], n: ORGANISMS[p.organism].defaultN, generations: [] }),

  apply(s, a) {
    const act = (text: string): LabEvent => ({ kind: 'action', text, action: a })
    const o = s.organism
    switch (a.type) {
      case 'gen-organism':
        return { state: { ...s, organism: a.organism, parents: [null, null], scored: [GENES[a.organism][0].id], n: ORGANISMS[a.organism].defaultN, generations: [] }, events: [act(`Switched to ${ORGANISMS[a.organism].plural}.`)] }
      case 'gen-stock': {
        const gt = stockGenotype(o, a.traits, a.sex)
        const p: Parent = { label: `true-breeding ${describe(o, gt)}`, genotype: gt, sex: gt.sex as Sex | undefined, known: true }
        const parents = [...s.parents] as GeneticsState['parents']
        parents[a.slot] = p
        return { state: { ...s, parents }, events: [act(`Chose a ${p.label} as the ${slotName(a.slot)} parent.`)] }
      }
      case 'gen-pick': {
        const gen = s.generations.find((g) => g.id === a.generation)
        if (!gen) throw new Error('No such generation')
        // Candidates: offspring matching the chosen phenotype (scored genes) and sex.
        const matches = Object.entries(gen.counts).filter(([k]) => {
          const gt = parseKey(k)
          return Object.entries(a.phenotype).every(([id, ph]) => phenoOf(geneOf(o, id), gt[id]) === ph) && (!a.sex || gt.sex === a.sex)
        })
        if (!matches.length) throw new Error('No offspring look like that.')
        const rng = new Rng(s.seed)
        const [key] = matches[rng.pick(matches.map(([, n]) => n))]
        const gt = parseKey(key)
        const ids = Object.keys(a.phenotype)
        const known = new Set(matches.map(([k]) => ids.map((id) => parseKey(k)[id]).join())).size === 1
        const p: Parent = { label: `${gen.label} ${classOf(o, ids, gt)}${o === 'fly' && !ids.some((id) => geneOf(o, id).xLinked) ? ` ${gt.sex === 'M' ? 'male' : 'female'}` : ''}`, genotype: gt, sex: gt.sex as Sex | undefined, known }
        const parents = [...s.parents] as GeneticsState['parents']
        parents[a.slot] = p
        return { state: { ...s, seed: rng.seed, parents }, events: [act(`Picked a ${p.label} from the ${gen.label} as the ${slotName(a.slot)} parent.`)] }
      }
      case 'gen-score':
        return { state: { ...s, scored: a.genes }, events: [act(`Scoring ${a.genes.map((id) => geneOf(o, id).trait).join(' and ')}.`)] }
      case 'gen-clear':
        return { state: { ...s, generations: [], parents: [null, null], seed: reseed(s.seed) }, events: [act('Cleared all the crosses.')] }
      case 'gen-cross': {
        const [p1, p2] = s.parents
        if (!p1 || !p2) throw new Error('Choose two parents first.')
        if (o === 'fly' && p1.sex === p2.sex) throw new Error('Fruit flies need a female and a male.')
        const n = a.n ?? s.n
        const rng = new Rng(s.seed)
        const genes = GENES[o].map((g) => g.id)
        const g1 = gametes(o, p1.genotype, genes)
        const g2 = gametes(o, p2.genotype, genes)
        const counts: Record<string, number> = {}
        for (let i = 0; i < n; i++) {
          const gt = zygote(o, g1[rng.pick(g1.map((g) => g.p))].g, g2[rng.pick(g2.map((g) => g.p))].g, genes)
          const k = keyOf(o, gt)
          counts[k] = (counts[k] ?? 0) + 1
        }
        const id = s.generations.length + 1
        const prev = s.generations.find((g) => p1.label.startsWith(g.label) && p2.label.startsWith(g.label))
        const label = prev ? `F${Number(prev.label.slice(1) || 0) + 1}` : p1.label.startsWith('true') && p2.label.startsWith('true') ? 'F1' : `Cross ${id}`
        const gen: Generation = { id, label: s.generations.some((g) => g.label === label) ? `${label} (${id})` : label, parents: [p1.label, p2.label], counts }
        const obs = observed(o, gen, s.scored)
        const summary = Object.entries(obs).sort((x, y) => y[1] - x[1]).map(([c, k]) => `${k} ${c}`).join(', ')
        const classes = Object.keys(obs)
        const tags = ['crossed', `crossed:${gen.label}`, ...(classes.length === 1 ? ['uniform'] : [])]
        return {
          state: { ...s, seed: rng.seed, generations: [...s.generations, gen] },
          events: [
            act(`Crossed ${p1.label} × ${p2.label} (${n} offspring).`),
            { kind: 'observation', text: `${gen.label}: ${summary}.`, tags, why: whyCross(o, p1, p2, s.scored) },
          ],
        }
      }
    }
  },
  step: (s) => ({ state: s, events: [] }),
  atRest: () => true,

  measure(s, inst, target) {
    const gen = s.generations.at(-1)
    if (!gen) return null
    const obs = observed(s.organism, gen, s.scored)
    const total = Object.values(obs).reduce((x, y) => x + y, 0)
    const cls = target.startsWith('class:') ? target.slice(6) : null
    switch (inst) {
      case 'count':
        return target === 'total' ? { quantity: 'offspring', value: total, unit: '', instrument: inst } : cls ? { quantity: `${cls} offspring`, value: obs[cls] ?? 0, unit: '', instrument: inst } : null
      case 'proportion':
        return cls ? { quantity: `proportion ${cls}`, value: Math.round(((obs[cls] ?? 0) / total) * 1000) / 1000, unit: '', instrument: inst } : null
      case 'chi-square':
      case 'p-value': {
        const [p1, p2] = s.parents
        if (!p1 || !p2) return null
        const r = chiSquare(obs, predict(s.organism, p1.genotype, p2.genotype, s.scored))
        return inst === 'chi-square' ? { quantity: `χ² (${r.df} df)`, value: Math.round(r.chi * 100) / 100, unit: '', instrument: inst } : { quantity: 'p-value', value: Math.round(r.p * 1000) / 1000, unit: '', instrument: inst }
      }
      default:
        return null
    }
  },
}

/** A Punnett square for the scored genes: gamete labels for each parent and the offspring class in each cell. */
export function punnett(o: Organism, p1: Genotype, p2: Genotype, scored: string[]) {
  const label = (g: Record<string, string>) => [...scored.map((id) => (g[id] === '-' ? 'Y' : g[id])), ...(o === 'fly' && g.chr === 'Y' && !scored.some((id) => geneOf(o, id).xLinked) ? [] : [])].join('')
  const merge = (gs: { g: Record<string, string>; p: number }[]) => {
    const m = new Map<string, { g: Record<string, string>; p: number }>()
    for (const x of gs) {
      const k = label(x.g) + (x.g.chr ?? '')
      const cur = m.get(k)
      m.set(k, { g: x.g, p: (cur?.p ?? 0) + x.p })
    }
    return [...m.values()]
  }
  const rows = merge(gametes(o, p1, scored))
  const cols = merge(gametes(o, p2, scored))
  return {
    rows: rows.map((r) => label(r.g)),
    cols: cols.map((c) => label(c.g)),
    cells: rows.map((r) => cols.map((c) => {
      const gt = zygote(o, r.g, c.g, scored)
      return { genotype: scored.map((id) => gt[id].replace('-', 'Y')).join(' '), cls: classOf(o, scored, gt) }
    })),
  }
}
