import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { vi } from 'vitest'

// WebGL isn't available in jsdom; the overlays and menu are what we can check here.
vi.mock('@react-three/fiber', () => ({ Canvas: () => null, useFrame: () => {}, useThree: () => ({}) }))

import App from './App'

const key = (code: string) => act(() => void fireEvent.keyDown(document, { code }))

test('shows the lab entry screen', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Empirica' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /enter the lab/i })).toBeInTheDocument()
})

test('M opens the menu, Esc closes it; N jumps to the notebook', () => {
  render(<App />)
  key('KeyM')
  expect(screen.getByRole('dialog', { name: 'Lab menu' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Flame tests' })).toBeInTheDocument()
  key('Escape')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  key('KeyN')
  expect(screen.getByRole('tab', { name: /Notebook/, selected: true })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Lab notebook' })).toBeInTheDocument()
})

test('typing a note does not toggle the menu', () => {
  render(<App />)
  key('KeyN')
  const input = screen.getByRole('textbox', { name: 'New note' })
  fireEvent.keyDown(input, { code: 'KeyM' })
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  fireEvent.change(input, { target: { value: 'Hypothesis: salt raises the boiling point' } })
  fireEvent.submit(input.closest('form')!)
  expect(screen.getByText('Hypothesis: salt raises the boiling point')).toBeInTheDocument()
})

test('explanation level persists', () => {
  render(<App />)
  key('KeyM')
  fireEvent.click(screen.getByRole('radio', { name: 'Advanced' }))
  expect(screen.getByRole('radio', { name: 'Advanced' })).toHaveAttribute('aria-checked', 'true')
  expect(localStorage.getItem('empirica.level')).toBe('advanced')
})

test('stations tab lists stations by room', () => {
  render(<App />)
  key('KeyM')
  fireEvent.click(screen.getByRole('tab', { name: 'Stations' }))
  const chem = screen.getByRole('region', { name: 'Chemistry Lab' })
  expect(within(chem).getByRole('heading', { name: 'Wet Bench' })).toBeInTheDocument()
  expect(within(chem).getAllByRole('button', { name: 'Go there' })).toHaveLength(3)
  const phys = screen.getByRole('region', { name: 'Physics Hall' })
  expect(within(phys).getAllByRole('button', { name: 'Go there' })).toHaveLength(5)
  expect(within(phys).queryAllByText('Coming soon')).toHaveLength(0)
  expect(screen.getByRole('region', { name: 'Biology Lab' })).toBeInTheDocument()
})

test('catalog search, then Start opens the guided experiment at its station', () => {
  render(<App />)
  key('KeyM')
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search experiments' }), { target: { value: 'flame tests' } })
  const cards = screen.getAllByRole('button', { name: 'Start' })
  expect(cards).toHaveLength(1)
  fireEvent.click(cards[0])
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const guide = screen.getByRole('complementary', { name: 'Guided experiment' })
  expect(guide).toHaveTextContent('Flame tests')
  expect(guide).toHaveTextContent('Flame-test tube 1 (lithium chloride).')
  expect(screen.getByRole('heading', { name: 'Flame Test Station' })).toBeInTheDocument()
})

test('Go there to a station in another room opens it', () => {
  render(<App />)
  key('KeyM')
  fireEvent.click(screen.getByRole('tab', { name: 'Stations' }))
  fireEvent.click(within(screen.getByRole('region', { name: 'Physics Hall' })).getAllByRole('button', { name: 'Go there' })[0])
  expect(screen.getByRole('heading', { name: 'Ramp & Carts' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Release' })).toBeInTheDocument()
})

test('the on-screen Menu button opens the menu', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: /^Menu/ }))
  expect(screen.getByRole('dialog', { name: 'Lab menu' })).toBeInTheDocument()
})

describe('on a touch screen', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === '(hover: none) and (pointer: coarse)', addEventListener() {}, removeEventListener() {} }))
  })
  afterEach(() => vi.unstubAllGlobals())

  test('the entry card enters by a tap, not mouse capture, and shows touch controls', () => {
    render(<App />)
    expect(screen.queryByText(/release mouse/)).not.toBeInTheDocument()
    expect(screen.getByText(/Drag to walk/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tap to enter the lab' }))
    expect(screen.queryByRole('heading', { name: 'Empirica' })).not.toBeInTheDocument()
    // Walking by touch keeps the Menu button: there's no M key.
    fireEvent.click(screen.getByRole('button', { name: /^Menu/ }))
    expect(screen.getByRole('dialog', { name: 'Lab menu' })).toBeInTheDocument()
  })

  test('the entry card still opens the menu, and travel works by tapping', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Open the menu' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Stations' }))
    fireEvent.click(within(screen.getByRole('region', { name: 'Biology Lab' })).getAllByRole('button', { name: 'Go there' })[0])
    expect(screen.getByRole('heading', { name: 'Microscope' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to lab/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Notebook/ })).toBeInTheDocument()
  })
})
