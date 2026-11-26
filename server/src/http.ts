import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Professor } from './professor'

const MAX_BODY = 64 * 1024

/** Who's asking. Behind Caddy, the client is the last hop it added to X-Forwarded-For. */
export function clientIp(req: IncomingMessage, trustProxy: boolean): string {
  const fwd = req.headers['x-forwarded-for']
  if (trustProxy && typeof fwd === 'string' && fwd.trim()) return fwd.split(',').at(-1)!.trim()
  return req.socket.remoteAddress ?? 'unknown'
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const c of req) {
    size += (c as Buffer).length
    if (size > MAX_BODY) throw new Error('too large')
    chunks.push(c as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const send = (res: ServerResponse, status: number, body: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

/** Routes `/api/*` to the professor. All the decisions live in `Professor`; this only moves JSON. */
export function apiHandler(professor: Professor, opts: { trustProxy: boolean }) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const path = (req.url ?? '').split('?')[0]
    if (req.method === 'GET' && path === '/api/health') return send(res, 200, { ok: true })
    const route = req.method === 'POST' && { '/api/professor/chat': professor.chat, '/api/professor/tickets': professor.confirmTicket }[path]
    if (!route) return send(res, 404, { error: 'not found' })
    let body: unknown
    try {
      body = await readJson(req)
    } catch {
      return send(res, 400, { kind: 'notice', reason: 'invalid', text: "I couldn't read that message." })
    }
    send(res, 200, await route(body, clientIp(req, opts.trustProxy)))
  }
}
