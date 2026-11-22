import { useCallback, useRef, useState } from 'react'
import { advance, hintFor, isFinished, startRun, type Experiment, type GuidedRun } from '../../core'
import type { Sandbox } from '../sandbox/useSandbox'

export interface Guided {
  experiment: Experiment
  run: GuidedRun
  finished: boolean
  /** Steps completed by the most recent action (to explain them). */
  justCompleted: number[]
  hint: string | null
  /** Use instead of sandbox.apply so progress is tracked. */
  apply: Sandbox['apply']
  showHint: () => void
  showMe: () => void
  restart: () => void
}

/** Layers a guided experiment over a sandbox. Steps complete when the engine state satisfies them. */
export function useGuided(sandbox: Sandbox, experiment: Experiment): Guided {
  const [run, setRunState] = useState(() => startRun(experiment))
  const runRef = useRef(run)
  const [justCompleted, setJust] = useState<number[]>([])
  const [hint, setHint] = useState<string | null>(null)

  const setRun = useCallback((r: GuidedRun) => {
    runRef.current = r
    setRunState(r)
  }, [])

  /** Re-check steps against a new engine state. */
  const track = useCallback(
    (state: unknown, base: GuidedRun) => {
      const r = advance(sandbox.domain, experiment, base, state)
      if (r.completed.length) {
        setHint(null)
        setJust(r.completed)
      }
      setRun(r.run)
    },
    [sandbox.domain, experiment, setRun],
  )

  const apply = useCallback<Sandbox['apply']>(
    (action, opts) => {
      const r = sandbox.apply(action, opts)
      if (!r.error) track(r.state, runRef.current)
      return r
    },
    [sandbox, track],
  )

  const showHint = useCallback(() => {
    const cur = runRef.current
    setHint(hintFor(sandbox.domain, experiment, cur, sandbox.state) ?? 'Read the instruction again: what does it ask you to change?')
    setRun({ ...cur, hintsUsed: cur.hintsUsed + 1 })
  }, [sandbox, experiment, setRun])

  const showMe = useCallback(() => {
    const cur = runRef.current
    const step = experiment.steps[cur.current]
    if (!step) return
    let state = sandbox.state
    for (const a of step.action) {
      const r = sandbox.apply(a)
      if (r.error) break
      state = r.state
    }
    track(state, { ...cur, assisted: cur.assisted + 1 })
  }, [sandbox, experiment, track])

  const restart = useCallback(() => {
    sandbox.reset()
    setRun(startRun(experiment))
    setJust([])
    setHint(null)
  }, [sandbox, experiment, setRun])

  return { experiment, run, finished: isFinished(experiment, run), justCompleted, hint, apply, showHint, showMe, restart }
}
