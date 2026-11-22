import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { chemistry } from '..'
import { NotebookPanel } from '../../../ui/notebook/NotebookPanel'
import { LabSessionProvider } from '../../../ui/session'
import { StationWorkspace } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { ChemBench } from './ChemBench'

function Notebook() {
  const { notebook, note } = useLabSession()
  return <NotebookPanel notebook={notebook} onAddNote={note} />
}

const setup = { vessels: [{ id: 'beaker A', kind: 'beaker-250' }, { id: 'beaker B', kind: 'beaker-250' }] }

function renderBench() {
  render(
    <LabSessionProvider>
      <StationWorkspace domain={chemistry} setup={setup} experiment={null} onEndExperiment={() => {}} Bench={ChemBench} />
      <Notebook />
    </LabSessionProvider>,
  )
}

const vessel = (name: RegExp) => screen.getByRole('button', { name })
const log = () => screen.getByRole('region', { name: 'Lab notebook' })

test('add reagents from the shelf to the selected vessel and see what happens', () => {
  renderBench()
  fireEvent.click(screen.getByRole('tab', { name: 'Salt solutions' }))
  fireEvent.click(screen.getByRole('button', { name: /Add 10 mL of 0.1 M sodium chloride to beaker A/ }))
  fireEvent.click(screen.getByRole('button', { name: /Add 10 mL of 0.1 M silver nitrate to beaker A/ }))
  expect(vessel(/^beaker A: 20.00 mL/)).toBeInTheDocument()
  expect(within(log()).getAllByText(/white precipitate of silver chloride/).length).toBeGreaterThan(0)
  expect(screen.getByRole('list', { name: 'Latest observations' })).toHaveTextContent(/silver chloride/)
})

test('select a vessel, pour into another, read the pH meter and log it', () => {
  renderBench()
  fireEvent.click(screen.getByRole('button', { name: /Add 10 mL of 1 M hydrochloric acid to beaker A/ }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Pour into' }), { target: { value: 'beaker B' } })
  fireEvent.click(screen.getByRole('button', { name: 'Pour' }))
  expect(vessel(/^beaker B: 10.00 mL/)).toBeInTheDocument()
  fireEvent.click(vessel(/^beaker B/))
  expect(screen.getByRole('button', { name: 'Log pH meter reading' }).closest('.readout')).toHaveTextContent('pH meter0')
  fireEvent.click(screen.getByRole('button', { name: 'Log pH meter reading' }))
  expect(within(log()).getByText(/pH meter reading, beaker B/)).toBeInTheDocument()
})

test('heat and run the clock; flame test; errors show inline', () => {
  vi.useFakeTimers()
  renderBench()
  fireEvent.click(screen.getByRole('tab', { name: 'Water' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'Amount of Distilled water (mL)' }), { target: { value: '50' } })
  fireEvent.click(screen.getByRole('button', { name: /Add 50 mL of Distilled water to beaker A/ }))
  fireEvent.click(screen.getByRole('radio', { name: 'High' }))
  fireEvent.click(screen.getByRole('button', { name: '+5 min' }))
  expect(vessel(/^beaker A: .*100 °C/)).toBeInTheDocument()
  expect(within(log()).getAllByText(/starts to boil/).length).toBe(1)

  fireEvent.click(screen.getByRole('button', { name: 'Run time' }))
  act(() => void vi.advanceTimersByTime(1000))
  expect(screen.getByLabelText('Lab clock')).toHaveTextContent('5:10')
  fireEvent.click(screen.getByRole('button', { name: 'Pause time' }))

  fireEvent.click(screen.getByRole('button', { name: 'Flame test' }))
  expect(within(log()).getByText(/No distinctive flame color/)).toBeInTheDocument()
  vi.useRealTimers()
})

test('put glassware away', () => {
  renderBench()
  fireEvent.click(vessel(/^beaker B/))
  fireEvent.click(screen.getByRole('button', { name: 'Put away' }))
  expect(screen.queryByRole('button', { name: /^beaker B/ })).not.toBeInTheDocument()
  expect(vessel(/^beaker A/)).toHaveAttribute('aria-pressed', 'true')
})

test('amounts: type a value, bump it with − / +, invalid amounts disable Add', () => {
  renderBench()
  const box = screen.getByRole('textbox', { name: 'Amount of 1 M hydrochloric acid (mL)' })
  expect(box).toHaveValue('10')
  fireEvent.click(screen.getByRole('button', { name: 'More 1 M hydrochloric acid (mL)' }))
  expect(box).toHaveValue('15')
  fireEvent.change(box, { target: { value: '1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Less 1 M hydrochloric acid (mL)' }))
  expect(box).toHaveValue('0.9')
  fireEvent.change(box, { target: { value: 'lots' } })
  expect(screen.getByRole('button', { name: /^Add\s+mL of 1 M hydrochloric acid/ })).toBeDisabled()
  fireEvent.change(box, { target: { value: '3' } })
  fireEvent.keyDown(box, { key: 'Enter' })
  expect(vessel(/^beaker A: 3.00 mL/)).toBeInTheDocument()
})
