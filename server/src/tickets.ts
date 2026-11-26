import { createHmac } from 'node:crypto'
import { z } from 'zod'
import type { Draft } from '../../src/professor/wire'
import { safeEqual } from './safeEqual'
import { screenText } from './screen'

export const SUGGESTION_LABEL = 'professor-suggestion'

const field = (max: number) => z.string().trim().min(1).max(max)

/** What the professor drafts and the student confirms. */
export const DraftSchema = z.object({
  equipment: field(80),
  question: field(400),
  measures: field(300),
  location: field(120),
  phone: field(400),
}) satisfies z.ZodType<Draft>
export type { Draft }

/** The tool the professor drafts with. It only drafts: filing happens when the student presses Confirm. */
export const DRAFT_TOOL = {
  name: 'propose_equipment_ticket',
  description:
    "Draft a request for equipment the lab doesn't have, when it would answer the student's question. The student sees the draft and decides whether to send it; this does not file anything.",
  strict: true,
  input_schema: {
    type: 'object' as const,
    additionalProperties: false,
    required: Object.keys(DraftSchema.shape),
    properties: {
      equipment: { type: 'string', description: 'Name of the equipment, e.g. "Geiger counter".' },
      question: { type: 'string', description: "The student's question it would answer, in a sentence." },
      measures: { type: 'string', description: 'What it would measure, with units.' },
      location: { type: 'string', description: 'Which existing station or room it belongs in.' },
      phone: { type: 'string', description: 'How a student would use it on a phone: touch only, a 360px-wide screen.' },
    },
  },
}

/** A signed draft. The token proves the professor drafted exactly this, recently, so the confirm step can't be forged. */
export function signDraft(secret: string, draft: Draft, expiresAt: number): string {
  return `${expiresAt}.${mac(secret, draft, expiresAt)}`
}

export function verifyDraft(secret: string, draft: Draft, token: string, now: number): boolean {
  const [exp, sig] = token.split('.')
  const expiresAt = Number(exp)
  if (!Number.isFinite(expiresAt) || expiresAt < now || !sig) return false
  return safeEqual(mac(secret, draft, expiresAt), sig)
}

const mac = (secret: string, d: Draft, exp: number) =>
  createHmac('sha256', secret)
    .update(JSON.stringify([exp, d.equipment, d.question, d.measures, d.location, d.phone]))
    .digest('base64url')

/** Anything a draft would put in a public issue must pass the same screen as chat. */
export const draftIsClean = (d: Draft) => Object.values(d).every((v) => screenText(v).ok)

/** Make model-written text safe for a public issue: no mentions, links, images or HTML. */
export function plain(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\bhttps?:\/\/\S+/gi, '[link removed]')
    .replace(/@(?=[\w-])/g, '@​')
    .replace(/#(?=\d)/g, '#​')
    .replace(/`/g, "'")
    .trim()
}

export const issueTitle = (d: Draft) => `Equipment: ${plain(d.equipment)}`

/** The issue body, in the shape the repo's CLAUDE.md asks tickets to take (phone behaviour and checks included). */
export function issueBody(d: Draft): string {
  return `A student asked the AI professor something the lab can't measure yet. The professor suggested this equipment and the student confirmed the request.

## What it would answer
${plain(d.question)}

## What it would measure
${plain(d.measures)}

## Where it belongs
${plain(d.location)}

## On a phone
${plain(d.phone)}

## Acceptance criteria
- [ ] ${plain(d.equipment)} is in the lab at ${plain(d.location)} and appears in the equipment catalog.
- [ ] It measures: ${plain(d.measures)}
- [ ] Phone (360px wide, touch): no horizontal page scroll, tap targets at least 44px, nothing that needs hover, a keyboard shortcut or mouse lock, and keyboard hints hidden on touch.
- [ ] Desktop works as before.

_Filed automatically from the professor chat. Review before building._`
}

export const commentBody = (d: Draft) =>
  `Another student asked for this.\n\n**Their question:** ${plain(d.question)}\n\n**What they'd measure:** ${plain(d.measures)}`

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/^equipment:\s*/, '')
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'for', 'with'].includes(w))
      .map((w) => w.replace(/s$/, '')),
  )

/** Is this open issue asking for the same equipment? Compares the significant words of the names. */
export function sameEquipment(issueTitle: string, equipment: string): boolean {
  const a = words(issueTitle)
  const b = words(equipment)
  if (!a.size || !b.size) return false
  const shared = [...a].filter((w) => b.has(w)).length
  return shared / Math.min(a.size, b.size) >= 0.75
}
