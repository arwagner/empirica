import * as THREE from 'three'
import type { StationView, Vec3 } from './types'

/** Camera pose for entering a station, from the face nearest the player. */
export function stationView(view: StationView, from: Vec3) {
  const [cx, , cz] = view.center
  const score = (f: Vec3) => f[0] * (from[0] - cx) + f[2] * (from[2] - cz)
  const face = view.faces.reduce((best, f) => (score(f) > score(best) ? f : best))
  return {
    position: [cx + face[0] * view.distance, view.height, cz + face[2] * view.distance] as Vec3,
    target: [cx, view.targetY, cz] as Vec3,
  }
}

/**
 * Orientation for a camera at `eye` looking at `target`. Cameras look down -Z; a plain Object3D's
 * lookAt points +Z at the target, which would aim the camera directly away.
 */
export function cameraLookQuaternion(eye: Vec3, target: Vec3) {
  const m = new THREE.Matrix4().lookAt(new THREE.Vector3(...eye), new THREE.Vector3(...target), new THREE.Vector3(0, 1, 0))
  return new THREE.Quaternion().setFromRotationMatrix(m)
}
