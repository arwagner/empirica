import type { Domain, Equipment } from '../../core'
import { chemistryEngine, type ChemState } from './engine'
import { REAGENTS } from './reagents'
import { ChemActionSchema, ChemCheckSchema, ChemSetupSchema, type ChemAction, type ChemCheck, type ChemSetup } from './schemas'

const EQUIPMENT: Equipment[] = [
  { id: 'beaker-250', name: '250 mL beaker', measures: [] },
  { id: 'beaker-100', name: '100 mL beaker', measures: [] },
  { id: 'flask-250', name: '250 mL conical flask', measures: [] },
  { id: 'test-tube', name: 'Test tube', measures: [] },
  { id: 'boiling-tube', name: 'Boiling tube', measures: [] },
  { id: 'calorimeter', name: 'Polystyrene cup calorimeter', measures: [] },
  { id: 'crucible', name: 'Crucible', measures: [] },
  { id: 'hot-plate', name: 'Hot plate', measures: [] },
  { id: 'bunsen', name: 'Bunsen burner', measures: [] },
  { id: 'thermometer', name: 'Thermometer', measures: ['temperature'] },
  { id: 'ph-meter', name: 'pH meter', measures: ['pH'] },
  { id: 'balance', name: 'Balance', measures: ['mass'] },
  { id: 'gas-syringe', name: 'Gas syringe', measures: ['gas volume'] },
  { id: 'splint', name: 'Wooden splints', measures: [] },
  { id: 'wire-loop', name: 'Nichrome wire loop', measures: [] },
  { id: 'filter-funnel', name: 'Filter funnel and paper', measures: [] },
  { id: 'delivery-tube', name: 'Delivery tube', measures: [] },
]

export const chemistry: Domain<ChemState, ChemAction, ChemCheck, ChemSetup> = {
  id: 'chemistry',
  name: 'Chemistry',
  description: 'Acids and bases, precipitation, metals, gases, energy changes and more.',
  materials: REAGENTS.map((r) => ({ id: r.id, name: r.name, hazards: r.hazards })),
  equipment: EQUIPMENT,
  schemas: { action: ChemActionSchema, check: ChemCheckSchema, setup: ChemSetupSchema },
  engine: chemistryEngine,
  experiments: [],
}

export type { ChemState, ChemAction, ChemCheck, ChemSetup }
