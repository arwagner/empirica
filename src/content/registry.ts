import { createRegistry } from '../core'
import { chemistry } from '../domains/chemistry'
import { physics } from '../domains/physics'
import { biology } from '../domains/biology'
import { chemistryExperiments } from './chemistry'
import { biologyExperiments } from './biology'
import { physicsExperiments } from './physics'

/** Every domain the lab knows about, with its experiment content. Adding a domain = adding it here. */
export const registry = createRegistry([
  { ...chemistry, experiments: chemistryExperiments },
  { ...physics, experiments: physicsExperiments },
  { ...biology, experiments: biologyExperiments },
])
