import { registry } from '../content/registry'
import { chemistry } from '../domains/chemistry'
import { ChemBench } from '../domains/chemistry/ui/ChemBench'
import { LabSessionProvider } from '../ui/session'
import { StationWorkspace } from '../ui/station/StationWorkspace'
import '../ui/shell/shell.css'
import '../world/world.css'

/** Dev-only: the chemistry bench with a few interesting things on it. ?demo=bench, or ?demo=bench&exp=<id> for a guided run. */
const setup = {
  vessels: [
    { id: 'beaker A', kind: 'beaker-250', contents: [{ reagent: 'hcl-0.1m', amount: 60 }, { reagent: 'universal-indicator', amount: 5 }] },
    { id: 'beaker B', kind: 'beaker-250', contents: [{ reagent: 'cuso4-0.5m', amount: 120 }] },
    { id: 'test tube 1', kind: 'test-tube', contents: [{ reagent: 'nacl-0.1m', amount: 8 }, { reagent: 'agno3-0.1m', amount: 6 }] },
    { id: 'test tube 2', kind: 'test-tube', contents: [{ reagent: 'ki-0.1m', amount: 6 }, { reagent: 'pbno3-0.1m', amount: 6 }] },
    { id: 'flask', kind: 'flask-250', contents: [{ reagent: 'kmno4-0.01m', amount: 40 }, { reagent: 'water', amount: 60 }] },
    { id: 'cup', kind: 'calorimeter', contents: [{ reagent: 'naoh-1m', amount: 50 }, { reagent: 'phenolphthalein', amount: 3 }] },
  ],
}

export default function BenchDemo() {
  const exp = registry.experiment(new URLSearchParams(location.search).get('exp') ?? '')?.experiment ?? null
  return (
    <LabSessionProvider>
      <div className="station shown" style={{ position: 'fixed' }}>
        <div className="station-body">
          <StationWorkspace domain={chemistry} setup={setup} experiment={exp} onEndExperiment={() => {}} Bench={ChemBench} />
        </div>
      </div>
    </LabSessionProvider>
  )
}
