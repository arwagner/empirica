import type { Mode } from './Player'

/** What the lab view shows over the 3D world. */
export interface LabOverlay {
  /** The entry card: the first screen, or paused after the mouse is released. */
  card: 'start' | 'paused' | null
  /** How the card lets you in: capture the mouse to walk, or (on touch, where there's no mouse lock) a tap starts touch walking. */
  enterBy: 'lock' | 'tap'
  /** The "click or move to look around" prompt after leaving a station. Mouse only: on touch you're straight back to walking. */
  readyPrompt: boolean
  /** The on-screen Menu button: in the lab view when not walking with the mouse captured. On touch it stays while walking: there's no M key. */
  menuButton: boolean
}

/** Decide the lab view's overlays from the world's mode. `peek` (a dev aid) hides the paused card. */
export function labOverlay(mode: Mode, { touch, peek = false }: { touch: boolean; peek?: boolean }): LabOverlay {
  return {
    card: mode === 'start' ? 'start' : mode === 'paused' && !peek ? 'paused' : null,
    enterBy: touch ? 'tap' : 'lock',
    readyPrompt: mode === 'ready' && !touch,
    menuButton: mode === 'start' || mode === 'paused' || mode === 'ready' || (touch && mode === 'walking'),
  }
}

/**
 * Where you land back in the room, after a station or a menu. With the mouse captured you're walking;
 * a released mouse waits in 'ready' for a click; touch has nothing to capture, so it walks straight away.
 */
export function returnMode({ locked, touch }: { locked: boolean; touch: boolean }): 'walking' | 'ready' {
  return locked || touch ? 'walking' : 'ready'
}
