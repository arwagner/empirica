import { elasticCollisions, explosions, hitTheTarget, hookesLaw, largeAngles, pendulumLength, pendulumMass, rangeAndAngle, stickyCollisions } from './collisionsSwingsAndShots'
import { findingFriction, hammerAndFeather, massDoesntMatter, measuringG, newtonsSecondLaw, steeperIsFaster, terminalVelocity } from './fallingAndRamps'
import type { PhysicsExperiment } from './helpers'

/** First mechanics pack, roughly easiest first. */
export const physicsExperiments: PhysicsExperiment[] = [
  hammerAndFeather,
  steeperIsFaster,
  massDoesntMatter,
  pendulumLength,
  pendulumMass,
  elasticCollisions,
  rangeAndAngle,
  measuringG,
  terminalVelocity,
  findingFriction,
  newtonsSecondLaw,
  stickyCollisions,
  explosions,
  hookesLaw,
  hitTheTarget,
  largeAngles,
]
