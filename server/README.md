# empirica-api: the AI professor

A small Node service that lets visitors talk to the lab's AI professor. The static site works without it;
the Professor tab then says the professor is unavailable.

## What happens to a message

`POST /api/professor/chat` (`src/professor.ts`, `createProfessor().chat`), in order. Each gate that stops a
message answers with a friendly notice and makes no API call:

1. **Shape and size** (`LIMITS`): at most 1000 characters a message, 20 student turns a conversation,
   the 40 newest notebook lines of 300 characters.
2. **Rate limit**: 20 messages an hour per visitor (`rateLimit.ts`).
3. **Injection screen** (`screen.ts`): a local check for "ignore previous instructions", role-play, prompt
   extraction, fake role markers and personal details. Earlier student turns are screened again; notebook
   lines that fail are withheld. The test set is `screen.cases.ts`.
4. **Signed history**: the browser holds the conversation, so every professor reply carries an HMAC and
   unsigned or altered replies are rejected.
5. **Daily budget** (`budget.ts`): the worst case for the turn must fit in what's left of today's
   $0.30 (UTC days). Otherwise the professor is "resting until tomorrow".
6. **Topic check**: Claude Haiku 5.5 says whether the message is about the lab. Anything unclear counts as off topic.
7. **The professor**: Claude Sonnet 5.5 (`models.ts`), effort `low`, at most 1500 output tokens, with the
   rules and the catalog in a cached system prompt. Student text and notebook lines are wrapped in
   `<student_message>` / `<student_context>` tags as data. Server-side refusal fallbacks are on
   (`fallbacks: "default"`), so a safety-classifier decline is retried on Anthropic's default fallback model.
   A reply that quotes the system prompt is withheld.

The model has one tool, `propose_equipment_ticket`, which only drafts. Nothing is filed until the student
presses Confirm.

## Equipment tickets

`POST /api/professor/tickets` takes a draft and the token the server signed it with (valid for an hour,
usable once). It then:

1. searches open `professor-suggestion` issues and comments on one that asks for the same equipment, or
2. files a new issue with that label, at most 5 a day across all visitors.

Issue text is stripped of mentions, links and HTML, and the body follows `CLAUDE.md`: it says how the
equipment behaves on a phone and lists the phone checks.

## Privacy

Conversations live only in the visitor's browser tab (session storage). The server keeps two things:

- per-visitor rate-limit counters, in memory only, keyed by an HMAC of the IP with a salt made fresh at
  every start, and dropped once the visitor's hour is up;
- today's spend and issue count, in `STATE_FILE`, so a restart doesn't reset the budget.

## Settings (`/srv/secrets/empirica.env`)

| Variable | |
| --- | --- |
| `ANTHROPIC_API_KEY` | Key from the dedicated empirica Console workspace (spend limit $10/month). |
| `GITHUB_TOKEN` | Fine-grained token for this repo only, Issues read/write. Without it, confirming says unavailable. |
| `GITHUB_REPO` | Default `arwagner/empirica`. |
| `SIGNING_SECRET` | Long random string. Without it, a random one is used and drafts end on restart. |
| `DAILY_BUDGET_USD` | Default `0.3`. |
| `DAILY_ISSUES` | Default `5`. |
| `MESSAGES_PER_HOUR` | Default `20`. |
| `STATE_FILE` | Where today's counters live. The container uses `/data/counters.json`; mount `/data`. |
| `TRUST_PROXY` | `1` behind Caddy, to read the visitor's IP from `X-Forwarded-For`. The container sets it. |
| `PORT` | Default `8787`. |

## Running it

    npm run build:server             # dist-server/main.mjs, with the catalog bundled in
    npm run dev:server               # builds, then serves on :8787 (reads server/.env if present)
    npm run dev                      # the site; Vite proxies /api to :8787
    docker build -f server/Dockerfile -t empirica-api .

The catalog (`labCatalog.ts`) is built from `src/content/registry.ts` and `src/world/places.ts` when the
server is bundled, so a new station, piece of equipment or experiment reaches the professor on the next deploy.
