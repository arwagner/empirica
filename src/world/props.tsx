/** Low-poly building blocks shared by every room. */
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { C } from './palette'
import type { Vec3 } from './types'


export function Mat({ color, ...p }: { color: string } & Partial<THREE.MeshStandardMaterialParameters>) {
  return <meshStandardMaterial color={color} flatShading roughness={0.85} {...p} />
}

export function Box({ size, position, color, shadow = true, ...p }: { size: Vec3; position: Vec3; color: string; shadow?: boolean; transparent?: boolean; opacity?: number; emissive?: string; emissiveIntensity?: number }) {
  return (
    <mesh position={position} castShadow={shadow} receiveShadow>
      <boxGeometry args={size} />
      <Mat color={color} {...p} />
    </mesh>
  )
}

export function Beaker({ position, liquid, h = 0.18 }: { position: Vec3; liquid: string; h?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, h, 8, 1, true]} />
        <Mat color={C.glass} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, h * 0.3, 0]}>
        <cylinderGeometry args={[0.065, 0.065, h * 0.6, 8]} />
        <Mat color={liquid} transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

export function Flask({ position, liquid }: { position: Vec3; liquid: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.11, 0.2, 7]} />
        <Mat color={liquid} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.12, 6]} />
        <Mat color={C.glass} transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

export function Sign({ text, position, rotation = [0, 0, 0] }: { text: string; position: Vec3; rotation?: Vec3 }) {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 128
    const g = c.getContext('2d')!
    g.fillStyle = '#2f5d55'
    g.fillRect(0, 0, 512, 128)
    g.fillStyle = '#f4efe4'
    g.font = 'bold 54px system-ui, sans-serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText(text, 256, 66)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [text])
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[1.6, 0.4]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  )
}

export function Door({ position, rotation, label }: { position: Vec3; rotation: Vec3; label: string }) {
  return (
    <group position={position} rotation={rotation}>
      <Box size={[1.3, 2.3, 0.08]} position={[0, 1.15, 0]} color={C.door} />
      <Box size={[0.3, 0.5, 0.09]} position={[0, 1.55, 0.01]} color={C.glass} />
      <mesh position={[0.45, 1.05, 0.08]}>
        <sphereGeometry args={[0.05, 6, 4]} />
        <Mat color={C.steel} metalness={0.6} />
      </mesh>
      <Sign text={label} position={[0, 2.6, 0.05]} />
    </group>
  )
}

export function Flame({ position }: { position: Vec3 }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.scale.set(1, 1 + Math.sin(t * 17) * 0.12 + Math.sin(t * 7.3) * 0.08, 1)
  })
  return (
    <group position={position}>
      <mesh ref={ref} position={[0, 0.09, 0]}>
        <coneGeometry args={[0.035, 0.18, 6]} />
        <meshStandardMaterial color="#6fa8ff" emissive="#3d7dff" emissiveIntensity={2} transparent opacity={0.85} />
      </mesh>
      <pointLight color="#8ab4ff" intensity={0.6} distance={2} />
    </group>
  )
}

/** Wraps scene objects so the player's crosshair ray can identify them. */
export function Hit({ id, children }: { id: string; children: ReactNode }) {
  return <group userData={{ interactId: id }}>{children}</group>
}

