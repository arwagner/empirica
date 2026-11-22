import { act, render, renderHook, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { marbleExperiment, marbles } from '../../core/fixtures.test-helpers'
import { LabSessionProvider } from '../session'
import { useSandbox } from '../sandbox/useSandbox'
import { GuidedPanel } from './GuidedPanel'
import { useGuided } from './useGuided'

const e = (t: string) => ({ simple: `${t} (simple)`, intermediate: `${t} (mid)`, advanced: `${t} (adv)` })
const exp = marbleExperiment({
  intro: e('Jars hold marbles'),
  conclusion: e('More marbles, fuller jar'),
  variations: [{ prompt: 'Try a bigger jar' }],
  steps: [
    { instruction: 'Add two marbles', action: [{ type: 'add', count: 2 }], check: { atLeast: 2 }, observation: 'Clink clink.', explanation: e('Two is a pair') },
    { instruction: 'Add three more', action: [{ type: 'add', count: 3 }], check: { atLeast: 5 }, observation: 'Rattle.', explanation: e('Five now'), hint: 'Three more!' },
  ],
})
const domain = marbles([exp])
const wrapper = ({ children }: { children: ReactNode }) => <LabSessionProvider>{children}</LabSessionProvider>

function setup() {
  const h = renderHook(() => useGuided(useSandbox(domain, { start: 0 }), exp), { wrapper })
  const view = render(<GuidedPanel guided={h.result.current} onClose={() => {}} />, { wrapper })
  const rerender = () => view.rerender(<GuidedPanel guided={h.result.current} onClose={() => {}} />)
  return { h, rerender }
}

test('free actions that satisfy a step complete it and explain the result', () => {
  const { h, rerender } = setup()
  expect(screen.getByText('Jars hold marbles (simple)')).toBeInTheDocument()
  act(() => void h.result.current.apply({ type: 'add', count: 2 }))
  rerender()
  expect(screen.getByRole('status')).toHaveTextContent('Clink clink.')
  expect(screen.getByText('Two is a pair (simple)')).toBeInTheDocument()
  expect(screen.getByText('Add three more')).toHaveAttribute('aria-current', 'step')
})

test('hint and show-me, then a summary with variations', () => {
  const { h, rerender } = setup()
  act(() => void h.result.current.apply({ type: 'add', count: 2 }))
  act(() => h.result.current.showHint())
  rerender()
  expect(screen.getByText(/Three more!/)).toBeInTheDocument()
  act(() => h.result.current.showMe())
  rerender()
  expect(h.result.current.finished).toBe(true)
  expect(screen.getByText('More marbles, fuller jar (simple)')).toBeInTheDocument()
  expect(screen.getByText('Try a bigger jar')).toBeInTheDocument()
  expect(screen.getByText(/1 hint · 1 step shown/)).toBeInTheDocument()
  act(() => h.result.current.restart())
  expect(h.result.current.run.current).toBe(0)
  expect(h.result.current.experiment.id).toBe('fill-the-jar')
})

test('invalid actions come back as an error, without changing state or progress', () => {
  const strict = { ...domain, engine: { ...domain.engine, apply: (n: number, a: { type: 'add'; count: number }) => {
    if (a.count < 0) throw new Error('No negative marbles')
    return domain.engine.apply(n, a)
  } } }
  const h = renderHook(() => useGuided(useSandbox(strict, { start: 0 }), exp), { wrapper })
  let r: ReturnType<typeof h.result.current.apply> | undefined
  act(() => void (r = h.result.current.apply({ type: 'add', count: -1 })))
  expect(r!.error).toBe('No negative marbles')
  expect(r!.state).toBe(0)
  expect(h.result.current.run.current).toBe(0)
})
