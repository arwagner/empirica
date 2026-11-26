import type { Interactable } from '../types'

/** The Physics Hall: plain data, so code that can't load the 3D scene (the professor's catalog) can still list its stations. */
export const PHYSICS_HALL = { id: 'physics-hall', name: 'Physics Hall' }

export const PHYSICS_HALL_INTERACTABLES: Interactable[] = [
  {
    id: 'ramp-station', kind: 'station', domain: 'physics', name: 'Ramp & Carts',
    blurb: 'Tilt the track, release a cart, time it through light gates.',
    marker: [-4, 2.2, -5.4],
    view: { center: [-4, 0, -5.4], faces: [[0, 0, 1]], distance: 2.6, height: 1.6, targetY: 1.2 },
    setup: { rig: { kind: 'ramp' } },
  },
  {
    id: 'collision-station', kind: 'station', domain: 'physics', name: 'Collision Track',
    blurb: 'Gliders on an air track: bounce, stick, explode apart.',
    marker: [4, 1.9, -5.6],
    view: { center: [4, 0, -5.6], faces: [[0, 0, 1]], distance: 2.8, height: 1.5, targetY: 1.0 },
    setup: { rig: { kind: 'track' } },
  },
  {
    id: 'pendulum-station', kind: 'station', domain: 'physics', name: 'Pendulum & Spring',
    blurb: 'Swing a pendulum, bounce a mass on a spring, time the periods.',
    marker: [2, 3.4, 1.5],
    view: { center: [2, 0, 1.5], faces: [[0, 0, 1], [0, 0, -1]], distance: 3.2, height: 1.8, targetY: 1.7 },
    setup: { rig: { kind: 'oscillator' } },
  },
  {
    id: 'launcher-station', kind: 'station', domain: 'physics', name: 'Projectile Launcher',
    blurb: 'Set angle and speed, launch, and measure the range.',
    marker: [-4, 1.8, 5.2],
    view: { center: [-0.5, 0, 5.2], faces: [[0, 0, -1]], distance: 6.5, height: 2.4, targetY: 0.8 },
    setup: { rig: { kind: 'launcher' } },
  },
  {
    id: 'drop-tower', kind: 'station', domain: 'physics', name: 'Drop Tower',
    blurb: 'Drop things in air or vacuum: the hammer and the feather.',
    marker: [8, 5.4, 4],
    view: { center: [8, 0, 4], faces: [[-1, 0, 0]], distance: 4.5, height: 2.6, targetY: 2.6 },
    setup: { rig: { kind: 'drop-tower' } },
  },
  {
    id: 'door-chem', kind: 'door', name: 'Chemistry Lab', blurb: 'Back to the chemistry lab.',
    marker: [-9.85, 2.5, 3],
    leadsTo: { room: 'chemistry-lab', spawn: { position: [6.6, 1.6, 3], yaw: Math.PI / 2 } },
  },
]
