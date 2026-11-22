import { biologyLab } from './rooms/biologyLab'
import { chemistryLab } from './rooms/chemistryLab'
import { physicsHall } from './rooms/physicsHall'
import type { Building } from './types'

/** The lab building: every room, and where you start. */
export const BUILDING: Building = { rooms: [chemistryLab, physicsHall, biologyLab], start: chemistryLab.id }
