import { BIOLOGY_LAB, BIOLOGY_LAB_INTERACTABLES } from './rooms/biologyLabPlaces'
import { CHEMISTRY_LAB, CHEMISTRY_LAB_INTERACTABLES } from './rooms/chemistryLabPlaces'
import { PHYSICS_HALL, PHYSICS_HALL_INTERACTABLES } from './rooms/physicsHallPlaces'
import type { Interactable } from './types'

/**
 * Every room and what's in it, without the 3D scenes: safe to load where three.js can't run.
 * `BUILDING` uses the same data; a test keeps the two in step.
 */
export const PLACES: { id: string; name: string; interactables: Interactable[] }[] = [
  { ...CHEMISTRY_LAB, interactables: CHEMISTRY_LAB_INTERACTABLES },
  { ...PHYSICS_HALL, interactables: PHYSICS_HALL_INTERACTABLES },
  { ...BIOLOGY_LAB, interactables: BIOLOGY_LAB_INTERACTABLES },
]
