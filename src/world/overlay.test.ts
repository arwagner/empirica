import { labOverlay, returnMode } from './overlay'

test('mouse: the start card enters by capturing the mouse; the ready prompt shows after a station', () => {
  expect(labOverlay('start', { touch: false })).toEqual({ card: 'start', enterBy: 'lock', readyPrompt: false, menuButton: true })
  expect(labOverlay('paused', { touch: false }).card).toBe('paused')
  expect(labOverlay('ready', { touch: false })).toMatchObject({ card: null, readyPrompt: true, menuButton: true })
})

test('touch: the start card enters by a tap, and there is no look-around prompt', () => {
  expect(labOverlay('start', { touch: true })).toEqual({ card: 'start', enterBy: 'tap', readyPrompt: false, menuButton: true })
  expect(labOverlay('ready', { touch: true })).toMatchObject({ card: null, readyPrompt: false, menuButton: true })
})

test('the Menu button hides while flying and at a station, and while walking with a mouse', () => {
  for (const mode of ['suspended', 'flyingIn', 'station', 'flyingOut'] as const) {
    expect(labOverlay(mode, { touch: false }).menuButton).toBe(false)
    expect(labOverlay(mode, { touch: true }).menuButton).toBe(false)
  }
  expect(labOverlay('walking', { touch: false }).menuButton).toBe(false)
})

test('touch keeps the Menu button while walking: there is no M key', () => {
  expect(labOverlay('walking', { touch: true }).menuButton).toBe(true)
})

test('peek hides the paused card but not the start card', () => {
  expect(labOverlay('paused', { touch: false, peek: true }).card).toBe(null)
  expect(labOverlay('start', { touch: false, peek: true }).card).toBe('start')
})

test('back in the room: walking with the mouse captured or on touch, otherwise ready for a click', () => {
  expect(returnMode({ locked: true, touch: false })).toBe('walking')
  expect(returnMode({ locked: false, touch: false })).toBe('ready')
  expect(returnMode({ locked: false, touch: true })).toBe('walking')
})
