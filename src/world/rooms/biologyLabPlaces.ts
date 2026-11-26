import type { Interactable, Vec3 } from '../types'

/** The Biology Lab: plain data, so code that can't load the 3D scene (the professor's catalog) can still list its stations. */
export const BIOLOGY_LAB = { id: 'biology-lab', name: 'Biology Lab' }

const station = (
  id: string, name: string, blurb: string, marker: Vec3, center: Vec3, face: Vec3, distance: number, height: number, targetY: number, rig: string,
): Interactable => ({
  id, kind: 'station', domain: 'biology', name, blurb, marker,
  view: { center, faces: [face], distance, height, targetY },
  setup: { rig: { kind: rig } },
})

export const BIOLOGY_LAB_INTERACTABLES: Interactable[] = [
  station('microscope-station', 'Microscope', 'Look at cells: onion, cheek, leaves, pond life, blood, bacteria.', [-5, 1.6, -6.2], [-5, 0, -6.2], [0, 0, 1], 2.2, 1.6, 1.15, 'microscope'),
  station('genetics-station', 'Genetics', 'Cross pea plants and fruit flies; predict and count the offspring.', [0, 1.6, -6.2], [0, 0, -6.2], [0, 0, 1], 2.6, 1.6, 1.2, 'genetics'),
  station('enzyme-station', 'Enzymes', 'Catalase and hydrogen peroxide: temperature, pH and concentration.', [5, 1.6, -6.2], [5, 0, -6.2], [0, 0, 1], 2.4, 1.6, 1.1, 'enzymes'),
  station('osmosis-station', 'Osmosis & Diffusion', 'Potato pieces in sugar solutions; agar cubes in acid.', [-8.2, 1.6, -1], [-8.2, 0, -1], [1, 0, 0], 2.4, 1.6, 1.1, 'osmosis'),
  station('photosynthesis-station', 'Photosynthesis', 'Pondweed, a lamp and a bubble counter.', [-2.5, 1.8, 2], [-2.5, 0, 2], [0, 0, 1], 2.4, 1.6, 1.15, 'photosynthesis'),
  station('microbiology-station', 'Microbiology', 'Grow bacteria on agar; test antibiotics; watch a growth curve.', [-8.2, 1.6, 4.5], [-8.2, 0, 4.5], [1, 0, 0], 2.4, 1.6, 1.15, 'microbiology'),
  station('ecology-station', 'Ecology', 'Predators and prey on an island; natural selection in moths.', [3, 1.8, 5.2], [3, 0, 5.2], [0, 0, -1], 2.6, 1.7, 1.2, 'ecology'),
  {
    id: 'door-chem-from-bio', kind: 'door', name: 'Chemistry Lab', blurb: 'Back to the chemistry lab.', marker: [8.85, 2.5, 3],
    leadsTo: { room: 'chemistry-lab', spawn: { position: [-6.6, 1.6, 3], yaw: -Math.PI / 2 } },
  },
]
