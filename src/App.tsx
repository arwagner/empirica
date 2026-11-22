import { lazy, Suspense } from 'react'
import { LabShell } from './ui/shell/LabShell'
import { BUILDING } from './world/building'

const demos = {
  notebook: lazy(() => import('./dev/NotebookDemo')),
  bench: lazy(() => import('./dev/BenchDemo')),
  ramp: lazy(() => import('./dev/RampDemo')),
}

export default function App() {
  const demo = new URLSearchParams(location.search).get('demo') as keyof typeof demos | null
  const Demo = demo && demos[demo]
  if (Demo) return <Suspense><Demo /></Suspense>
  return <LabShell building={BUILDING} />
}
