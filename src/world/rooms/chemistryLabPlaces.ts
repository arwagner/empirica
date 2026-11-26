import type { Interactable } from '../types'

/** The Chemistry Lab: plain data, so code that can't load the 3D scene (the professor's catalog) can still list its stations. */
export const CHEMISTRY_LAB = { id: 'chemistry-lab', name: 'Chemistry Lab' }

export const CHEMISTRY_LAB_INTERACTABLES: Interactable[] = [
  {
    id: 'wet-bench',
    kind: 'station',
    domain: 'chemistry',
    name: 'Wet Bench',
    blurb: 'Glassware, reagents, hot plate, balance. Mixing, titrations, precipitation.',
    marker: [0, 2.0, -1],
    view: { center: [0, 0, -1], faces: [[0, 0, 1], [0, 0, -1]], distance: 2.5, height: 1.75, targetY: 0.95 },
    setup: { vessels: [{ id: 'beaker A', kind: 'beaker-250' }, { id: 'beaker B', kind: 'beaker-250' }, { id: 'flask', kind: 'flask-250' }] },
  },
  {
    id: 'fume-hood',
    kind: 'station',
    domain: 'chemistry',
    name: 'Fume Hood',
    blurb: 'Ventilated enclosure for gases, volatile and reactive chemistry.',
    marker: [-4, 2.6, -5.2],
    view: { center: [-4, 0, -5.4], faces: [[0, 0, 1]], distance: 2.5, height: 1.5, targetY: 1.4 },
    setup: { vessels: [{ id: 'flask', kind: 'flask-250' }, { id: 'test tube 1', kind: 'test-tube' }, { id: 'crucible', kind: 'crucible' }] },
  },
  {
    id: 'flame-station',
    kind: 'station',
    domain: 'chemistry',
    name: 'Flame Test Station',
    blurb: 'Bunsen burner and wire loop. See which metals burn which colors.',
    marker: [7.1, 1.9, -1],
    view: { center: [7.2, 0, -1], faces: [[-1, 0, 0]], distance: 1.7, height: 1.3, targetY: 1.1 },
    setup: { vessels: [1, 2, 3, 4].map((n) => ({ id: `test tube ${n}`, kind: 'test-tube' })) },
  },
  {
    id: 'door-bio', kind: 'door', name: 'Biology Lab', blurb: 'Cells, genes, enzymes and ecosystems.', marker: [-7.85, 2.5, 3],
    leadsTo: { room: 'biology-lab', spawn: { position: [7.6, 1.6, 3], yaw: Math.PI / 2 } },
  },
  {
    id: 'door-phys', kind: 'door', name: 'Physics Hall', blurb: 'Motion, forces and energy.', marker: [7.85, 2.5, 3],
    leadsTo: { room: 'physics-hall', spawn: { position: [-8.6, 1.6, 3], yaw: -Math.PI / 2 } },
  },
  { id: 'door-obs', kind: 'door', name: 'Stairs to Observatory', blurb: 'Opens in a future update.', marker: [5, 2.5, -5.85] },
]
