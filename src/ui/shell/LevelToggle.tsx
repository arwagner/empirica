import { LEVELS } from '../../core'
import { useLabSession } from '../useLabSession'

const LABEL = { simple: 'Simple', intermediate: 'Intermediate', advanced: 'Advanced' } as const

/** Picks how deep every explanation in the lab goes. */
export function LevelToggle() {
  const { level, setLevel } = useLabSession()
  return (
    <div className="level-toggle" role="radiogroup" aria-label="Explanation level">
      {LEVELS.map((l) => (
        <button key={l} role="radio" aria-checked={level === l} className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>
          {LABEL[l]}
        </button>
      ))}
    </div>
  )
}
