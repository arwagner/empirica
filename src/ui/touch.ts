import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

/**
 * The lab's one touch signal: the main pointer is a finger, which can't hover.
 * The same query is spelled out in CSS (`@media (hover: none) and (pointer: coarse)`); keep them in step.
 */
export const TOUCH_QUERY = '(hover: none) and (pointer: coarse)'

/** Smallest tap target on a touch screen, in CSS pixels. */
export const TAP_PX = 44

const query = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(TOUCH_QUERY) : null)

/** True on a touch-first device. False where media queries aren't available (tests, server). */
export function isTouch(): boolean {
  return query()?.matches ?? false
}

function subscribe(onChange: () => void) {
  const q = query()
  q?.addEventListener('change', onChange)
  return () => q?.removeEventListener('change', onChange)
}

/** `isTouch()`, kept current if the device changes (e.g. a tablet docks a mouse). */
export function useTouch(): boolean {
  return useSyncExternalStore(subscribe, isTouch, () => false)
}

/**
 * Radius, in SVG user units, of an invisible hit area `TAP_PX` across on screen,
 * for a drawing `viewBoxWidth` units wide shown `renderedWidth` pixels wide.
 * 0 off touch (the drawn shape is target enough for a mouse) or before the drawing has a size.
 */
export function hitRadius(viewBoxWidth: number, renderedWidth: number, touch: boolean): number {
  if (!touch || renderedWidth <= 0) return 0
  return Math.round(((TAP_PX / 2) * viewBoxWidth) / renderedWidth)
}

/** `hitRadius` for a live SVG, kept current as it resizes. */
export function useHitRadius(svg: RefObject<SVGSVGElement | null>, viewBoxWidth: number): number {
  const touch = useTouch()
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = svg.current
    if (!el || !touch) return
    const measure = () => setWidth(el.getBoundingClientRect().width)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [svg, touch])
  return hitRadius(viewBoxWidth, width, touch)
}
