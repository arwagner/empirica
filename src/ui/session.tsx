import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { addNote, createNotebook, LEVELS, record, type LabEvent, type Level } from '../core'
import { SessionContext } from './useLabSession'

const LEVEL_KEY = 'empirica.level'

function storedLevel(): Level {
  try {
    const v = localStorage.getItem(LEVEL_KEY)
    return (LEVELS as readonly string[]).includes(v ?? '') ? (v as Level) : 'simple'
  } catch {
    return 'simple'
  }
}

export function LabSessionProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<Level>(storedLevel)
  const [started] = useState(() => new Date())
  const [notebook, setNotebook] = useState(() => createNotebook({ title: 'Lab session', domain: 'lab' }, started))
  const elapsed = useCallback(() => Date.now() - started.getTime(), [started])

  const setLevel = useCallback((l: Level) => {
    setLevelState(l)
    try {
      localStorage.setItem(LEVEL_KEY, l)
    } catch {
      /* private mode etc: the choice just won't persist */
    }
  }, [])
  const log = useCallback((events: LabEvent[]) => setNotebook((nb) => record(nb, events, elapsed())), [elapsed])
  const note = useCallback((text: string) => setNotebook((nb) => addNote(nb, text, elapsed())), [elapsed])

  const value = useMemo(() => ({ level, setLevel, notebook, log, note }), [level, setLevel, notebook, log, note])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
