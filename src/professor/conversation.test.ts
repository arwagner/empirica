import { addNote, createNotebook, record } from '../core'
import { addResponse, addStudent, historyFor, loadConversation, notebookLines, saveConversation, setDraft, ticketOutcome } from './conversation'

const DRAFT = { equipment: 'Geiger counter', question: 'q', measures: 'm', location: 'l', phone: 'p' }

test('the history sent back leaves out notices, the questions they answered, and the question still waiting', () => {
  let c = addStudent([], 'Why lilac?')
  c = addResponse(c, { kind: 'reply', text: 'What metal?', sig: 's1' })
  c = addStudent(c, 'Tell me a joke')
  c = addResponse(c, { kind: 'notice', reason: 'off-topic', text: 'Only the lab.' })
  c = addStudent(c, 'Potassium?')
  expect(historyFor(c)).toEqual([
    { role: 'user', text: 'Why lilac?' },
    { role: 'assistant', text: 'What metal?', sig: 's1' },
  ])
})

test('a reply with a draft starts it pending; confirming moves it on', () => {
  let c = addResponse([], { kind: 'reply', text: 'Shall I?', sig: 's', draft: { draft: DRAFT, token: 't' } })
  expect(c[0].draft).toMatchObject({ status: 'pending', token: 't' })
  c = setDraft(c, c[0].id, ticketOutcome({ kind: 'filed', number: 9, url: 'u' }))
  expect(c[0].draft).toMatchObject({ status: 'filed', url: 'u', note: expect.stringMatching(/#9/) })
  expect(ticketOutcome({ kind: 'commented', number: 3, url: 'v' })).toMatchObject({ status: 'commented', note: expect.stringMatching(/already asked/) })
  expect(ticketOutcome({ kind: 'notice', reason: 'ticket-cap', text: 'Full today' })).toEqual({ status: 'pending', note: 'Full today' })
})

test('notebook lines are short, timestamped, and only the newest are sent', () => {
  let nb = createNotebook({ title: 't', domain: 'd' }, new Date(0))
  nb = record(nb, [{ kind: 'measurement', text: 'Beaker temperature', measurement: { quantity: 'temperature', value: 62, unit: '°C', instrument: 'thermometer' } }], 30000)
  nb = addNote(nb, 'x'.repeat(500), 61000)
  const lines = notebookLines(nb)
  expect(lines[0]).toBe('[00:30] measured Beaker temperature: 62 °C (thermometer)')
  expect(lines[1].length).toBe(300)
  for (let i = 0; i < 50; i++) nb = addNote(nb, `n${i}`, 0)
  expect(notebookLines(nb)).toHaveLength(40)
})

test('the conversation round-trips through session storage, and bad data starts fresh', () => {
  const store = new Map<string, string>()
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
  const c = addStudent([], 'hi')
  saveConversation(c, storage)
  expect(loadConversation(storage)).toEqual(c)
  store.set('empirica.professor', '{bad')
  expect(loadConversation(storage)).toEqual([])
})
