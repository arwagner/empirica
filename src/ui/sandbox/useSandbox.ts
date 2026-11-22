import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { AnyDomain, LabEvent } from '../../core'

export interface Sandbox {
  state: unknown
  /**
   * Apply an action. Invalid actions don't throw: they come back as an error message.
   * `quiet` logs only observations (for background ticks like a running clock).
   */
  apply: (action: unknown, opts?: { quiet?: boolean }) => { state: unknown; events: LabEvent[]; error?: string }
  reset: () => void
  domain: AnyDomain
}

interface Options {
  /** Resume from a saved state instead of building `setup` afresh. */
  initialState?: unknown
  /** Called with every new state (to remember the bench between visits). */
  onState?: (state: unknown) => void
}

/** A live session of one domain's engine. Every event is passed to `onEvents` (the notebook). */
export function useSandbox(domain: AnyDomain, setup: unknown, onEvents?: (events: LabEvent[]) => void, opts: Options = {}): Sandbox {
  const [state, setState] = useState(() => opts.initialState ?? domain.engine.create(setup))
  const onState = useRef(opts.onState)
  const ref = useRef(state)
  const sink = useRef(onEvents)
  useLayoutEffect(() => {
    sink.current = onEvents
    onState.current = opts.onState
  })

  const apply = useCallback((action: unknown, opts?: { quiet?: boolean }) => {
    try {
      const r = domain.engine.apply(ref.current, action)
      ref.current = r.state
      setState(r.state)
      onState.current?.(r.state)
      const logged = opts?.quiet ? r.events.filter((e) => e.kind !== 'action') : r.events
      if (logged.length) sink.current?.(logged)
      return r
    } catch (err) {
      return { state: ref.current, events: [], error: err instanceof Error ? err.message : String(err) }
    }
  }, [domain])

  const reset = useCallback(() => {
    const s = domain.engine.create(setup)
    ref.current = s
    setState(s)
    onState.current?.(s)
  }, [domain, setup])

  return { state, apply, reset, domain }
}
