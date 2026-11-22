import type { AnyDomain } from './domain'
import { experimentSchema, type Experiment } from './experiment'

export interface Registry {
  domains: AnyDomain[]
  domain(id: string): AnyDomain | undefined
  experiments(): Experiment[]
  experiment(id: string): { domain: AnyDomain; experiment: Experiment } | undefined
}

/** Validates every domain and its experiments up front; throws with every problem found. */
export function createRegistry(domains: AnyDomain[]): Registry {
  const problems: string[] = []
  const seenDomains = new Set<string>()
  const byExperiment = new Map<string, { domain: AnyDomain; experiment: Experiment }>()

  for (const d of domains) {
    if (seenDomains.has(d.id)) problems.push(`duplicate domain id "${d.id}"`)
    seenDomains.add(d.id)
    const schema = experimentSchema(d.schemas)
    for (const raw of d.experiments) {
      const parsed = schema.safeParse(raw)
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          problems.push(`${d.id}/${raw.id ?? '?'}: ${issue.path.join('.')} ${issue.message}`)
        continue
      }
      const exp = parsed.data as Experiment
      if (exp.domain !== d.id)
        problems.push(`${d.id}/${exp.id}: domain field is "${exp.domain}", expected "${d.id}"`)
      if (byExperiment.has(exp.id)) problems.push(`duplicate experiment id "${exp.id}"`)
      byExperiment.set(exp.id, { domain: d, experiment: exp })
    }
  }
  if (problems.length) throw new Error(`Invalid lab content:\n- ${problems.join('\n- ')}`)

  return {
    domains,
    domain: (id) => domains.find((d) => d.id === id),
    experiments: () => [...byExperiment.values()].map((e) => e.experiment),
    experiment: (id) => byExperiment.get(id),
  }
}
