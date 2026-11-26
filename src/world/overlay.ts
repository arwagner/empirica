import type { Mode } from './Player'

/** What the lab view shows over the 3D world. */
export interface LabOverlay {
  /** The entry card: the first screen, or paused after the mouse is released. */
  card: 'start' | 'paused' | null
  /** How the card lets you in: capture the mouse to walk, or (on touch, where there's no mouse lock) open the menu. */
  enterBy: 'lock' | 'menu'
  /** The "click or move to look around" prompt after leaving a station. Mouse only: touch has nothing to look with yet. */
  readyPrompt: boolean
  /** The on-screen Menu button: shown whenever you're in the lab view and not walking with the mouse captured. */
  menuButton: boolean
}

/** Decide the lab view's overlays from the world's mode. `peek` (a dev aid) hides the paused card. */
export function labOverlay(mode: Mode, { touch, peek = false }: { touch: boolean; peek?: boolean }): LabOverlay {
  return {
    card: mode === 'start' ? 'start' : mode === 'paused' && !peek ? 'paused' : null,
    enterBy: touch ? 'menu' : 'lock',
    readyPrompt: mode === 'ready' && !touch,
    menuButton: mode === 'start' || mode === 'paused' || mode === 'ready',
  }
}
