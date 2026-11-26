import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { physics } from '..'
import { TOUCH_QUERY } from '../../../ui/touch'
import { NotebookPanel } from '../../../ui/notebook/NotebookPanel'
import { LabSessionProvider } from '../../../ui/session'
import { StationWorkspace } from '../../../ui/station/StationWorkspace'
import { useLabSession } from '../../../ui/useLabSession'
import { PhysicsBench } from './PhysicsBench'

function Notebook() {
  const { notebook, note } = useLabSession()
  return <NotebookPanel notebook={notebook} onAddNote={note} />
}
const bench = (rig: string) =>
  render(
    <LabSessionProvider>
      <StationWorkspace domain={physics} setup={{ rig: { kind: rig } }} experiment={null} onEndExperiment={() => {}} Bench={PhysicsBench} />
      <Notebook />
    </LabSessionProvider>,
  )
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const log = () => within(screen.getByRole('region', { name: 'Lab notebook' }))

test('ramp bench: settings log to the notebook; release starts the run', () => {
  bench('ramp')
  fireEvent.change(screen.getByRole('combobox', { name: 'Hanging mass' }), { target: { value: '0.1' } })
  expect(log().getByText(/100 g hanging from the pulley/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Release' }))
  expect(screen.getByRole('button', { name: 'Release' })).toBeDisabled()
  expect(log().getByText('Released the cart.')).toBeInTheDocument()
})

test('track bench: explosion mode, release the spring, momentum readout appears', () => {
  bench('track')
  fireEvent.change(screen.getByRole('combobox', { name: 'Mode' }), { target: { value: 'explode' } })
  fireEvent.click(screen.getByRole('button', { name: 'Release spring' }))
  expect(log().getByText(/The spring pushes them apart/)).toBeInTheDocument()
  expect(screen.getByText(/Momentum before → after/).parentElement).toHaveTextContent('0.000 → 0.000')
})

test('track bench on a phone: each push arrow\'s hit area stays clear of its glider, so touching a glider moves it', () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === TOUCH_QUERY, addEventListener() {}, removeEventListener() {} }))
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 340 } as DOMRect)
  bench('track')
  for (const id of ['A', 'B']) {
    const hit = screen.getByRole('slider', { name: `Glider ${id} push` }).querySelector('circle.hit')!
    const body = screen.getByRole('slider', { name: `Glider ${id} position` }).querySelector('rect')!
    const r = Number(hit.getAttribute('r'))
    expect(r * 2 * (340 / 900)).toBeGreaterThanOrEqual(43) // a finger-sized target at 340px wide
    expect(Number(hit.getAttribute('cy')) + r).toBeLessThanOrEqual(Number(body.getAttribute('y')))
  }
})

test('oscillator bench: switch to the spring, see it stretch, release', () => {
  bench('oscillator')
  fireEvent.change(screen.getByRole('combobox', { name: 'Rig' }), { target: { value: 'spring' } })
  expect(log().getByText(/The spring stretches/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Release' }))
  expect(log().getByText(/Released the mass/)).toBeInTheDocument()
})

test('launcher bench: change ball, fire', () => {
  bench('launcher')
  fireEvent.change(screen.getByRole('combobox', { name: 'Ball' }), { target: { value: 'pingpong' } })
  fireEvent.click(screen.getByRole('button', { name: 'Fire' }))
  expect(log().getByText(/Fired the ping-pong ball/)).toBeInTheDocument()
})

test('drop tower bench: pump out the air, release', () => {
  bench('drop-tower')
  fireEvent.click(screen.getByRole('button', { name: 'Pump out the air' }))
  expect(screen.getByRole('button', { name: 'Let the air back in' })).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Release' }))
  expect(log().getByText(/Released both objects/)).toBeInTheDocument()
})
