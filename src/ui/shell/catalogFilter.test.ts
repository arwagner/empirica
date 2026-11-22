import type { Experiment } from '../../core'
import { EMPTY_FILTER, filterExperiments, topicsOf } from './catalogFilter'

const e = (id: string, domain: string, topics: string[], difficulty: Experiment['difficulty'], title = id) =>
  ({ id, domain, topics, difficulty, title, summary: `${title} summary` }) as Experiment

const all = [
  e('titration', 'chemistry', ['acids', 'bases'], 'core', 'Acid-base titration'),
  e('flame', 'chemistry', ['metals', 'spectra'], 'intro', 'Flame tests'),
  e('orbits', 'astro', ['gravity'], 'advanced', 'Orbital mechanics'),
]

test('empty filter returns everything', () => expect(filterExperiments(all, EMPTY_FILTER)).toHaveLength(3))
test('every query word must match title, summary or topics', () => {
  expect(filterExperiments(all, { ...EMPTY_FILTER, query: 'acid bases' }).map((x) => x.id)).toEqual(['titration'])
  expect(filterExperiments(all, { ...EMPTY_FILTER, query: 'FLAME' }).map((x) => x.id)).toEqual(['flame'])
})
test('facets combine', () => {
  expect(filterExperiments(all, { ...EMPTY_FILTER, domain: 'chemistry', difficulty: 'intro' }).map((x) => x.id)).toEqual(['flame'])
  expect(filterExperiments(all, { ...EMPTY_FILTER, topic: 'gravity' }).map((x) => x.id)).toEqual(['orbits'])
})
test('topics are unique and sorted', () => expect(topicsOf(all)).toEqual(['acids', 'bases', 'gravity', 'metals', 'spectra']))
