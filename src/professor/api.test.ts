import { vi } from 'vitest'
import { professorApi } from './api'
import { UNAVAILABLE } from './wire'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

test('chat posts to the API and returns its answer', async () => {
  const fetchFn = vi.fn(async () => json({ kind: 'reply', text: 'Hmm?', sig: 's' }))
  const api = professorApi(fetchFn as typeof fetch)
  expect(await api.chat({ notebook: [], history: [], message: 'hi' })).toEqual({ kind: 'reply', text: 'Hmm?', sig: 's' })
  expect(fetchFn).toHaveBeenCalledWith('/api/professor/chat', expect.objectContaining({ method: 'POST' }))
})

test('when the API is down, the professor is unavailable and nothing throws', async () => {
  const down = professorApi((async () => Promise.reject(new TypeError('Failed to fetch'))) as typeof fetch)
  expect(await down.chat({ notebook: [], history: [], message: 'hi' })).toEqual({ kind: 'notice', reason: 'unavailable', text: UNAVAILABLE })
  expect(await down.health()).toBe(false)
  // The static host answers unknown paths with index.html.
  const html = professorApi((async () => new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })) as typeof fetch)
  expect(await html.health()).toBe(false)
  expect(await html.confirm({ equipment: 'a', question: 'b', measures: 'c', location: 'd', phone: 'e' }, 't')).toMatchObject({ reason: 'unavailable' })
})

test('health is true only for the server’s own answer', async () => {
  expect(await professorApi((async () => json({ ok: true })) as typeof fetch).health()).toBe(true)
  expect(await professorApi((async () => json({ ok: true }, 502)) as typeof fetch).health()).toBe(false)
})
