/**
 * The first gate on student text: a local check for prompt-injection and other problem text.
 * It runs before any model sees the message, so a hit costs nothing and can't be talked around.
 * The test set in `screen.cases.ts` holds the attacks it must stop and the lab talk it must let through.
 */

export type ScreenResult = { ok: true } | { ok: false; reason: 'injection' | 'personal' }

const W = '[\\s\\S]{0,40}?'

/** Each rule names what it catches. Keep them narrow: lab talk uses words like "ignore" and "previous" too. */
const RULES: { reason: 'injection' | 'personal'; re: RegExp }[] = [
  // "Ignore previous instructions", "forget all your rules", "disregard the above prompt"...
  {
    reason: 'injection',
    re: new RegExp(
      `\\b(ignore|forget|disregard|override|bypass|drop|abandon)\\b${W}\\b(previous|prior|above|earlier|preceding|all|your|any|system|these|those|original)\\b${W}\\b(instructions?|rules|prompts?|directions|guidelines|directives|programming|constraints|guardrails|restrictions|messages|context)\\b`,
    ),
  },
  // Asking for the hidden prompt.
  { reason: 'injection', re: /\b(system|initial|hidden|original|developer|secret|base)\s+(prompt|instructions?|message|rules)\b/ },
  { reason: 'injection', re: /\b(reveal|repeat|print|show|output|recite|dump|leak|tell me|what (is|are|were))\b[\s\S]{0,30}?\byour\b[\s\S]{0,20}?\b(instructions|prompt|rules|guidelines|configuration)\b/ },
  { reason: 'injection', re: /\b(repeat|print|output|copy)\b[\s\S]{0,20}?\b(the (text|words|everything) above|everything (above|before this))\b/ },
  // Swapping the professor for someone else.
  { reason: 'injection', re: /\byou are (now|no longer)\b|\bfrom now on,? you\b|\byou('re| are) (actually|really) an?\b/ },
  { reason: 'injection', re: /\b(pretend|imagine) (that )?you('re| are)\b|\b(role-?play|role play)\b/ },
  { reason: 'injection', re: /\bact as (if you (were|are)|an? (ai|assistant|chatbot|different|new|unrestricted|unfiltered|evil|hacker|lawyer|doctor|bank)|my)\b/ },
  { reason: 'injection', re: /\b(jailbreak|jail-break|dan mode|do anything now|developer mode|god mode|unfiltered mode|without (any )?(restrictions|filters|rules))\b|\bDAN\b/i },
  // Fake turn and prompt markers.
  { reason: 'injection', re: /^\s*(system|assistant|developer)\s*:/m },
  { reason: 'injection', re: /<\/?\s*(system|assistant|instructions?|untrusted[\w-]*|student[\w-]*)\s*>|\[\/?(inst|system)\]|<\|im_(start|end)\|>|<<\/?sys>>/ },
  // Getting the professor to act outside the lab, or to file on the student's behalf without asking.
  { reason: 'injection', re: /\b(file|open|create|submit|post)\b[\s\S]{0,30}?\b(tickets?|issues?)\b[\s\S]{0,30}?\bwithout\b[\s\S]{0,20}?\b(asking|confirm\w*|permission|approval)\b/ },
  { reason: 'injection', re: /\b(delete|wipe|erase|close|drain|hack|transfer from|access)\b[\s\S]{0,30}?\b(bank|account|emails?|password|database|server|repo(sitory)?|files)\b/ },
  // Personal or financial details have no place in a public lab chat.
  { reason: 'personal', re: /\b(bank account|credit card|card number|social security|password|passcode|pin number|routing number)\b/ },
]

/** Lowercase, drop zero-width and control characters, fold look-alike spacing, so tricks like "i g n o r e" don't slip by as easily. */
export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[​-‏⁠﻿­]/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .toLowerCase()
}

export function screenText(text: string): ScreenResult {
  const t = normalize(text)
  const collapsed = t.replace(/(?<=\b\w) (?=\w\b)/g, '') // "i g n o r e" -> "ignore"
  for (const rule of RULES) if (rule.re.test(t) || rule.re.test(collapsed)) return { ok: false, reason: rule.reason }
  return { ok: true }
}

/** What the professor says instead, without calling a model. */
export const SCREEN_REPLY: Record<'injection' | 'personal', string> = {
  injection:
    "I can only help with the lab: its equipment, its science and your experiments. What were you trying to find out at the bench?",
  personal:
    "Please don't share personal or financial details here; this chat is only for the lab. What are you working on in your experiment?",
}
