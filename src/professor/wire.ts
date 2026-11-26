/** What the browser and the empirica-api server send each other. Shared by both sides. */

export interface Draft {
  equipment: string
  question: string
  measures: string
  location: string
  phone: string
}

export interface ChatRequest {
  station?: string
  notebook: string[]
  /** Earlier turns. Professor turns carry the server's signature back. */
  history: { role: 'user' | 'assistant'; text: string; sig?: string }[]
  message: string
}

export type Notice = 'invalid' | 'too-long' | 'rate-limit' | 'budget' | 'screened' | 'off-topic' | 'unavailable' | 'ticket-cap' | 'expired'

export type ChatResponse =
  | { kind: 'reply'; text: string; sig: string; draft?: { draft: Draft; token: string } }
  | { kind: 'notice'; reason: Notice; text: string }

export type TicketResponse =
  | { kind: 'filed'; number: number; url: string }
  | { kind: 'commented'; number: number; url: string }
  | { kind: 'notice'; reason: Notice; text: string }
