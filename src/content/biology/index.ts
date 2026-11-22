import { bacteriaUnderOil, cheekCells, dihybrid, mendel, onionCells, sexLinked, stomata, testCross } from './cellsAndGenes'
import type { BiologyExperiment } from './helpers'
import {
  agarCubes, antibioticZones, aseptic, carryingCapacity, colonyCount, enzymeControl, enzymePH, enzymeTemperature, growthCurve,
  lightIntensity, limitingFactors, pepperedMoths, potatoOsmosis, predatorPrey,
} from './processes'

/** First biology pack, roughly easiest first. */
export const biologyExperiments: BiologyExperiment[] = [
  onionCells, cheekCells, stomata, mendel, enzymeControl, aseptic, predatorPrey, carryingCapacity,
  enzymeTemperature, enzymePH, potatoOsmosis, agarCubes, lightIntensity, antibioticZones, colonyCount, growthCurve, dihybrid, pepperedMoths,
  bacteriaUnderOil, testCross, sexLinked, limitingFactors,
]
