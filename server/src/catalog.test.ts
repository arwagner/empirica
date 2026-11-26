// @vitest-environment node
import { registry } from '../../src/content/registry'
import { catalogText } from './catalog'
import { LAB_CATALOG } from './labCatalog'

test('the bundled catalog has every station, piece of equipment and experiment in the lab', () => {
  const text = catalogText(LAB_CATALOG)
  for (const id of ['wet-bench', 'flame-station', 'ramp-station', 'drop-tower', 'microscope-station', 'ecology-station']) expect(text).toContain(`- ${id}: `)
  for (const d of registry.domains) for (const e of d.equipment) expect(text).toContain(`- ${e.id}: ${e.name}`)
  for (const e of registry.experiments()) expect(text).toContain(`- ${e.id}: ${e.title}`)
})

test('the catalog text is the same every time, so the prompt cache keeps hitting', () => {
  expect(catalogText(LAB_CATALOG)).toBe(catalogText(LAB_CATALOG))
})
