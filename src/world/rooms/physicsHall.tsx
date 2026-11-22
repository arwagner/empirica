import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { C } from '../palette'
import { Box, Door, Hit, Mat, Sign } from '../props'
import type { Interactable, Room } from '../types'

const ROOM = { minX: -10, maxX: 10, minZ: -7, maxZ: 7, height: 6 }

const INTERACTABLES: Interactable[] = [
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

const COLLIDERS = [
  { minX: -6.2, maxX: -1.8, minZ: -6.2, maxZ: -4.6 }, // ramp bench
  { minX: 1.2, maxX: 6.8, minZ: -6.1, maxZ: -5.1 }, // collision track
  { minX: 1.1, maxX: 2.9, minZ: 1.1, maxZ: 1.9 }, // pendulum frame
  { minX: -4.6, maxX: -3.4, minZ: 4.8, maxZ: 5.6 }, // launcher
  { minX: 7.4, maxX: 8.6, minZ: 3.4, maxZ: 4.6 }, // drop tower
]

function Pendulum() {
  const arm = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (arm.current) arm.current.rotation.z = 0.35 * Math.cos(clock.elapsedTime * Math.sqrt(9.81 / 2.2))
  })
  return (
    <group position={[2, 0, 1.5]}>
      {[-0.8, 0.8].map((x) => (
        <Box key={x} size={[0.08, 3, 0.08]} position={[x, 1.5, 0]} color={C.steel} />
      ))}
      <Box size={[1.8, 0.08, 0.08]} position={[0, 3, 0]} color={C.steel} />
      <Box size={[0.4, 0.04, 0.8]} position={[-0.8, 0.02, 0]} color={C.steel} />
      <Box size={[0.4, 0.04, 0.8]} position={[0.8, 0.02, 0]} color={C.steel} />
      <group ref={arm} position={[0, 2.96, 0]}>
        <mesh position={[0, -1.1, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 2.2, 4]} />
          <Mat color="#ddd" />
        </mesh>
        <mesh position={[0, -2.2, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 8]} />
          <Mat color="#c9a227" metalness={0.5} />
        </mesh>
      </group>
    </group>
  )
}

function Glider({ x, color }: { x: number; color: string }) {
  return <Box size={[0.3, 0.12, 0.14]} position={[x, 1.02, -5.6]} color={color} />
}

function PhysicsHallScene() {
  const W = ROOM.maxX - ROOM.minX
  const D = ROOM.maxZ - ROOM.minZ
  const H = ROOM.height
  const th = (12 * Math.PI) / 180
  return (
    <group>
      <hemisphereLight args={['#fff8ec', '#a89a80', 1.3]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5.5, 5]} intensity={0.9} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={8} shadow-camera-bottom={-8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <Mat color="#c9c2b2" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <Mat color={C.ceiling} emissive={C.ceiling} emissiveIntensity={0.35} />
      </mesh>
      <Box size={[W, H, 0.1]} position={[0, H / 2, ROOM.minZ - 0.05]} color={C.wall} shadow={false} />
      <Box size={[W, H, 0.1]} position={[0, H / 2, ROOM.maxZ + 0.05]} color={C.wall} shadow={false} />
      <Box size={[0.1, H, D]} position={[ROOM.minX - 0.05, H / 2, 0]} color={C.wall} shadow={false} />
      <Box size={[0.1, H, D]} position={[ROOM.maxX + 0.05, H / 2, 0]} color={C.wall} shadow={false} />
      {/* exposed roof beams and skylight strips */}
      {[-6, -2, 2, 6].map((x) => (
        <Box key={x} size={[0.25, 0.4, D]} position={[x, H - 0.2, 0]} color={C.wood} shadow={false} />
      ))}
      {[-4, 0, 4].map((x) => (
        <Box key={x} size={[2.4, 0.04, D - 2]} position={[x, H - 0.03, 0]} color="#fffdf5" emissive="#fff6dc" emissiveIntensity={1.1} shadow={false} />
      ))}
      {/* tall windows on the east wall */}
      {[-4, 0].map((z) => (
        <Box key={z} size={[0.04, 3.2, 2]} position={[ROOM.maxX - 0.02, 2.8, z]} color="#bfe3f5" emissive="#a6d8f0" emissiveIntensity={0.6} shadow={false} />
      ))}
      <Sign text="PHYSICS HALL" position={[0, 4.6, ROOM.minZ + 0.02]} />
      {/* floor markings: launch lane */}
      <Box size={[8, 0.01, 0.08]} position={[0, 0.005, 5.2]} color="#e8d36a" shadow={false} />

      <Hit id="ramp-station">
        <Box size={[4.2, 0.85, 1.4]} position={[-4, 0.425, -5.4]} color={C.cabinet} />
        <Box size={[4.4, 0.06, 1.5]} position={[-4, 0.88, -5.4]} color={C.benchTop} />
        {/* the inclined track rises to the left, like the 2D bench */}
        <mesh position={[-4, 0.91 + Math.sin(th) * 1.6 / 2, -5.4]} rotation={[0, 0, -th]} castShadow>
          <boxGeometry args={[3.3, 0.05, 0.22]} />
          <Mat color={C.wood} />
        </mesh>
        <Box size={[0.08, Math.sin(th) * 3.2, 0.22]} position={[-5.6, 0.91 + Math.sin(th) * 1.6, -5.4]} color={C.wood} />
        <Box size={[0.24, 0.1, 0.14]} position={[-5.3, 1.38, -5.4]} color="#2f7d6d" />
        {[-4.5, -3.2].map((x) => (
          <group key={x}>
            <Box size={[0.03, 0.4, 0.03]} position={[x, 1.25, -5.55]} color="#555" />
            <Box size={[0.06, 0.06, 0.06]} position={[x, 1.45, -5.55]} color="#c0392b" />
          </group>
        ))}
      </Hit>

      <Hit id="collision-station">
        <Box size={[5.6, 0.85, 1]} position={[4, 0.425, -5.6]} color={C.cabinet} />
        <Box size={[5.4, 0.08, 0.2]} position={[4, 0.92, -5.6]} color={C.steel} />
        <Glider x={2.6} color="#e1a32a" />
        <Glider x={5.2} color="#2e86ab" />
      </Hit>

      <Hit id="pendulum-station">
        <Pendulum />
      </Hit>

      <Hit id="launcher-station">
        <group position={[-4, 0, 5.2]}>
          <Box size={[1, 0.3, 0.7]} position={[0, 0.15, 0]} color="#555" />
          <mesh position={[0.15, 0.55, 0]} rotation={[0, 0, Math.PI / 5]}>
            <cylinderGeometry args={[0.08, 0.1, 0.7, 10]} />
            <Mat color={C.cabinet} />
          </mesh>
        </group>
        {[1, 2, 3].map((r) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[3.5, 0.01 + r * 0.001, 5.2]}>
            <ringGeometry args={[r * 0.3 - 0.15, r * 0.3, 24]} />
            <meshStandardMaterial color={r % 2 ? '#c0392b' : '#f4f1e8'} />
          </mesh>
        ))}
      </Hit>

      <Hit id="drop-tower">
        <group position={[8, 0, 4]}>
          <mesh position={[0, 2.6, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 5, 14, 1, true]} />
            <Mat color={C.glass} transparent opacity={0.25} side={THREE.DoubleSide} />
          </mesh>
          {[0, 5.1].map((y) => (
            <mesh key={y} position={[0, y + 0.05, 0]}>
              <cylinderGeometry args={[0.45, 0.45, 0.12, 14]} />
              <Mat color={C.steel} />
            </mesh>
          ))}
          <Box size={[0.3, 0.4, 0.3]} position={[0.6, 0.2, 0]} color="#555" />
        </group>
      </Hit>

      <Hit id="door-chem">
        <Door position={[ROOM.minX + 0.05, 0, 3]} rotation={[0, Math.PI / 2, 0]} label="CHEMISTRY LAB" />
      </Hit>
    </group>
  )
}

export const physicsHall: Room = {
  id: 'physics-hall',
  name: 'Physics Hall',
  bounds: ROOM,
  colliders: COLLIDERS,
  interactables: INTERACTABLES,
  spawn: { position: [-8.6, 1.6, 3], yaw: -Math.PI / 2 },
  Scene: PhysicsHallScene,
}
