import type { ComponentType } from 'react'

export type Vec3 = [number, number, number]

export interface StationView {
  center: Vec3
  /** Outward directions (x/z) it can be used from; the fly-in picks the player's side. */
  faces: Vec3[]
  distance: number
  height: number
  targetY: number
}

/** Something in the world you can aim at and press E on. */
export interface Interactable {
  id: string
  kind: 'station' | 'door'
  name: string
  blurb: string
  /** Stations: which domain's workspace opens here. */
  domain?: string
  /** A point on the object (used to place prompts/labels). */
  marker: Vec3
  /** Stations only: how the camera frames it on the way in. */
  view?: StationView
  /** Stations only: the domain setup for free play here (glassware laid out, etc.). */
  setup?: unknown
  /** Doors only: walking through takes you to this room, standing here. */
  leadsTo?: { room: string; spawn: Spawn }
  /** Built but not usable yet: pressing E explains instead of entering. */
  comingSoon?: boolean
}

export interface Spawn { position: Vec3; yaw: number }

export interface Collider { minX: number; maxX: number; minZ: number; maxZ: number }

/** A room of the lab building: geometry, walkable area, and what's interactive in it. */
export interface Room {
  id: string
  name: string
  bounds: Collider & { height: number }
  colliders: Collider[]
  interactables: Interactable[]
  spawn: Spawn
  Scene: ComponentType
}

/** The whole lab: every room, by id. */
export interface Building {
  rooms: Room[]
  start: string
}
