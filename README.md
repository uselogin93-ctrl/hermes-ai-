# CareerPulse AI

Personal career automation. CareerPulse AI watches the work you already do (GitHub commits, pull
requests, Google Drive documents and notebooks), turns it into a grounded LinkedIn post with AI
agents, and puts the draft in front of you for approval. Nothing is published without a human
decision.

This repository is the implementation of the product specification in [`docs/`](./docs): the
overview, architecture, feature list, auth flows, agent design, UI specification, roadmap, database
schema, API contracts, agent prompts, project structure, model fallback strategy, UI standards and
technology framework detail.

---

## 1. What it does

1. **Scan.** The orchestrator pulls activity from every connected GitHub and Google Drive account
   for the last 24 hours and normalises it into one `activity_log` table.
2. **Research.** The Research Agent groups the activity, writes plain language summaries and
   classifies each item as `major`, `learning`, `minor` or `none`.
3. **Write.** The Writer Agent drafts a LinkedIn post in your voice, grounded only in the research
   summary, with hashtags and a suggested visual reference.
4. **Review.** The Reviewer Agent checks factual grounding, privacy, length, tone and banned
   phrases, then attaches a confidence score.
5. **Approve.** You read the draft next to its source evidence, edit it if you want, and approve,
   schedule or reject it. Only then is anything published to LinkedIn.

## 2. Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS v4 with a token based design system, shadcn style primitives on Radix UI |
| Icons | Phosphor Icons (functional use only) |
| Data | TanStack Query, React Hook Form, Zod |
| Charts | Recharts |
| Database | Postgres via Drizzle ORM. Supabase in production, embedded Postgres (PGlite) for local runs |
| Auth | Single operator session in an HTTP-only cookie, scrypt password hashing |
| Integrations | Octokit (GitHub), googleapis (Drive), direct REST (LinkedIn), Telegram Bot API, SMTP |
| AI | Provider agnostic router: Gemini, Groq, OpenRouter, GitHub Models, Ollama, plus a deterministic offline provider |
| Scheduler | GitHub Actions cron calling `/api/system/run-daily-cycle` |
| Tests | Vitest (unit), Playwright (end to end), ESLint + Prettier, GitHub Actions CI |

## 3. Repository layout

```
careerpulse-ai/
├── apps/web/                       # Next.js app: dashboard + API routes
│   ├── src/app/                   # routes, including the (dashboard) route group
│   ├── src/components/            # ui primitives, shell, feature components
│   ├── src/lib/
│   │   ├── agents/                # research / writer / reviewer agents, prompt files, model router
│   │   ├── connectors/            # github, google-drive, linkedin, oauth
│   │   ├── db/                    # drizzle schema and connection
│   │   ├── notifications/         # telegram + email
│   │   └── services/              # activity, drafts, publishing, orchestrator, settings, stats
│   ├── drizzle/                   # generated SQL migrations
│   ├── scripts/seed.ts            # sample workspace
│   └── e2e/                       # Playwright specs
├── packages/shared-types/         # shared types and Zod schemas
├── supabase/migrations/           # SQL migrations for Supabase CLI
├── docs/                          # the product specification this implementation follows
└── .github/workflows/             # daily-cycle.yml (cron) and ci.yml
```

## 4. Getting started

### Prerequisites

- Node.js 20.11 or newer
- pnpm 10

### Install and run

```bash
pnpm install
cp .env.example apps/web/.env.local      # fill in what you need
pnpm dev                                  # http://localhost:3000
```

Without `DATABASE_URL` the app starts an embedded Postgres (PGlite) in `apps/web/.data/pglite`, so
the product is fully usable with no external services. Sign in with `APP_ADMIN_EMAIL` and
`APP_ADMIN_PASSWORD` (defaults: `admin@careerpulse.local` / `careerpulse`).

### Sample data

```bash
pnpm --filter @careerpulse/web exec tsx scripts/seed.ts
```

This creates two sample connections, a week of realistic GitHub and Drive activity, a published post
and a pending draft that was produced by the real Research → Writer → Reviewer pipeline.

### Running without an AI key

Set `DEMO_MODE=1` (or simply configure no provider keys). The router then uses the deterministic
offline provider, which classifies and summarises the real activity it was given and produces a
grounded draft. It is clearly labelled in the UI and in the audit log.

## 5. Configuration

All variables are documented in [`.env.example`](./.env.example). The ones that matter most:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Managed Postgres (Supabase). Empty means the embedded database. |
| `TOKEN_ENCRYPTION_KEY` | AES-256-GCM key for OAuth tokens at rest. |
| `GITHUB_CLIENT_ID` / `_SECRET` | GitHub OAuth app, `repo` + `read:user` scopes. |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Google OAuth app, `drive.file` scope plus the Picker API. |
| `LINKEDIN_CLIENT_ID` / `_SECRET` | LinkedIn developer app, `w_member_social` scope. |
| `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GITHUB_MODELS_TOKEN` | AI providers, tried in the order defined in `src/lib/agents/providers.config.json`. |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Daily "draft ready" notification. |
| `SYSTEM_CRON_SECRET` | Shared secret for the scheduler endpoint. |

## 6. The daily cycle

```
cron (or the "Run the cycle now" button)
   -> scan activity from every connection
   -> normalise and store it in activity_log
   -> Research Agent  (group, summarise, classify)
   -> Writer Agent    (draft in your voice)
   -> Reviewer Agent  (grounding, privacy, tone, length, banned phrases)
   -> save the draft as pending
   -> notify you on Telegram
   -> you approve, schedule or reject
   -> publish to LinkedIn
```

Every step is written to `audit_log`, and every draft records the model provider, the model name
and the prompt versions that produced it.

### Model fallback

`src/lib/agents/model-router.ts` is the only place that talks to a model. When a provider is out
of quota, rate limited or down, the call falls through to the next provider in the chain. Only when
the whole chain fails does the run end as `skipped`, and you are notified. Reorder or extend the
chain in `src/lib/agents/providers.config.json`, no code change needed.

### Prompts

Prompts live in `apps/web/src/lib/agents/prompts/*.md` with a version header:

```
<!-- prompt_id: writer_agent, version: 1.3, updated: 2026-10-20 -->
```

Each draft stores the versions it was produced with, so any post can be traced back to the exact
instructions that wrote it.

## 7. API

All endpoints are server side, session protected and return JSON. Errors use one envelope:

```json
{ "error": { "code": "TOKEN_EXPIRED", "message": "…", "retryable": false } }
```

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/session` | Current session |
| GET | `/api/connections` | List connections |
| GET | `/api/connections/:provider/start` | Begin OAuth |
| GET | `/api/connections/:provider/callback` | OAuth callback |
| POST | `/api/connections/:id/disconnect` | Revoke at the provider and locally |
| GET | `/api/connections/:id/health` | Check the stored token |
| POST | `/api/activity/scan` | Manual scan |
| GET | `/api/activity` | Activity list |
| PATCH | `/api/activity/:id` | Exclude or include an item |
| POST | `/api/drafts/generate` | Run the agent pipeline |
| GET | `/api/drafts` | Draft list |
| GET | `/api/drafts/:id` | Draft, sources and versions |
| PATCH | `/api/drafts/:id` | Save an edit |
| POST | `/api/drafts/:id/regenerate` | Rewrite with optional guidance |
| POST | `/api/drafts/:id/approve` | Publish now or schedule |
| POST | `/api/drafts/:id/reject` | Reject |
| GET | `/api/posts` | Published posts with metrics |
| GET, PATCH | `/api/settings` | Read and update settings |
| POST | `/api/system/run-daily-cycle` | Cron entry point (shared secret header) |
| GET | `/api/system/audit-log` | Audit trail |
| POST | `/api/system/kill-switch` | Pause all automation |
| POST | `/api/notifications/test` | Send a test notification |

## 8. Security and privacy

- Nothing is posted without an explicit human approval. Auto-approve exists but is off by default
  and warns clearly in Settings.
- OAuth tokens are encrypted with AES-256-GCM before they are stored, and never leave the server.
- GitHub and Drive are read-only, LinkedIn is post-only. Private repositories are dropped during
  the scan, and excluded repos or folders never reach an agent.
- The kill switch pauses every automated action immediately.
- The full audit log records what was read, what was generated and what was published.
- The app sets no analytics or tracking cookies.

## 9. Design rules

The UI follows `docs/05-ui-design.md` and `docs/12-ui-standards-checklist.md`: a calm, dashboard
first interface with one accent colour, a warm neutral base, IBM Plex Sans and IBM Plex Mono, an
explicit dark mode, skeleton loaders, real empty states, hover states, keyboard shortcuts, copy
buttons and confirmation steps for destructive actions. The forbidden patterns list (gradients,
glassmorphism, neon, purple/black palettes, decorative icons, emoji cards, checkmark bullet lists,
fake social proof, sparkle icons) is treated as a build rule, not a suggestion.

## 10. Testing

```bash
pnpm typecheck     # TypeScript strict
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright, drafts approve and reject flow
pnpm lint
```

## 11. Deployment

- **Web app**: Vercel. Set every environment variable from `.env.example` and point the OAuth
  redirect URIs at the production domain.
- **Database**: Supabase. Run the migrations in `supabase/migrations` with the Supabase CLI.
- **Scheduler**: the GitHub Actions workflow in `.github/workflows/daily-cycle.yml`. Add `APP_URL`
  and `SYSTEM_CRON_SECRET` as repository secrets.

## 12. Licence

Personal project. Use it, adapt it, keep the approval gate.
