import type { Experiment, Explanation } from '../../core'
import type { ChemAction, ChemCheck, ChemSetup } from '../../domains/chemistry'

export type ChemExperiment = Experiment<ChemAction, ChemCheck, ChemSetup>

/** Explanation at three depths: simple, intermediate, advanced. */
export const X = (simple: string, intermediate: string, advanced: string): Explanation => ({ simple, intermediate, advanced })

export const saw = (tag: string): ChemCheck => ({ type: 'observed', tag })

/** The solution turned this color (or a pale version of it). */
export const turned = (...names: string[]): ChemCheck => ({
  type: 'any',
  checks: names.flatMap((n) => [saw(`color:${n}`), saw(`color:pale ${n}`)]),
})

export const add = (vessel: string, reagent: string, amount: number): ChemAction => ({ type: 'add', vessel, reagent, amount })
