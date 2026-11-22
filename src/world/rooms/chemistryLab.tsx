import { useMemo } from 'react'
import { C } from '../palette'
import { Beaker, Box, Door, Flame, Flask, Hit, Mat, Sign } from '../props'
import type { Interactable, Room, Vec3 } from '../types'
import { ChemistryLabDressing, DRESSING_COLLIDERS } from './chemistryLabDressing'

const INTERACTABLES: Interactable[] = [
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

const COLLIDERS = [
  { minX: -2.1, maxX: 2.1, minZ: -1.7, maxZ: -0.3 }, // island bench
  { minX: -5.4, maxX: -2.6, minZ: -6, maxZ: -4.7 }, // fume hood
  { minX: 6.5, maxX: 8, minZ: -2.2, maxZ: 0.2 }, // flame station
  { minX: -8, maxX: -7.3, minZ: -5, maxZ: 1 }, // shelves
  { minX: 1.8, maxX: 3.4, minZ: -6, maxZ: -5.3 }, // sink
]
const ROOM = { minX: -8, maxX: 8, minZ: -6, maxZ: 6, height: 3.6 }

const BOTTLE_COLORS = ['#c0392b', '#e1a32a', '#2e86ab', '#7b9e3e', '#8e5ea2', '#f4f1e8', '#3a3a3a', '#d26a4c']

function Shelves() {
  const bottles = useMemo(() => {
    const out: { p: Vec3; c: string; h: number }[] = []
    let k = 0
    for (let shelf = 0; shelf < 4; shelf++)
      for (let i = 0; i < 14; i++) {
        k = (k * 7 + 3) % 97
        out.push({ p: [-7.6, 0.44 + shelf * 0.55, -4.6 + i * 0.4], c: BOTTLE_COLORS[k % BOTTLE_COLORS.length], h: 0.16 + (k % 4) * 0.04 })
      }
    return out
  }, [])
  return (
    <group>
      <Box size={[0.08, 2.4, 6]} position={[-7.94, 1.2, -2]} color={C.wood} />
      {[-5, 1].map((z) => <Box key={z} size={[0.6, 2.4, 0.06]} position={[-7.65, 1.2, z]} color={C.wood} />)}
      {[0, 1, 2, 3].map((s) => (
        <Box key={s} size={[0.62, 0.04, 5.9]} position={[-7.65, 0.42 + s * 0.55, -2]} color={C.trim} />
      ))}
      {bottles.map((b, i) => (
        <mesh key={i} position={[b.p[0], b.p[1] + b.h / 2, b.p[2]]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, b.h, 6]} />
          <Mat color={b.c} />
        </mesh>
      ))}
    </group>
  )
}

function ChemistryLabScene() {
  const W = ROOM.maxX - ROOM.minX
  const D = ROOM.maxZ - ROOM.minZ
  const H = ROOM.height
  return (
    <group>
      <hemisphereLight args={['#fff8ec', '#a89a80', 1.3]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 3.4, 4]} intensity={0.9} castShadow shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={7} shadow-camera-bottom={-7} />

      {/* shell */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <Mat color={C.floor} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, H, 0]}>
        <planeGeometry args={[W, D]} />
        <Mat color={C.ceiling} emissive={C.ceiling} emissiveIntensity={0.35} />
      </mesh>
      <Box size={[W, H, 0.1]} position={[0, H / 2, ROOM.minZ - 0.05]} color={C.wall} shadow={false} />
      <Box size={[W, H, 0.1]} position={[0, H / 2, ROOM.maxZ + 0.05]} color={C.wall} shadow={false} />
      <Box size={[0.1, H, D]} position={[ROOM.minX - 0.05, H / 2, 0]} color={C.wall} shadow={false} />
      <Box size={[0.1, H, D]} position={[ROOM.maxX + 0.05, H / 2, 0]} color={C.wall} shadow={false} />
      {[-4, 0, 4].map((x) =>
        [-3, 2].map((z) => <Box key={`${x}${z}`} size={[1.8, 0.04, 0.6]} position={[x, H - 0.03, z]} color="#fffdf5" emissive="#fff6dc" emissiveIntensity={1.2} shadow={false} />),
      )}
      {/* windows */}
      {[-1, 1.2].map((z) => (
        <Box key={z} size={[0.04, 1.4, 1.6]} position={[ROOM.minX + 0.02, 2.1, z + 2]} color="#bfe3f5" emissive="#a6d8f0" emissiveIntensity={0.6} shadow={false} />
      ))}
      <Sign text="CHEMISTRY LAB" position={[0, 3.0, ROOM.minZ + 0.02]} />

      {/* wet bench island */}
      <Hit id="wet-bench">
        <Box size={[4, 0.85, 1.2]} position={[0, 0.425, -1]} color={C.cabinet} />
        <Box size={[4.2, 0.06, 1.35]} position={[0, 0.88, -1]} color={C.benchTop} />
        <Box size={[3.6, 0.04, 0.3]} position={[0, 1.5, -1]} color={C.trim} />
        {[-1.6, 1.6].map((x) => <Box key={x} size={[0.05, 0.6, 0.05]} position={[x, 1.2, -1]} color={C.steel} />)}
        <Beaker position={[-1.2, 0.91, -0.8]} liquid="#e74c3c" />
        <Beaker position={[-0.9, 0.91, -1.1]} liquid="#3498db" h={0.22} />
        <Flask position={[-0.3, 0.91, -0.9]} liquid="#f1c40f" />
        <Flask position={[0.4, 0.91, -1.15]} liquid="#9b59b6" />
        <Box size={[0.4, 0.08, 0.35]} position={[1.1, 0.95, -0.95]} color="#555" />
        <Box size={[0.3, 0.02, 0.3]} position={[1.1, 1.0, -0.95]} color="#c33" emissive="#a11" emissiveIntensity={0.4} />
        {[0, 1, 2, 3, 4].map((i) => <Beaker key={i} position={[-1.4 + i * 0.25, 1.52, -1]} liquid={BOTTLE_COLORS[i]} h={0.14} />)}
      </Hit>

      {/* fume hood */}
      <Hit id="fume-hood">
        <Box size={[2.6, 0.9, 1.1]} position={[-4, 0.45, -5.35]} color={C.cabinet} />
        <Box size={[2.7, 0.06, 1.15]} position={[-4, 0.93, -5.35]} color={C.benchTop} />
        <Box size={[2.7, 1.4, 0.1]} position={[-4, 1.65, -5.85]} color={C.steel} />
        <Box size={[0.08, 1.4, 1.1]} position={[-5.31, 1.65, -5.35]} color={C.steel} />
        <Box size={[0.08, 1.4, 1.1]} position={[-2.69, 1.65, -5.35]} color={C.steel} />
        <Box size={[2.7, 0.6, 1.15]} position={[-4, 2.65, -5.35]} color={C.steel} />
        <Box size={[2.5, 0.8, 0.03]} position={[-4, 1.95, -4.82]} color={C.glass} transparent opacity={0.3} />
        <Box size={[0.5, 1.2, 0.5]} position={[-4, H - 0.6, -5.4]} color={C.steel} />
        <Flask position={[-4.4, 0.96, -5.4]} liquid="#7bd389" />
        <Beaker position={[-3.6, 0.96, -5.3]} liquid="#d9d9d9" />
      </Hit>

      {/* flame test station */}
      <Hit id="flame-station">
        <Box size={[1.4, 0.9, 2.3]} position={[7.25, 0.45, -1]} color={C.cabinet} />
        <Box size={[1.5, 0.06, 2.4]} position={[7.25, 0.93, -1]} color={C.benchTop} />
        <mesh position={[7.2, 1.06, -1]}>
          <cylinderGeometry args={[0.03, 0.06, 0.2, 7]} />
          <Mat color={C.steel} metalness={0.5} />
        </mesh>
        <Flame position={[7.2, 1.16, -1]} />
        {['#ff3b30', '#ffcc00', '#34c759', '#af52de'].map((c, i) => (
          <Beaker key={c} position={[7.3, 0.96, -1.8 + i * 0.18 + (i > 1 ? 1.1 : 0)]} liquid={c} h={0.1} />
        ))}
      </Hit>

      <Shelves />
      {/* sink */}
      <Box size={[1.6, 0.9, 0.7]} position={[2.6, 0.45, -5.65]} color={C.cabinet} />
      <Box size={[1.6, 0.06, 0.72]} position={[2.6, 0.92, -5.65]} color={C.steel} />

      <Hit id="door-bio"><Door position={[ROOM.minX + 0.05, 0, 3]} rotation={[0, Math.PI / 2, 0]} label="BIOLOGY LAB" /></Hit>
      <Hit id="door-phys"><Door position={[ROOM.maxX - 0.05, 0, 3]} rotation={[0, -Math.PI / 2, 0]} label="PHYSICS HALL" /></Hit>
      <Hit id="door-obs"><Door position={[5, 0, ROOM.minZ + 0.05]} rotation={[0, 0, 0]} label="OBSERVATORY ↑" /></Hit>

      <ChemistryLabDressing />
    </group>
  )
}

export const chemistryLab: Room = {
  id: 'chemistry-lab',
  name: 'Chemistry Lab',
  bounds: ROOM,
  colliders: [...COLLIDERS, ...DRESSING_COLLIDERS],
  interactables: INTERACTABLES,
  spawn: { position: [0, 1.6, 4], yaw: 0 },
  Scene: ChemistryLabScene,
}
