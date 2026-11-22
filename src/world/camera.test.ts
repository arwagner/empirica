import * as THREE from 'three'
import { cameraLookQuaternion, stationView } from './camera'
import { chemistryLab } from './rooms/chemistryLab'

const INTERACTABLES = chemistryLab.interactables

const wet = INTERACTABLES.find((i) => i.id === 'wet-bench')!.view!

test('enters the wet bench from whichever side the player is on', () => {
  expect(stationView(wet, [0.5, 1.6, 3]).position[2]).toBeGreaterThan(-1)
  expect(stationView(wet, [-1, 1.6, -4]).position[2]).toBeLessThan(-1)
})

test('always looks at the station center', () => {
  expect(stationView(wet, [0, 1.6, -4]).target).toEqual([0, 0.95, -1])
})

test.each(INTERACTABLES.filter((i) => i.view).map((i) => [i.id, i.view!]))(
  'fly-in to %s ends facing the station from either side',
  (_, v) => {
    for (const from of [[0, 1.6, 5], [0, 1.6, -4], [6, 1.6, 4]] as [number, number, number][]) {
      const { position, target } = stationView(v, from)
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraLookQuaternion(position, target))
      const toTarget = new THREE.Vector3(...target).sub(new THREE.Vector3(...position)).normalize()
      expect(forward.dot(toTarget)).toBeGreaterThan(0.999)
    }
  },
)
