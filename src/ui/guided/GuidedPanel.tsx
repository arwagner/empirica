import { explain } from '../../core'
import { useLabSession } from '../useLabSession'
import type { Guided } from './useGuided'
import './guided.css'

/** The step-by-step guide shown beside a station's workspace. */
export function GuidedPanel({ guided, onClose }: { guided: Guided; onClose: () => void }) {
  const { level } = useLabSession()
  const { experiment: exp, run, finished, justCompleted, hint } = guided
  const last = justCompleted.at(-1)
  const lastStep = last === undefined ? null : exp.steps[last]

  return (
    <aside className="guided" aria-label="Guided experiment">
      <header>
        <div>
          <p className="eyebrow">Guided experiment</p>
          <h3>{exp.title}</h3>
        </div>
        <button className="link" onClick={onClose}>Free play</button>
      </header>
      <progress max={exp.steps.length} value={run.current} aria-label={`Step ${Math.min(run.current + 1, exp.steps.length)} of ${exp.steps.length}`} />

      {run.current === 0 && !finished && <p className="intro">{explain(exp.intro, level)}</p>}

      {exp.hazards.length > 0 && run.current === 0 && (
        <p className="hazards">⚠ {exp.hazards.map((h) => h.note ?? h.kind[0].toUpperCase() + h.kind.slice(1)).join(' · ')}</p>
      )}

      {lastStep && (
        <div className="result" role="status">
          <p className="observed">✓ {lastStep.observation}</p>
          <p>{explain(lastStep.explanation, level)}</p>
        </div>
      )}

      <ol className="steps">
        {exp.steps.map((s, i) => (
          <li key={i} className={i < run.current ? 'done' : i === run.current ? 'now' : 'later'} aria-current={i === run.current ? 'step' : undefined}>
            {s.instruction}
          </li>
        ))}
      </ol>

      {!finished ? (
        <div className="actions">
          {hint && <p className="hint">💡 {hint}</p>}
          <button onClick={guided.showHint}>Hint</button>
          <button onClick={guided.showMe}>Show me</button>
        </div>
      ) : (
        <div className="summary">
          <h4>What you found</h4>
          <p>{explain(exp.conclusion, level)}</p>
          {exp.variations.length > 0 && (
            <>
              <h4>Try next</h4>
              <ul>
                {exp.variations.map((v, i) => (
                  <li key={i}>
                    {v.prompt}
                    {v.explanation && <span className="muted"> ({explain(v.explanation, level)})</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="muted">
            {run.hintsUsed} hint{run.hintsUsed === 1 ? '' : 's'} · {run.assisted} step{run.assisted === 1 ? '' : 's'} shown
          </p>
          <button onClick={guided.restart}>Run it again</button>
        </div>
      )}
    </aside>
  )
}
