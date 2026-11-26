import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { addNote, createNotebook, record, type Notebook } from '../../core'
import { NotebookPanel } from './NotebookPanel'

const sample = (): Notebook => {
  let nb = createNotebook({ title: 'Heating water', domain: 'chemistry' }, new Date(0))
  nb = record(nb, [{ kind: 'action', text: 'Turned on hot plate', action: {} }], 0)
  for (const [t, v] of [[1000, 21], [30000, 40], [60000, 62]])
    nb = record(nb, [{ kind: 'measurement', text: 'Beaker temperature', measurement: { quantity: 'temperature', value: v, unit: '°C', instrument: 'thermometer' } }], t)
  return addNote(nb, 'Heats faster than expected', 61000)
}

test('shows the log and a chart per measured quantity', () => {
  render(<NotebookPanel notebook={sample()} onAddNote={() => {}} />)
  expect(screen.getByText('Turned on hot plate')).toBeInTheDocument()
  expect(screen.getByText('62 °C')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'Temperature (°C), thermometer: 3 readings' })).toBeInTheDocument()
})

test('chart can switch to a table view', () => {
  render(<NotebookPanel notebook={sample()} onAddNote={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: 'Table' }))
  expect(screen.getByRole('cell', { name: '00:30' })).toBeInTheDocument()
})

test('adding a note calls back and clears the field; blank notes are ignored', () => {
  const onAddNote = vi.fn()
  render(<NotebookPanel notebook={sample()} onAddNote={onAddNote} />)
  const input = screen.getByRole('textbox', { name: 'New note' })
  fireEvent.submit(input.closest('form')!)
  expect(onAddNote).not.toHaveBeenCalled()
  fireEvent.change(input, { target: { value: 'Try with salt water' } })
  fireEvent.submit(input.closest('form')!)
  expect(onAddNote).toHaveBeenCalledWith('Try with salt water')
  expect(input).toHaveValue('')
})

test('empty notebook explains itself and disables data export', () => {
  render(<NotebookPanel notebook={createNotebook({ title: 'New', domain: 'x' }, new Date(0))} onAddNote={() => {}} />)
  expect(screen.getByText(/Nothing yet/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Export data/ })).toBeDisabled()
})

test('exports markdown as a download', () => {
  const create = vi.fn(() => 'blob:x')
  Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(<NotebookPanel notebook={sample()} onAddNote={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /Export notes/ }))
  expect(create).toHaveBeenCalledOnce()
  expect(click).toHaveBeenCalledOnce()
})

test('a chart reading shows on tap and stays when the finger lifts; a mouse leaving hides it', () => {
  const { container } = render(<NotebookPanel notebook={sample()} onAddNote={() => {}} />)
  const area = container.querySelector('.plot rect')!
  const tip = () => container.querySelector('.plot .tip')
  expect(tip()).toBeNull()
  fireEvent.pointerDown(area, { pointerType: 'touch', clientX: 0 })
  expect(tip()).toHaveTextContent('21 °C at 00:01')
  fireEvent.pointerLeave(area, { pointerType: 'touch' })
  expect(tip()).not.toBeNull()
  fireEvent.pointerMove(area, { pointerType: 'mouse', clientX: 0 })
  fireEvent.pointerLeave(area, { pointerType: 'mouse' })
  expect(tip()).toBeNull()
})
