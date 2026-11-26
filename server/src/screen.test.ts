// @vitest-environment node
import { normalize, screenText } from './screen'
import { ATTACKS, LAB_TALK } from './screen.cases'

test.each(ATTACKS)('stops the attack: %s', (text) => {
  expect(screenText(text).ok).toBe(false)
})

test.each(LAB_TALK)('lets lab talk through: %s', (text) => {
  expect(screenText(text)).toEqual({ ok: true })
})

test('personal details are flagged as personal, not as an attack', () => {
  expect(screenText('my credit card is 4111 1111')).toEqual({ ok: false, reason: 'personal' })
})

test('normalizing strips zero-width characters and folds case and spacing', () => {
  expect(normalize('IG​NORE   this')).toBe('ignore this')
})
