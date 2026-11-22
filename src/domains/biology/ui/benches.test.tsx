import { fireEvent, render, screen, within } from '@testing-library/react'
import { biology } from '..'
import { NotebookPanel } from '../../../ui/notebook/NotebookPanel'
import { LabSessionProvider } from '../../../ui/session'
import { StationWorkspace } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { BiologyBench } from './BiologyBench'

function Notebook() {
  const { notebook, note } = useLabSession()
  return <NotebookPanel notebook={notebook} onAddNote={note} />
}
export const bench = (rig: string, params: object = {}) =>
  render(
    <LabSessionProvider>
      <StationWorkspace domain={biology} setup={{ rig: { kind: rig, params } }} experiment={null} onEndExperiment={() => {}} Bench={BiologyBench} />
      <Notebook />
    </LabSessionProvider>,
  )
export const log = () => within(screen.getByRole('region', { name: 'Lab notebook' }))

test('microscope bench: load a slide, stain, change objective, focus finely', () => {
  bench('microscope')
  fireEvent.click(screen.getByRole('button', { name: 'onion skin' }))
  fireEvent.click(screen.getByRole('button', { name: 'iodine' }))
  fireEvent.click(screen.getByRole('radio', { name: '10×' }))
  fireEvent.change(screen.getByRole('slider', { name: 'Coarse focus' }), { target: { value: '43.5' } })
  expect(log().getByText(/you can see a dark dot \(the nucleus\)/)).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: '10×' })).toHaveAttribute('aria-checked', 'true')
})

test('genetics bench: two stocks, cross, see results and χ²', () => {
  bench('genetics')
  fireEvent.click(screen.getAllByText('From a true-breeding stock')[1])
  fireEvent.change(screen.getByRole('combobox', { name: 'Parent 2 seed shape' }), { target: { value: 'recessive' } })
  const stockButtons = screen.getAllByRole('button', { name: 'Use stock' })
  fireEvent.click(stockButtons[0])
  fireEvent.click(stockButtons[1])
  expect(screen.getByRole('region', { name: 'Prediction' })).toHaveTextContent('Rr')
  fireEvent.click(screen.getByRole('button', { name: /Cross \(400 offspring\)/ }))
  expect(log().getByText(/F1: 400 round/)).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Offspring' })).toHaveTextContent(/fits the prediction/)
})

test('enzyme bench: boil the liver, start: nothing happens', () => {
  bench('enzymes')
  fireEvent.click(screen.getByRole('checkbox', { name: 'Boil it first' }))
  fireEvent.click(screen.getByRole('button', { name: 'Add enzyme & start' }))
  expect(log().getByText(/boiled enzyme makes no bubbles/)).toBeInTheDocument()
})

test('osmosis bench: start the potato experiment; switch to agar cubes', () => {
  bench('osmosis')
  fireEvent.click(screen.getByRole('button', { name: 'Start' }))
  expect(log().getByText(/Weighed the cylinders/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: 'Diffusion (agar cubes)' }))
  expect(screen.getByLabelText('Agar cubes in acid')).toBeInTheDocument()
})

test('photosynthesis bench: count bubbles', () => {
  bench('photosynthesis')
  fireEvent.click(screen.getByRole('button', { name: 'Count bubbles for 1 minute' }))
  expect(log().getByText('Started counting bubbles for one minute.')).toBeInTheDocument()
})

test('microbiology bench: inoculate and incubate an antibiotic plate', () => {
  bench('microbiology')
  fireEvent.click(screen.getByRole('button', { name: 'Inoculate' }))
  fireEvent.click(screen.getByRole('button', { name: 'Incubate' }))
  expect(log().getByText(/Put it in the incubator at 30 °C/)).toBeInTheDocument()
})

test('ecology bench: switch to moths, change the bark mid-story', () => {
  bench('ecology')
  fireEvent.click(screen.getByRole('radio', { name: 'Peppered moths' }))
  fireEvent.click(screen.getByRole('button', { name: 'Run' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Bark' }), { target: { value: 'clean' } })
  expect(log().getByText(/pollution cleaned up/)).toBeInTheDocument()
})
