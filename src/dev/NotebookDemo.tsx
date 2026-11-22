import { useState } from 'react'
import { addNote, createNotebook, record, type Notebook } from '../core'
import { NotebookPanel } from '../ui/notebook/NotebookPanel'

/** Dev-only sample session: open with ?demo=notebook */
function sample(): Notebook {
  let nb = createNotebook({ title: 'Heating water to boiling', domain: 'chemistry' }, new Date())
  nb = record(nb, [{ kind: 'action', text: 'Placed 250 mL beaker of water on hot plate', action: {} }], 0)
  nb = record(nb, [{ kind: 'action', text: 'Set hot plate to 300 °C', action: {} }], 4000)
  const temps = [21, 28, 37, 47, 58, 69, 80, 90, 98, 100, 100, 100]
  temps.forEach((v, i) => {
    nb = record(nb, [{ kind: 'measurement', text: 'Water temperature', measurement: { quantity: 'temperature', value: v, unit: '°C', instrument: 'thermometer' } }], 10000 + i * 30000)
    if (v === 69) nb = record(nb, [{ kind: 'observation', text: 'Small bubbles form on the bottom of the beaker' }], 10000 + i * 30000)
    if (v === 100 && i === 9) nb = record(nb, [{ kind: 'observation', text: 'Rolling boil; steam rises steadily' }], 10000 + i * 30000)
  })
  nb = addNote(nb, 'Temperature stops rising at 100 °C even though heating continues: energy goes into boiling.', 350000)
  return nb
}

export default function NotebookDemo() {
  const [nb, setNb] = useState(sample)
  return (
    <div style={{ height: '100vh', maxWidth: 760, margin: '0 auto' }}>
      <NotebookPanel notebook={nb} onAddNote={(t) => setNb((n) => addNote(n, t, Date.now() - Date.parse(n.startedAt)))} />
    </div>
  )
}
