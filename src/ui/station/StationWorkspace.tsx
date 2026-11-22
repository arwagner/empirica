import type { AnyDomain, Experiment } from '../../core'
import { GuidedPanel } from '../guided/GuidedPanel'
import { useGuided, type Guided } from '../guided/useGuided'
import { useSandbox, type Sandbox } from '../sandbox/useSandbox'
import { useLabSession } from '../useLabSession'
import { PlaceholderBench } from './StationFrame'

const EMPTY_SETUP = {}

/** What a domain's bench gets to work with. `apply` routes through the guide when one is active. */
export interface BenchProps {
  sandbox: Sandbox
  apply: Sandbox['apply']
}

interface Props {
  domain: AnyDomain
  /** Free-play setup when no experiment is running. */
  setup?: unknown
  experiment: Experiment | null
  onEndExperiment: () => void
  /** Saved bench state to resume, and a callback to save it. */
  saved?: unknown
  onSave?: (state: unknown) => void
  /** The domain's 2D bench. Until one exists, a placeholder is shown. */
  Bench?: (p: BenchProps) => React.ReactNode
}

function Guide({ sandbox, experiment, onEnd, children }: { sandbox: Sandbox; experiment: Experiment; onEnd: () => void; children: (g: Guided) => React.ReactNode }) {
  const guided = useGuided(sandbox, experiment)
  return (
    <>
      {children(guided)}
      <GuidedPanel guided={guided} onClose={onEnd} />
    </>
  )
}

/** A live session at a station: the domain's engine, optional guide, notebook logging. */
export function StationWorkspace({ domain, setup, experiment, onEndExperiment, Bench, saved, onSave }: Props) {
  const { log } = useLabSession()
  const sandbox = useSandbox(domain, experiment?.setup ?? setup ?? EMPTY_SETUP, log, { initialState: saved, onState: onSave })
  const bench = (apply: Sandbox['apply']) => <div className="bench-area">{Bench ? <Bench sandbox={sandbox} apply={apply} /> : <PlaceholderBench />}</div>
  return (
    <div className="workspace">
      {experiment ? (
        <Guide sandbox={sandbox} experiment={experiment} onEnd={onEndExperiment}>
          {(g) => bench(g.apply)}
        </Guide>
      ) : (
        bench(sandbox.apply)
      )}
    </div>
  )
}
