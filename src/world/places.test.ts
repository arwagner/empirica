import { vi } from 'vitest'

vi.mock('@react-three/fiber', () => ({ useFrame: () => {} }))

import { BUILDING } from './building'
import { PLACES } from './places'

test('the scene-free list of places has every room and station the building has', () => {
  const summary = (rooms: { id: string; name: string; interactables: { id: string }[] }[]) =>
    rooms.map((r) => ({ id: r.id, name: r.name, ids: r.interactables.map((i) => i.id) }))
  expect(summary(PLACES)).toEqual(summary(BUILDING.rooms))
})
