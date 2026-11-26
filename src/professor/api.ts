import type { ChatRequest, ChatResponse, Draft, TicketResponse } from './wire'

export const UNAVAILABLE = "The professor is unavailable right now. The rest of the lab still works; try again later."

const unavailable = { kind: 'notice' as const, reason: 'unavailable' as const, text: UNAVAILABLE }

export interface ProfessorApi {
  /** Is the professor's server up? */
  health(): Promise<boolean>
  chat(req: ChatRequest): Promise<ChatResponse>
  confirm(draft: Draft, token: string): Promise<TicketResponse>
}

/**
 * Talks to empirica-api at `/api`. The static site works without it: any failure to reach it,
 * or an answer that isn't the server's JSON, comes back as "unavailable".
 */
export function professorApi(fetchFn: typeof fetch = (...a) => fetch(...a), base = '/api'): ProfessorApi {
  const post = async <T>(path: string, body: unknown): Promise<T | typeof unavailable> => {
    try {
      const res = await fetchFn(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (!(res.headers.get('content-type') ?? '').includes('application/json')) return unavailable
      const json = await res.json()
      return json && typeof json.kind === 'string' ? (json as T) : unavailable
    } catch {
      return unavailable
    }
  }
  return {
    async health() {
      try {
        const res = await fetchFn(`${base}/health`)
        return res.ok && (res.headers.get('content-type') ?? '').includes('application/json') && (await res.json()).ok === true
      } catch {
        return false
      }
    },
    chat: (req) => post<ChatResponse>('/professor/chat', req),
    confirm: (draft, token) => post<TicketResponse>('/professor/tickets', { draft, token }),
  }
}
