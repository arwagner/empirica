// @vitest-environment node
import { DRAFT } from './fakes.test-helpers'
import { issueBody, plain, sameEquipment, signDraft, verifyDraft } from './tickets'

test('model text is made safe for a public issue', () => {
  expect(plain('ping @arwagner, see #12 <b>now</b> [here](https://evil.example) https://x.y/z')).toBe(
    'ping @​arwagner, see #​12 now here [link removed]',
  )
})

test('the issue body has the phone section and phone checks CLAUDE.md asks for', () => {
  const body = issueBody(DRAFT)
  expect(body).toContain('## On a phone\nTap Start and Stop')
  expect(body).toMatch(/- \[ \] Phone \(360px wide, touch\).*44px.*hover.*keyboard hints hidden on touch/)
})

test.each([
  ['Equipment: Geiger counter', 'Geiger counters', true],
  ['Equipment: Geiger–Müller counter', 'geiger counter', true],
  ['Equipment: Infrared thermometer', 'Thermometer', true],
  ['Equipment: Oscilloscope', 'Geiger counter', false],
  ['Equipment: Sound level meter', 'Speed of light apparatus', false],
])('%s vs %s: same equipment = %s', (title, name, same) => {
  expect(sameEquipment(title, name)).toBe(same)
})

test('a signed draft verifies until it expires, and only with the same secret and content', () => {
  const token = signDraft('s', DRAFT, 1000)
  expect(verifyDraft('s', DRAFT, token, 999)).toBe(true)
  expect(verifyDraft('s', DRAFT, token, 1001)).toBe(false)
  expect(verifyDraft('other', DRAFT, token, 999)).toBe(false)
  expect(verifyDraft('s', { ...DRAFT, location: 'Roof' }, token, 999)).toBe(false)
  expect(verifyDraft('s', DRAFT, 'garbage', 999)).toBe(false)
})
