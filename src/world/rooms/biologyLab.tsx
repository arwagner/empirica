import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { C } from '../palette'
import { Beaker, Box, Door, Hit, Mat, Sign } from '../props'
import type { Interactable, Room, Vec3 } from '../types'

const ROOM = { minX: -9, maxX: 9, minZ: -7, maxZ: 7, height: 4 }
const station = (
  id: string, name: string, blurb: string, marker: Vec3, center: Vec3, face: Vec3, distance: number, height: number, targetY: number, rig: string,
): Interactable => ({
  id, kind: 'station', domain: 'biology', name, blurb, marker,
  view: { center, faces: [face], distance, height, targetY },
  setup: { rig: { kind: rig } },
})

const INTERACTABLES: Interactable[] = [
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

const COLLIDERS = [
  { minX: -9, maxX: 9, minZ: -7, maxZ: -5.5 }, // back benches
  { minX: -9, maxX: -7.5, minZ: -2.2, maxZ: 0.2 }, // osmosis bench
  { minX: -9, maxX: -7.5, minZ: 3.3, maxZ: 5.7 }, // microbiology bench + incubator
  { minX: -3.6, maxX: -1.4, minZ: 1.4, maxZ: 2.6 }, // photosynthesis island
  { minX: 1.8, maxX: 4.2, minZ: 4.5, maxZ: 5.9 }, // ecology terrarium
]

function Bench({ position, size }: { position: Vec3; size: [number, number] }) {
  const [w, d] = size
  return (
    <>
      <Box size={[w, 0.85, d]} position={[position[0], 0.425, position[2]]} color={C.cabinet} />
      <Box size={[w + 0.1, 0.06, d + 0.08]} position={[position[0], 0.88, position[2]]} color={C.benchTop} />
    </>
  )
}

function Microscope({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Box size={[0.22, 0.04, 0.3]} position={[0, 0.02, 0]} color="#2e3b40" />
      <Box size={[0.05, 0.36, 0.05]} position={[0, 0.2, -0.1]} color="#2e3b40" />
      <Box size={[0.2, 0.02, 0.18]} position={[0, 0.16, 0.02]} color="#555" />
      <mesh position={[0, 0.32, 0.0]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.035, 0.24, 10]} />
        <Mat color="#e8e6e0" />
      </mesh>
      <mesh position={[0, 0.45, 0.05]} rotation={[0.35, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.08, 8]} />
        <Mat color="#222" />
      </mesh>
    </group>
  )
}

function PeaPlant({ position, h }: { position: Vec3; h: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.14, 8]} />
        <Mat color="#b5653a" />
      </mesh>
      <mesh position={[0, 0.14 + h / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, h, 4]} />
        <Mat color="#4f8a3a" />
      </mesh>
      {[0.3, 0.6, 0.9].map((f) => (
        <mesh key={f} position={[0.03 * (f > 0.5 ? 1 : -1), 0.14 + h * f, 0]}>
          <sphereGeometry args={[0.045, 6, 4]} />
          <Mat color="#6bb34f" />
        </mesh>
      ))}
    </group>
  )
}

function Pondweed() {
  const g = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.children.forEach((c, i) => (c.rotation.z = Math.sin(clock.elapsedTime * 0.8 + i) * 0.08))
  })
  return (
    <group ref={g} position={[-2.5, 0.92, 2]}>
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.15, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 4]} />
          <Mat color="#3f8f3a" />
        </mesh>
      ))}
    </group>
  )
}

function BiologyLabScene() {
  const W = ROOM.maxX - ROOM.minX
  const D = ROOM.maxZ - ROOM.minZ
  const H = ROOM.height
  return (
    <group>
      <hemisphereLight args={['#fffaf0', '#a6a08a', 1.3]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 3.6, 4]} intensity={0.9} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={8} shadow-camera-bottom={-8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <Mat color="#c3cbb4" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <Mat color={C.ceiling} emissive={C.ceiling} emissiveIntensity={0.35} />
      </mesh>
      <Box size={[W, H, 0.1]} position={[0, H / 2, ROOM.minZ - 0.05]} color="#e9eddf" shadow={false} />
      <Box size={[W, H, 0.1]} position={[0, H / 2, ROOM.maxZ + 0.05]} color="#e9eddf" shadow={false} />
      <Box size={[0.1, H, D]} position={[ROOM.minX - 0.05, H / 2, 0]} color="#e9eddf" shadow={false} />
      <Box size={[0.1, H, D]} position={[ROOM.maxX + 0.05, H / 2, 0]} color="#e9eddf" shadow={false} />
      {[-4.5, 0, 4.5].map((x) => [-3, 3].map((z) => (
        <Box key={`${x}${z}`} size={[1.8, 0.04, 0.6]} position={[x, H - 0.03, z]} color="#fffdf5" emissive="#fff6dc" emissiveIntensity={1.2} shadow={false} />
      )))}
      {[-4, 0, 4].map((x) => (
        <Box key={x} size={[1.6, 1.4, 0.04]} position={[x, 2.3, ROOM.maxZ - 0.02]} color="#bfe3f5" emissive="#a6d8f0" emissiveIntensity={0.6} shadow={false} />
      ))}
      <Sign text="BIOLOGY LAB" position={[-2.5, 3.3, ROOM.minZ + 0.02]} />

      {/* back benches */}
      <Bench position={[-5, 0, -6.2]} size={[3.4, 1.1]} />
      <Bench position={[0, 0, -6.2]} size={[3.4, 1.1]} />
      <Bench position={[5, 0, -6.2]} size={[3.4, 1.1]} />

      <Hit id="microscope-station">
        <Microscope position={[-5, 0.91, -6.1]} />
        {[-5.8, -5.6, -4.3].map((x, i) => <Box key={x} size={[0.12, 0.005, 0.04]} position={[x, 0.915, -5.9 + i * 0.05]} color={C.glass} transparent opacity={0.7} />)}
      </Hit>

      <Hit id="genetics-station">
        {[...Array(5)].map((_, i) => <PeaPlant key={i} position={[-1.2 + i * 0.3, 0.91, -6.35]} h={i % 2 ? 0.25 : 0.45} />)}
        <Box size={[0.6, 0.05, 0.3]} position={[0.9, 0.93, -6.1]} color={C.wood} />
        {[...Array(12)].map((_, i) => (
          <mesh key={i} position={[0.68 + (i % 6) * 0.08, 1.0, -6.17 + Math.floor(i / 6) * 0.12]}>
            <cylinderGeometry args={[0.025, 0.025, 0.12, 8]} />
            <Mat color={C.glass} transparent opacity={0.55} />
          </mesh>
        ))}
      </Hit>

      <Hit id="enzyme-station">
        {[4.3, 5.2].map((x) => (
          <group key={x}>
            <Box size={[0.7, 0.25, 0.45]} position={[x, 1.04, -6.2]} color={C.steel} />
            <Box size={[0.64, 0.01, 0.4]} position={[x, 1.17, -6.2]} color="#7cc4e0" />
          </group>
        ))}
        <Beaker position={[6.0, 0.91, -6.1]} liquid="#e8e4dc" />
        <Box size={[0.5, 0.05, 0.05]} position={[6.0, 1.25, -6.2]} color={C.glass} transparent opacity={0.6} />
      </Hit>

      <Hit id="osmosis-station">
        <Bench position={[-8.3, 0, -1]} size={[1.2, 2.4]} />
        <Box size={[0.2, 0.08, 1.2]} position={[-8.2, 0.95, -1]} color={C.wood} />
        {[...Array(5)].map((_, i) => (
          <mesh key={i} position={[-8.2, 1.05, -1.45 + i * 0.22]}>
            <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
            <Mat color={C.glass} transparent opacity={0.5} />
          </mesh>
        ))}
        <Box size={[0.06, 0.06, 0.06]} position={[-8.1, 0.94, -0.1]} color="#f1e1a8" />
      </Hit>

      <Hit id="photosynthesis-station">
        <Bench position={[-2.5, 0, 2]} size={[2, 1]} />
        <Box size={[0.5, 0.4, 0.3]} position={[-2.5, 1.11, 2]} color="#bfe3f5" transparent opacity={0.35} />
        <Pondweed />
        <group position={[-1.8, 0.91, 2]}>
          <Box size={[0.03, 0.4, 0.03]} position={[0, 0.2, 0]} color="#333" />
          <mesh position={[-0.08, 0.42, 0]} rotation={[0, 0, Math.PI / 2.4]}>
            <coneGeometry args={[0.09, 0.14, 10, 1, true]} />
            <Mat color="#c0392b" side={THREE.DoubleSide} />
          </mesh>
          <pointLight position={[-0.12, 0.4, 0]} intensity={0.5} distance={1.5} color="#fff3c4" />
        </group>
      </Hit>

      <Hit id="microbiology-station">
        <Bench position={[-8.3, 0, 4.5]} size={[1.2, 2.4]} />
        <Box size={[0.8, 0.7, 0.7]} position={[-8.35, 1.26, 5.2]} color="#f2f1ec" />
        <Box size={[0.02, 0.55, 0.55]} position={[-7.94, 1.26, 5.2]} color={C.steel} />
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[-8.1, 0.93, 3.7 + i * 0.25]}>
            <cylinderGeometry args={[0.09, 0.09, 0.02, 14]} />
            <Mat color="#e9dca0" transparent opacity={0.85} />
          </mesh>
        ))}
      </Hit>

      <Hit id="ecology-station">
        <Box size={[2.2, 0.7, 1.2]} position={[3, 0.35, 5.2]} color={C.wood} />
        <Box size={[2.2, 0.8, 1.2]} position={[3, 1.1, 5.2]} color={C.glass} transparent opacity={0.22} />
        <Box size={[2.1, 0.1, 1.1]} position={[3, 0.75, 5.2]} color="#8a7a4e" />
        {[[-0.6, 0.2], [0.2, -0.3], [0.7, 0.25]].map(([x, z]) => (
          <mesh key={x} position={[3 + x, 0.98, 5.2 + z]}>
            <coneGeometry args={[0.15, 0.4, 6]} />
            <Mat color="#3f7d3a" />
          </mesh>
        ))}
      </Hit>

      <Hit id="door-chem-from-bio">
        <Door position={[ROOM.maxX - 0.05, 0, 3]} rotation={[0, -Math.PI / 2, 0]} label="CHEMISTRY LAB" />
      </Hit>
    </group>
  )
}

export const biologyLab: Room = {
  id: 'biology-lab',
  name: 'Biology Lab',
  bounds: ROOM,
  colliders: COLLIDERS,
  interactables: INTERACTABLES,
  spawn: { position: [7.6, 1.6, 3], yaw: Math.PI / 2 },
  Scene: BiologyLabScene,
}
