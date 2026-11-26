/**
 * Walking the lab by touch, with nothing drawn on screen. You move the world under your fingers:
 * - one finger drags the floor: drag down to walk forward, drag sideways to step the other way;
 * - two fingers twist like a steering wheel to turn (clockwise turns right), and slide up or down together to look down or up;
 * - a quick tap that barely moves is a tap: use whatever is under the finger.
 *
 * Pure input bookkeeping: feed it pointer events, read back what they mean. The Player applies it.
 */

/** Metres walked per pixel of one-finger drag. */
export const METRES_PER_PX = 0.01
/** Radians of look up/down per pixel the two fingers slide together. */
export const PITCH_PER_PX = 0.005
/** A touch that wanders further than this (px) is a drag, not a tap. */
export const TAP_SLOP_PX = 10
/** A touch held longer than this (ms) is not a tap. */
export const TAP_MS = 500

export interface TouchPoint {
  id: number
  x: number
  y: number
  /** Milliseconds, any clock. */
  t: number
}

/** What one pointer event asks the player to do. All zero / null when it asks nothing. */
export interface TouchIntent {
  /** Metres to walk along the view direction (positive is forward). */
  forward: number
  /** Metres to step sideways (positive is right). */
  strafe: number
  /** Radians to add to yaw (positive turns left, as in three.js). */
  yaw: number
  /** Radians to add to pitch (positive looks up). */
  pitch: number
  /** A finished tap at this screen point. */
  tap: { x: number; y: number } | null
}

const none = (): TouchIntent => ({ forward: 0, strafe: 0, yaw: 0, pitch: 0, tap: null })

/** Wrap an angle difference into (-π, π], so a twist across the ±π seam isn't a full turn. */
function wrap(a: number) {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a <= -Math.PI) a += 2 * Math.PI
  return a
}

interface Finger {
  x: number
  y: number
  startX: number
  startY: number
  startT: number
  /** Still a candidate tap: one finger, hasn't wandered, not part of a two-finger gesture. */
  tap: boolean
}

export class TouchWalk {
  private fingers = new Map<number, Finger>()

  /** Fingers currently down. */
  get count() {
    return this.fingers.size
  }

  down(p: TouchPoint): TouchIntent {
    // A second finger turns the gesture into a twist: nobody meant to tap.
    for (const f of this.fingers.values()) f.tap = false
    this.fingers.set(p.id, { x: p.x, y: p.y, startX: p.x, startY: p.y, startT: p.t, tap: this.fingers.size === 0 })
    return none()
  }

  move(p: TouchPoint): TouchIntent {
    const f = this.fingers.get(p.id)
    const out = none()
    if (!f) return out
    if (Math.hypot(p.x - f.startX, p.y - f.startY) > TAP_SLOP_PX) f.tap = false
    const down = [...this.fingers.entries()]
    if (down.length === 1) {
      // Drag-the-floor: until it's clearly a drag, a jittery tap shouldn't walk you anywhere.
      if (!f.tap) {
        out.forward = (p.y - f.y) * METRES_PER_PX
        out.strafe = (f.x - p.x) * METRES_PER_PX
      }
    } else if (down.length >= 2) {
      // Only the first two fingers steer; a third is ignored.
      const [[idA, a], [idB, b]] = down
      if (p.id === idA || p.id === idB) {
        const other = p.id === idA ? b : a
        const before = Math.atan2(other.y - f.y, other.x - f.x)
        const after = Math.atan2(other.y - p.y, other.x - p.x)
        // Screen y points down, so a clockwise twist grows the angle; turning right lowers yaw.
        out.yaw = -wrap(after - before)
        // The midpoint moves by half of this finger's move.
        out.pitch = ((p.y - f.y) / 2) * PITCH_PER_PX
      }
    }
    f.x = p.x
    f.y = p.y
    return out
  }

  up(p: TouchPoint): TouchIntent {
    const f = this.fingers.get(p.id)
    this.fingers.delete(p.id)
    const out = none()
    if (f?.tap && p.t - f.startT <= TAP_MS && Math.hypot(p.x - f.startX, p.y - f.startY) <= TAP_SLOP_PX) out.tap = { x: p.x, y: p.y }
    return out
  }

  /** The browser took the touch away (a system gesture, a scroll): forget it, no tap. */
  cancel(id: number) {
    this.fingers.delete(id)
  }

  /** Drop every finger, e.g. when walking stops. */
  reset() {
    this.fingers.clear()
  }
}

/**
 * Take this frame's share of a pending drag walk: all of it, or `max` metres of it if it's longer
 * (a drag is a distance, not a speed; capping it stops a long flick tunnelling through a wall).
 * Returns the step and what's left over for later frames.
 */
export function takeStep(pending: { forward: number; strafe: number }, max: number) {
  const len = Math.hypot(pending.forward, pending.strafe)
  const k = len > max ? max / len : 1
  const step = { forward: pending.forward * k, strafe: pending.strafe * k }
  return { step, rest: { forward: pending.forward - step.forward, strafe: pending.strafe - step.strafe } }
}

/** A screen point as normalized device coordinates (-1..1, y up) of the element occupying `rect`. */
export function toNdc(x: number, y: number, rect: { left: number; top: number; width: number; height: number }) {
  return { x: ((x - rect.left) / rect.width) * 2 - 1, y: -((y - rect.top) / rect.height) * 2 + 1 }
}
