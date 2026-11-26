import Anthropic from '@anthropic-ai/sdk'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { Daily, fileStore, memoryStore } from './budget'
import { githubTracker } from './github'
import { apiHandler } from './http'
import { LAB_CATALOG } from './labCatalog'
import { anthropicModels } from './models'
import { createProfessor } from './professor'
import { RateLimiter } from './rateLimit'

/** The empirica-api container. Settings come from /srv/secrets/empirica.env (see server/README.md). */
const env = process.env
const log = (msg: string) => console.log(`${new Date().toISOString()} ${msg}`)

if (!env.ANTHROPIC_API_KEY) log('ANTHROPIC_API_KEY is not set: every chat will say the professor is unavailable')
if (!env.GITHUB_TOKEN) log('GITHUB_TOKEN is not set: drafts work, but confirming one says unavailable')
if (!env.SIGNING_SECRET) log('SIGNING_SECRET is not set: using a random one, so drafts and conversations end on restart')

const models = anthropicModels(new Anthropic({ apiKey: env.ANTHROPIC_API_KEY ?? 'unset', maxRetries: 1, timeout: 60_000 }), LAB_CATALOG)
const professor = createProfessor({
  catalog: LAB_CATALOG,
  topic: models.topic,
  model: models.professor,
  tracker: env.GITHUB_TOKEN ? githubTracker(env.GITHUB_REPO ?? 'arwagner/empirica', env.GITHUB_TOKEN) : null,
  daily: new Daily(env.STATE_FILE ? fileStore(env.STATE_FILE) : memoryStore(), Number(env.DAILY_BUDGET_USD ?? 0.3), Number(env.DAILY_ISSUES ?? 5)),
  chatLimit: new RateLimiter(Number(env.MESSAGES_PER_HOUR ?? 20), 60 * 60 * 1000),
  ticketLimit: new RateLimiter(5, 60 * 60 * 1000),
  secret: env.SIGNING_SECRET || randomBytes(32).toString('hex'),
  log,
})

const port = Number(env.PORT ?? 8787)
createServer(apiHandler(professor, { trustProxy: env.TRUST_PROXY === '1' })).listen(port, () => log(`empirica-api listening on ${port}`))
