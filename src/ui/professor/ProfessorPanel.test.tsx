import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { ProfessorApi } from '../../professor/api'
import { LabSessionProvider } from '../session'
import { TOUCH_QUERY } from '../touch'
import { ProfessorPanel } from './ProfessorPanel'

const DRAFT = { equipment: 'Geiger counter', question: 'How radioactive is a banana?', measures: 'Counts per minute', location: 'Physics Hall', phone: 'Tap Start.' }

const fakeApi = (over: Partial<ProfessorApi> = {}): ProfessorApi => ({
  health: vi.fn(async () => true),
  chat: vi.fn(async () => ({ kind: 'reply' as const, text: 'What do you predict?', sig: 's' })),
  confirm: vi.fn(async () => ({ kind: 'filed' as const, number: 12, url: 'https://github.com/x/y/issues/12' })),
  ...over,
})

const show = (api: ProfessorApi, station = { id: 'flame-station', name: 'Flame Test Station' }) =>
  render(
    <LabSessionProvider>
      <ProfessorPanel api={api} station={station} />
    </LabSessionProvider>,
  )

const say = async (text: string) => {
  fireEvent.change(screen.getByRole('textbox', { name: 'Message to the professor' }), { target: { value: text } })
  await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Send' })))
}

beforeEach(() => sessionStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('sends the message with the station and shows the reply', async () => {
  const api = fakeApi()
  show(api)
  expect(screen.getByText(/At the/)).toHaveTextContent('At the Flame Test Station.')
  await say('Why lilac?')
  expect(await screen.findByText('What do you predict?')).toBeInTheDocument()
  expect(api.chat).toHaveBeenCalledWith({ station: 'flame-station', notebook: [], history: [], message: 'Why lilac?' })
  expect(screen.getByRole('textbox', { name: 'Message to the professor' })).toHaveValue('')
})

test('a draft is shown with Confirm and Cancel, and is only sent on Confirm', async () => {
  const api = fakeApi({ chat: vi.fn(async () => ({ kind: 'reply' as const, text: 'Shall we ask for one?', sig: 's', draft: { draft: DRAFT, token: 't' } })) })
  show(api)
  await say('Can I measure radioactivity?')
  const card = await screen.findByRole('region', { name: 'Equipment request: Geiger counter' })
  expect(card).toHaveTextContent('How radioactive is a banana?')
  expect(api.confirm).not.toHaveBeenCalled()
  await act(async () => void fireEvent.click(screen.getByRole('button', { name: 'Confirm' })))
  expect(api.confirm).toHaveBeenCalledWith(DRAFT, 't')
  expect(await screen.findByText(/issue #12/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
})

test('cancelling a draft sends nothing', async () => {
  const api = fakeApi({ chat: vi.fn(async () => ({ kind: 'reply' as const, text: 'Draft?', sig: 's', draft: { draft: DRAFT, token: 't' } })) })
  show(api)
  await say('Can I measure radioactivity?')
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }))
  expect(screen.getByText('Not sent.')).toBeInTheDocument()
  expect(api.confirm).not.toHaveBeenCalled()
})

test('when the server is down the panel says the professor is unavailable', async () => {
  show(fakeApi({ health: vi.fn(async () => false) }))
  expect(await screen.findByRole('status')).toHaveTextContent(/unavailable/)
})

test('a friendly notice (rate limit, budget) shows in the chat', async () => {
  show(fakeApi({ chat: vi.fn(async () => ({ kind: 'notice' as const, reason: 'budget' as const, text: "I'm resting until tomorrow." })) }))
  await say('Hello')
  expect(await screen.findByText("I'm resting until tomorrow.")).toBeInTheDocument()
})

test('the conversation survives reopening the panel, and New conversation clears it', async () => {
  const api = fakeApi()
  const { unmount } = show(api)
  await say('Why lilac?')
  await screen.findByText('What do you predict?')
  unmount()
  show(api)
  expect(screen.getByText('Why lilac?')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'New conversation' }))
  await waitFor(() => expect(screen.queryByText('Why lilac?')).not.toBeInTheDocument())
})

test('Enter sends from a keyboard, but types a new line on a phone, where Send is the way to send', async () => {
  const box = () => screen.getByRole('textbox', { name: 'Message to the professor' })
  const desk = fakeApi()
  const { unmount } = show(desk)
  fireEvent.change(box(), { target: { value: 'Why lilac?' } })
  await act(async () => void fireEvent.keyDown(box(), { key: 'Enter' }))
  expect(desk.chat).toHaveBeenCalledTimes(1)
  unmount()

  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q === TOUCH_QUERY, addEventListener() {}, removeEventListener() {} }))
  const phone = fakeApi()
  show(phone)
  fireEvent.change(box(), { target: { value: 'Why lilac?' } })
  await act(async () => void fireEvent.keyDown(box(), { key: 'Enter' }))
  expect(phone.chat).not.toHaveBeenCalled()
})
