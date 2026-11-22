import { rigDomain, type AnyRig } from '../../core'
import { ecologyRig } from './rigs/ecology'
import { enzymeRig } from './rigs/enzymes'
import { geneticsRig } from './rigs/genetics'
import { microbiologyRig } from './rigs/microbiology'
import { microscopeRig } from './rigs/microscope'
import { osmosisRig } from './rigs/osmosis'
import { photosynthesisRig } from './rigs/photosynthesis'

export const BIOLOGY_RIGS: AnyRig[] = [microscopeRig, geneticsRig, enzymeRig, osmosisRig, photosynthesisRig, microbiologyRig, ecologyRig]

export const biology = rigDomain(
  { id: 'biology', name: 'Biology', description: 'Cells, genetics, enzymes, osmosis, photosynthesis, microbes and ecosystems.' },
  BIOLOGY_RIGS,
)
