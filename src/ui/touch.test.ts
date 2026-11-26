import { act, renderHook } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { hitRadius, isTouch, TAP_PX, TOUCH_QUERY, useHitRadius, useTouch } from './touch'

/** Stub matchMedia so TOUCH_QUERY matches (or not); returns a way to flip it and fire 'change'. */
function stubTouch(matches: boolean) {
  const listeners = new Set<() => void>()
  const mql = {
    get matches() { return matches },
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  }
  vi.stubGlobal('matchMedia', (q: string) => (q === TOUCH_QUERY ? mql : { matches: false, addEventListener() {}, removeEventListener() {} }))
  return (m: boolean) => {
    matches = m
    listeners.forEach((l) => l())
  }
}

afterEach(() => vi.unstubAllGlobals())

test('isTouch follows the touch media query, and is false where there is none', () => {
  expect(isTouch()).toBe(false) // jsdom has no matchMedia
  stubTouch(true)
  expect(isTouch()).toBe(true)
  stubTouch(false)
  expect(isTouch()).toBe(false)
})

test('useTouch updates when the device changes', () => {
  const flip = stubTouch(false)
  const { result } = renderHook(() => useTouch())
  expect(result.current).toBe(false)
  act(() => flip(true))
  expect(result.current).toBe(true)
})

test('hitRadius makes a tap target TAP_PX across on screen, only on touch', () => {
  // A 900-unit drawing shown 330px wide: 22px is 60 units.
  expect(hitRadius(900, 330, true)).toBe(60)
  expect(hitRadius(900, 900, true)).toBe(TAP_PX / 2)
  expect(hitRadius(900, 330, false)).toBe(0)
  expect(hitRadius(900, 0, true)).toBe(0)
})

test('useHitRadius measures the drawing on touch screens', () => {
  stubTouch(true)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.getBoundingClientRect = () => ({ width: 450 }) as DOMRect
  const { result } = renderHook(() => useHitRadius({ current: svg }, 900))
  expect(result.current).toBe(44)
})

test('useHitRadius is 0 with a mouse', () => {
  stubTouch(false)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.getBoundingClientRect = () => ({ width: 450 }) as DOMRect
  const { result } = renderHook(() => useHitRadius({ current: svg }, 900))
  expect(result.current).toBe(0)
})
