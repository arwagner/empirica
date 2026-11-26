import { registry } from '../../src/content/registry'
import { PLACES } from '../../src/world/places'
import { buildCatalog } from './catalog'

/** This lab's catalog. Bundled into the server at build time; the browser never sends it. */
export const LAB_CATALOG = buildCatalog(registry.domains, PLACES)
