import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { C } from '../palette'
import { Box, Mat, Sign } from '../props'
import type { Vec3 } from '../types'

/** A canvas-drawn texture, made once. */
function useCanvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    if (g) draw(g)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
    // draw is a static description; redrawing on identity change isn't wanted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h])
}

// Group block colors for the poster: s-block, p-block, d-block, f-block, noble gases.
const BLOCK = (col: number, row: number) =>
  col === 17 ? '#8fb8de' : col < 2 ? '#e8a87c' : col >= 12 ? '#c3d89a' : row >= 7 ? '#d8b4e2' : '#f2d388'
const PT_LAYOUT: [number, number][] = (() => {
  const cells: [number, number][] = []
  const rowCols = [[0, 17], [0, 1, 12, 13, 14, 15, 16, 17], [0, 1, 12, 13, 14, 15, 16, 17]]
  rowCols.forEach((cols, r) => cols.forEach((c) => cells.push([c, r])))
  for (let r = 3; r < 7; r++) for (let c = 0; c < 18; c++) cells.push([c, r])
  for (let r = 7; r < 9; r++) for (let c = 2; c < 17; c++) cells.push([c, r + 0.3])
  return cells
})()

function PeriodicTable({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  const tex = useCanvasTexture(1024, 600, (g) => {
    g.fillStyle = '#fbf8f0'
    g.fillRect(0, 0, 1024, 600)
    g.fillStyle = '#2f5d55'
    g.font = 'bold 40px system-ui, sans-serif'
    g.fillText('Periodic Table of the Elements', 40, 60)
    const s = 52
    for (const [c, r] of PT_LAYOUT) {
      g.fillStyle = BLOCK(c, Math.floor(r))
      g.fillRect(40 + c * s, 90 + r * s, s - 4, s - 4)
    }
  })
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[2.2, 1.29]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  )
}

function Whiteboard({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  const tex = useCanvasTexture(1024, 512, (g) => {
    g.fillStyle = '#fdfdfb'
    g.fillRect(0, 0, 1024, 512)
    g.strokeStyle = '#c9c9c4'
    g.lineWidth = 10
    g.strokeRect(5, 5, 1014, 502)
    g.font = 'italic 44px "Comic Sans MS", "Marker Felt", cursive'
    g.fillStyle = '#1f4fa8'
    g.fillText('Today: acids & bases!', 50, 90)
    g.fillStyle = '#222'
    g.fillText('HCl + NaOH → NaCl + H₂O', 50, 180)
    g.fillText('pH = −log[H⁺]', 50, 260)
    g.fillStyle = '#c0392b'
    g.fillText('GOGGLES ON 🥽', 50, 360)
    g.fillStyle = '#2e7d32'
    g.fillText('Press M for experiments', 50, 450)
  })
  return (
    <group position={position} rotation={rotation}>
      <Box size={[2.6, 1.4, 0.04]} position={[0, 0, -0.03]} color={C.steel} />
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2.5, 1.25]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      <Box size={[2.4, 0.04, 0.1]} position={[0, -0.68, 0.04]} color={C.steel} />
    </group>
  )
}

function SafetyShower({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <Box size={[0.08, 2.6, 0.08]} position={[0, 1.3, 0]} color="#2e8b57" />
      <Box size={[0.6, 0.06, 0.06]} position={[0.3, 2.55, 0]} color="#2e8b57" />
      <mesh position={[0.6, 2.4, 0]}>
        <coneGeometry args={[0.22, 0.2, 10, 1, true]} />
        <Mat color="#2e8b57" side={THREE.DoubleSide} />
      </mesh>
      <Box size={[0.03, 0.6, 0.03]} position={[0.35, 2.2, 0.05]} color="#ddd" />
      <mesh position={[0.35, 1.88, 0.05]}>
        <torusGeometry args={[0.06, 0.015, 6, 12]} />
        <Mat color="#2e8b57" />
      </mesh>
      {/* eyewash */}
      <Box size={[0.08, 1.0, 0.08]} position={[-0.45, 0.5, 0]} color="#2e8b57" />
      <mesh position={[-0.45, 1.02, 0]}>
        <cylinderGeometry args={[0.18, 0.12, 0.08, 10]} />
        <Mat color="#3cb371" />
      </mesh>
      <Sign text="SAFETY SHOWER" position={[0.1, 3.0, 0.02]} />
    </group>
  )
}

function Extinguisher({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 0.55, 10]} />
        <Mat color="#c62828" />
      </mesh>
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.1, 8]} />
        <Mat color="#222" />
      </mesh>
      <Box size={[0.3, 0.3, 0.02]} position={[0, 1.15, -0.06]} color="#c62828" />
    </group>
  )
}

function CoatHooks({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[1.8, 0.08, 0.06]} position={[0, 1.85, 0]} color={C.wood} />
      {[-0.6, 0, 0.6].map((x, i) => (
        <group key={x} position={[x, 1.2, 0.08]}>
          <Box size={[0.48, 1.1, 0.08]} position={[0, 0, 0]} color="#f6f6f2" />
          <Box size={[0.5, 0.18, 0.1]} position={[0, 0.5, 0.01]} color={i === 1 ? '#e3e3dc' : '#f6f6f2'} />
        </group>
      ))}
    </group>
  )
}

function GogglesRack({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[0.7, 0.5, 0.12]} position={[0, 0, 0]} color={C.cabinet} />
      {[-0.2, 0, 0.2].map((x) => (
        <Box key={x} size={[0.16, 0.08, 0.06]} position={[x, 0.05, 0.08]} color="#9fd3e6" transparent opacity={0.8} />
      ))}
      <Sign text="GOGGLES" position={[0, 0.42, 0.07]} />
    </group>
  )
}

function GlassCabinet({ position, rotation }: { position: Vec3; rotation: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[2.2, 2.2, 0.5]} position={[0, 1.1, 0]} color={C.cabinet} />
      <Box size={[2.0, 1.2, 0.02]} position={[0, 1.55, 0.26]} color={C.glass} transparent opacity={0.25} />
      {[1.2, 1.7].map((y) =>
        [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75].map((x, i) => (
          <mesh key={`${y}${x}`} position={[x, y + (i % 2 ? 0.08 : 0.1), 0.12]}>
            {i % 3 === 0 ? <coneGeometry args={[0.08, 0.18, 7]} /> : <cylinderGeometry args={[0.06, 0.06, i % 2 ? 0.16 : 0.2, 8]} />}
            <Mat color={C.glass} transparent opacity={0.55} />
          </mesh>
        )),
      )}
      <Box size={[2.2, 0.04, 0.48]} position={[0, 1.35, 0.01]} color={C.trim} />
      <Box size={[2.2, 0.04, 0.48]} position={[0, 1.85, 0.01]} color={C.trim} />
    </group>
  )
}

/** A tap over the sink with a slow drip. */
function DrippingTap({ position }: { position: Vec3 }) {
  const drop = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!drop.current) return
    const t = (clock.elapsedTime % 2.2) / 2.2
    drop.current.position.y = t < 0.6 ? -0.02 : -0.02 - ((t - 0.6) / 0.4) ** 2 * 0.3
    drop.current.scale.setScalar(t < 0.6 ? 0.4 + t : 1)
  })
  return (
    <group position={position}>
      <Box size={[0.05, 0.3, 0.05]} position={[0, 0.15, -0.15]} color={C.steel} />
      <Box size={[0.05, 0.05, 0.25]} position={[0, 0.3, -0.04]} color={C.steel} />
      <mesh ref={drop} position={[0, -0.02, 0.06]}>
        <sphereGeometry args={[0.012, 6, 4]} />
        <meshStandardMaterial color="#bfe3f5" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

/** Everything that makes the chemistry lab feel lived-in. Purely decorative. */
export function ChemistryLabDressing() {
  return (
    <group>
      <PeriodicTable position={[7.94, 2.0, -4.4]} rotation={[0, -Math.PI / 2, 0]} />
      <Whiteboard position={[-3, 1.9, 5.94]} rotation={[0, Math.PI, 0]} />
      <SafetyShower position={[6.6, 0, -5.8]} />
      <Extinguisher position={[-7.85, 0, 4.6]} rotation={[0, Math.PI / 2, 0]} />
      <CoatHooks position={[2.4, 0, 5.94]} rotation={[0, Math.PI, 0]} />
      <GogglesRack position={[7.9, 1.5, 4.6]} rotation={[0, -Math.PI / 2, 0]} />
      <GlassCabinet position={[5.6, 0, 5.7]} rotation={[0, Math.PI, 0]} />
      <DrippingTap position={[2.6, 0.95, -5.7]} />
    </group>
  )
}

/** Footprints of the dressing the player shouldn't walk through. */
export const DRESSING_COLLIDERS = [
  { minX: 5.9, maxX: 7.4, minZ: -6, maxZ: -5.4 }, // safety shower + eyewash
  { minX: 4.5, maxX: 6.7, minZ: 5.4, maxZ: 6 }, // glassware cabinet
  { minX: -8, maxX: -7.6, minZ: 4.4, maxZ: 4.8 }, // extinguisher
]
