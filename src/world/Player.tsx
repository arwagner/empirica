import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { cameraLookQuaternion, stationView } from './camera'
import type { Room, Spawn } from './types'

/**
 * 'ready' = back in the room but the mouse isn't captured yet (browsers refuse capture on Esc).
 * 'suspended' = a menu is open over the world; no input reaches the player.
 */
export type Mode = 'start' | 'walking' | 'paused' | 'ready' | 'suspended' | 'flyingIn' | 'station' | 'flyingOut'

const EYE = 1.6
const RADIUS = 0.3
const REACH = 3
const FLY_SECONDS = 0.85
/** Fraction of the fly-in at which the 2D view starts dissolving in over the settling camera. */
const REVEAL_AT = 0.55

function blocked(room: Room, x: number, z: number) {
  const b = room.bounds
  if (x < b.minX + RADIUS || x > b.maxX - RADIUS || z < b.minZ + RADIUS || z > b.maxZ - RADIUS) return true
  return room.colliders.some((c) => x > c.minX - RADIUS && x < c.maxX + RADIUS && z > c.minZ - RADIUS && z < c.maxZ + RADIUS)
}

/** Raycasts include hidden objects; only things whose whole ancestry is visible count. */
function visibleInScene(o: THREE.Object3D | null): boolean {
  for (; o; o = o.parent) if (!o.visible) return false
  return true
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

interface Props {
  room: Room
  /** Where to stand on arrival (a door), instead of the room's default spawn. */
  spawn?: Spawn
  mode: Mode
  stationId: string | null
  onFocus: (id: string | null) => void
  onActivate: (id: string) => void
  onArrived: () => void
  onReveal: () => void
}

export function Player({ room, spawn, mode, stationId, onFocus, onActivate, onArrived, onReveal }: Props) {
  const { camera, gl, scene } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const keys = useRef(new Set<string>())
  const focused = useRef<string | null>(null)
  const saved = useRef(new THREE.Vector3())
  const fly = useRef<{ from: THREE.Vector3; fromQ: THREE.Quaternion; to: THREE.Vector3; toQ: THREE.Quaternion; t: number; out: boolean; revealed: boolean } | null>(null)
  const ray = useRef(new THREE.Raycaster())
  const cb = useRef({ onFocus, onActivate, onArrived, onReveal })
  useLayoutEffect(() => {
    cb.current = { onFocus, onActivate, onArrived, onReveal }
  })

  useEffect(() => {
    const start = spawn ?? room.spawn
    camera.position.set(...start.position)
    yaw.current = start.yaw
    pitch.current = 0
    camera.rotation.set(0, start.yaw, 0, 'YXZ')
    camera.rotation.order = 'YXZ'
    // Dev aid: ?pose=<station-id> parks the camera at that station's view, with no overlay.
    const q = new URLSearchParams(location.search)
    const v = room.interactables.find((i) => i.id === q.get('pose'))?.view
    const look = q.get('look')?.split(',').map(Number)
    if (look?.length === 6) {
      camera.position.set(look[0], look[1], look[2])
      camera.lookAt(look[3], look[4], look[5])
    } else if (v) {
      const pose = stationView(v, q.get('side') === 'back' ? [0, 0, -9] : [0, 0, 9])
      camera.position.set(...pose.position)
      camera.lookAt(...pose.target)
    }
  // Mount-only: a room change remounts the Player (keyed by room).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const locked = () => document.pointerLockElement === gl.domElement
    const move = (e: MouseEvent) => {
      if (!locked()) return
      yaw.current -= e.movementX * 0.0022
      pitch.current = THREE.MathUtils.clamp(pitch.current - e.movementY * 0.0022, -1.45, 1.45)
    }
    const down = (e: KeyboardEvent) => keys.current.add(e.code)
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    const click = () => {
      if (locked() && focused.current) cb.current.onActivate(focused.current)
    }
    const interact = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && !e.repeat) click()
    }
    const blur = () => keys.current.clear()
    document.addEventListener('mousemove', move)
    document.addEventListener('keydown', down)
    document.addEventListener('keydown', interact)
    document.addEventListener('keyup', up)
    document.addEventListener('mousedown', click)
    window.addEventListener('blur', blur)
    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('keydown', down)
      document.removeEventListener('keydown', interact)
      document.removeEventListener('keyup', up)
      document.removeEventListener('mousedown', click)
      window.removeEventListener('blur', blur)
    }
  }, [gl])

  // Start a camera flight when the mode asks for one.
  useEffect(() => {
    if (mode === 'flyingIn' && stationId) {
      const v = room.interactables.find((i) => i.id === stationId)?.view
      if (!v) return
      const view = stationView(v, camera.position.toArray())
      saved.current.copy(camera.position)
      const to = new THREE.Vector3(...view.position)
      fly.current = { from: camera.position.clone(), fromQ: camera.quaternion.clone(), to, toQ: cameraLookQuaternion(view.position, view.target), t: 0, out: false, revealed: false }
    }
    if (mode === 'flyingOut') {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      fly.current = { from: camera.position.clone(), fromQ: camera.quaternion.clone(), to: saved.current.clone(), toQ: q, t: 0, out: true, revealed: true }
    }
    keys.current.clear()
    if (mode === 'flyingIn' || mode === 'flyingOut') focused.current = null // no re-trigger mid-flight
  }, [mode, stationId, camera, room])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    if (fly.current) {
      const f = fly.current
      f.t = Math.min(1, f.t + dt / FLY_SECONDS)
      const k = ease(f.t)
      camera.position.lerpVectors(f.from, f.to, k)
      camera.quaternion.slerpQuaternions(f.fromQ, f.toQ, k)
      if (!f.revealed && f.t >= REVEAL_AT) {
        f.revealed = true
        cb.current.onReveal()
      }
      if (f.t >= 1) {
        fly.current = null
        if (f.out) camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
        cb.current.onArrived()
      }
      return
    }
    if (mode !== 'walking' && mode !== 'ready') return

    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')
    const k = keys.current
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const side = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
    if (fwd || side) {
      const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 5.5 : 3) * dt
      const len = Math.hypot(fwd, side)
      const s = Math.sin(yaw.current)
      const c = Math.cos(yaw.current)
      const dx = ((-s * fwd + c * side) / len) * speed
      const dz = ((-c * fwd - s * side) / len) * speed
      const p = camera.position
      if (!blocked(room, p.x + dx, p.z)) p.x += dx
      if (!blocked(room, p.x, p.z + dz)) p.z += dz
      p.y = EYE + Math.sin(performance.now() / 110) * 0.02 // a little head bob
    }

    ray.current.setFromCamera(new THREE.Vector2(0, 0), camera)
    ray.current.far = REACH
    let hitId: string | null = null
    for (const hit of ray.current.intersectObjects(scene.children, true)) {
      if (!visibleInScene(hit.object)) continue // other rooms are mounted but hidden
      let o: THREE.Object3D | null = hit.object
      while (o && !o.userData.interactId) o = o.parent
      hitId = o?.userData.interactId ?? null
      break // only the nearest surface counts, so walls block what's behind them
    }
    if (hitId !== focused.current) {
      focused.current = hitId
      cb.current.onFocus(hitId)
    }
  })

  return null
}
