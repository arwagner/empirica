import type { AnyDomain } from '../../src/core'
import type { Interactable } from '../../src/world/types'

/** Everything the professor knows exists in the lab. Built from the same data the site uses. */
export interface Catalog {
  stations: { id: string; name: string; blurb: string; room: string; domain?: string; comingSoon: boolean }[]
  domains: {
    id: string
    name: string
    description: string
    equipment: { id: string; name: string; description?: string; measures: string[] }[]
    materials: { id: string; name: string; description?: string }[]
    experiments: { id: string; title: string; summary: string; station?: string; topics: string[]; difficulty: string }[]
  }[]
}

export function buildCatalog(domains: AnyDomain[], rooms: { name: string; interactables: Interactable[] }[]): Catalog {
  return {
    stations: rooms.flatMap((r) =>
      r.interactables
        .filter((i) => i.kind === 'station')
        .map((i) => ({ id: i.id, name: i.name, blurb: i.blurb, room: r.name, domain: i.domain, comingSoon: !!i.comingSoon })),
    ),
    domains: domains.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      equipment: d.equipment.map((e) => ({ id: e.id, name: e.name, description: e.description, measures: e.measures })),
      materials: d.materials.map((m) => ({ id: m.id, name: m.name, description: m.description })),
      experiments: d.experiments.map((x) => ({
        id: x.id, title: x.title, summary: x.summary, station: x.station, topics: x.topics, difficulty: x.difficulty,
      })),
    })),
  }
}

export const findStation = (catalog: Catalog, id: string | undefined) => (id ? catalog.stations.find((s) => s.id === id) : undefined)

/** The catalog as compact text for the system prompt. Deterministic, so the prompt cache keeps hitting. */
export function catalogText(catalog: Catalog): string {
  const out: string[] = ['# Stations']
  for (const s of catalog.stations)
    out.push(`- ${s.id}: ${s.name} (${s.room}${s.domain ? `, ${s.domain}` : ''})${s.comingSoon ? ' [not open yet]' : ''}. ${s.blurb}`)
  for (const d of catalog.domains) {
    out.push('', `# ${d.name} (${d.id})`, d.description, '', '## Equipment')
    for (const e of d.equipment)
      out.push(`- ${e.id}: ${e.name}${e.measures.length ? ` (measures: ${e.measures.join(', ')})` : ''}${e.description ? `. ${e.description}` : ''}`)
    out.push('', '## Materials')
    out.push(d.materials.map((m) => m.name).join('; ') || '(none listed)')
    out.push('', '## Experiments')
    for (const x of d.experiments)
      out.push(`- ${x.id}: ${x.title}${x.station ? ` [station ${x.station}]` : ''} (${x.difficulty}; ${x.topics.join(', ')}). ${x.summary}`)
  }
  return out.join('\n')
}
