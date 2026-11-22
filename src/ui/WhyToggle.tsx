import { useState } from 'react'
import { explain, type Explanation, type Level } from '../core'
import './why.css'

/** A "Why?" button that reveals the engine's explanation of an observation, at the chosen level. */
export function WhyToggle({ why, level }: { why: Explanation; level: Level }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="why">
      <button className="why-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Why?'}</button>
      {open && <span className="why-text" role="note">{explain(why, level)}</span>}
    </span>
  )
}
