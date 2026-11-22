import { createContext, useContext } from 'react'
import type { LabEvent, Level, Notebook } from '../core'

export interface LabSession {
  level: Level
  setLevel: (l: Level) => void
  notebook: Notebook
  /** Log engine events into the session notebook. */
  log: (events: LabEvent[]) => void
  note: (text: string) => void
}

export const SessionContext = createContext<LabSession | null>(null)
export function useLabSession() {
  const s = useContext(SessionContext)
  if (!s) throw new Error('useLabSession outside LabSessionProvider')
  return s
}
