import { labOverlay } from './overlay'

test('mouse: the start card enters by capturing the mouse; the ready prompt shows after a station', () => {
  expect(labOverlay('start', { touch: false })).toEqual({ card: 'start', enterBy: 'lock', readyPrompt: false, menuButton: true })
  expect(labOverlay('paused', { touch: false }).card).toBe('paused')
  expect(labOverlay('ready', { touch: false })).toMatchObject({ card: null, readyPrompt: true, menuButton: true })
})

test('touch: the start card enters by the menu, and there is no look-around prompt', () => {
  expect(labOverlay('start', { touch: true })).toEqual({ card: 'start', enterBy: 'menu', readyPrompt: false, menuButton: true })
  expect(labOverlay('ready', { touch: true })).toMatchObject({ card: null, readyPrompt: false, menuButton: true })
})

test('the Menu button hides while walking, flying and at a station', () => {
  for (const mode of ['walking', 'suspended', 'flyingIn', 'station', 'flyingOut'] as const) {
    expect(labOverlay(mode, { touch: false }).menuButton).toBe(false)
    expect(labOverlay(mode, { touch: true }).menuButton).toBe(false)
  }
})

test('peek hides the paused card but not the start card', () => {
  expect(labOverlay('paused', { touch: false, peek: true }).card).toBe(null)
  expect(labOverlay('start', { touch: false, peek: true }).card).toBe('start')
})
