// @vitest-environment node
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { ask, setup } from './fakes.test-helpers'
import { apiHandler } from './http'

let server: Server
let base: string
beforeAll(async () => {
  server = createServer(apiHandler(setup().professor, { trustProxy: true }))
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterAll(() => server.close())

const post = (path: string, body: string) => fetch(base + path, { method: 'POST', body, headers: { 'x-forwarded-for': '198.51.100.9' } })

test('health, chat and unknown routes', async () => {
  expect(await (await fetch(`${base}/api/health`)).json()).toEqual({ ok: true })
  expect(await (await post('/api/professor/chat', JSON.stringify(ask('Why lilac?')))).json()).toMatchObject({ kind: 'reply' })
  expect((await fetch(`${base}/api/nope`)).status).toBe(404)
})

test('bad JSON is a 400 with a notice the panel can show', async () => {
  const res = await post('/api/professor/chat', '{oops')
  expect(res.status).toBe(400)
  expect(await res.json()).toMatchObject({ kind: 'notice', reason: 'invalid' })
})
