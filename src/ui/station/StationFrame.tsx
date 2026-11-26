import type { ReactNode } from 'react'
import type { Interactable } from '../../world/types'
import { LevelToggle } from '../shell/LevelToggle'

/** Header + body every 2D station workspace sits in. */
interface Props {
  station: Interactable
  onLeave: () => void
  onNotebook: () => void
  onProfessor: () => void
  children: ReactNode
}

export function StationFrame({ station, onLeave, onNotebook, onProfessor, children }: Props) {
  return (
    <>
      <header>
        <div>
          <h2>{station.name}</h2>
          <p>{station.blurb}</p>
        </div>
        <div className="station-actions">
          <LevelToggle />
          <button onClick={onProfessor}>Ask the professor</button>
          <button onClick={onNotebook}>
            Notebook <kbd>N</kbd>
          </button>
          <button onClick={onLeave}>
            ← Back to lab <kbd>E</kbd>
          </button>
        </div>
      </header>
      <div className="station-body">{children}</div>
    </>
  )
}

/** Stand-in until a station's real workspace exists. */
export function PlaceholderBench() {
  return (
    <svg className="placeholder-bench" viewBox="0 0 800 300" aria-label="Workspace coming soon">
      <rect x="0" y="230" width="800" height="70" fill="var(--bench)" />
      {([['#e74c3c', 120], ['#3498db', 260], ['#f1c40f', 400], ['#9b59b6', 540]] as const).map(([c, x]) => (
        <g key={x} transform={`translate(${x},110)`}>
          <rect x="0" y="40" width="80" height="80" fill={c} opacity="0.75" rx="4" />
          <path d="M0 0 V116 a4 4 0 0 0 4 4 H76 a4 4 0 0 0 4 -4 V0" fill="none" stroke="var(--glass)" strokeWidth="4" />
        </g>
      ))}
      <text x="400" y="60" textAnchor="middle" fill="currentColor" fontSize="20">
        Workspace coming soon
      </text>
    </svg>
  )
}
