import { bufferChallenge, neutralizationEnergy, redCabbage, titration } from './acidsAndBases'
import { heatingCurve, hotAndColdPacks, limitingReagent, thermalDecomposition } from './energyAndAmounts'
import type { ChemExperiment } from './helpers'
import { alkaliMetals, displacement, flameTests, halideTests, limewaterTest, oxygenCatalyst, reactivitySeries } from './reactions'

/** First chemistry pack, roughly easiest first. */
export const chemistryExperiments: ChemExperiment[] = [
  redCabbage,
  flameTests,
  halideTests,
  hotAndColdPacks,
  heatingCurve,
  alkaliMetals,
  limewaterTest,
  oxygenCatalyst,
  titration,
  neutralizationEnergy,
  reactivitySeries,
  displacement,
  thermalDecomposition,
  bufferChallenge,
  limitingReagent,
]
