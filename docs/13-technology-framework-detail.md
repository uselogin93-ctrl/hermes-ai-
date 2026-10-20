# Technology & Framework Detail

This expands on `06-tech-stack-roadmap.md` with the actual libraries/packages, not just layer names — this is what should end up in `package.json`.

## 1. Frontend
| Need | Choice | Notes |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | Matches your existing stack; server components reduce client-side token exposure |
| Language | **TypeScript** | Non-negotiable for a system with this many data shapes (schemas, API contracts) |
| Styling | **Tailwind CSS** | Already in your stack |
| Component primitives | **shadcn/ui** (built on Radix UI) | Accessible by default, unstyled primitives you theme yourself — avoids the generic "AI template" look from `12-ui-standards-checklist.md` |
| Icons | **Phosphor Icons** or **Radix Icons** | Deliberately *not* Lucide-as-decoration per the forbidden list — pick one icon set and use it only where functionally needed |
| State/data fetching | **TanStack Query (React Query)** | For client-side data fetching/caching against your API routes (drafts, activity feed, settings) |
| Forms | **React Hook Form** + **Zod** | Zod schemas double as your API validation layer (see below) |
| Charts (analytics screen) | **Recharts** or **Tremor** | Tremor is purpose-built for dashboard-style metrics, worth evaluating over Recharts |
| Toasts | **Sonner** | Clean, accessible toast library, pairs well with shadcn/ui |
| Dark mode | **next-themes** | Standard pairing with Tailwind + shadcn/ui |

## 2. Backend
| Need | Choice | Notes |
|---|---|---|
| API layer | **Next.js Route Handlers** (`app/api/.../route.ts`) | Keeps frontend+backend in one deployable app; matches the endpoint list in `08-api-contracts.md` |
| Validation | **Zod** | Same schemas shared between frontend forms and API route validation (put in `packages/shared-types`) |
| Database client | **Supabase JS client** (server-side, service role key) | For all server-side DB access; never expose service role key to client |
| Background/cron jobs | **GitHub Actions scheduled workflow** calling `/api/system/run-daily-cycle` | Free, matches your existing career-agent approach; alternative: Supabase Edge Functions with `pg_cron` |
| Encryption | **Node `crypto` (AES-256-GCM)** | For encrypting OAuth tokens at rest before storing in Supabase |
| Queue (if needed later) | **Supabase Postgres as a simple job table** initially; **BullMQ + Redis** only if you outgrow a single daily batch job | Don't add Redis/queue infra prematurely — single-user, once-daily volume doesn't need it at first |

## 3. Database
| Need | Choice | Notes |
|---|---|---|
| Database | **Supabase (Postgres)** | You've used it before (billing-saas project) |
| Migrations | **Supabase CLI migrations** (`supabase/migrations/*.sql`) | Keep schema from `07-database-schema.md` in version control |
| ORM/query layer | **Supabase JS client directly**, or **Drizzle ORM** if you want typed queries | Drizzle recommended once the schema stabilizes — gives compile-time safety on the tables in `07-database-schema.md` |

## 4. Integrations / SDKs
| Service | Library |
|---|---|
| GitHub | **Octokit** (`@octokit/rest`, `@octokit/auth-oauth-app`) — official GitHub SDK |
| Google Drive | **`googleapis`** npm package (official Google API client) + **Google Picker API** (loaded client-side via script tag for folder selection) |
| LinkedIn | No official SDK — use **direct REST calls** via `fetch` to LinkedIn's API (`api.linkedin.com/rest/...`) with your own thin wrapper, since LinkedIn doesn't maintain a first-party JS SDK |
| Telegram | **`node-telegram-bot-api`** or raw REST calls via `fetch` (Telegram's Bot API is simple enough that a raw wrapper is often cleaner) |

## 5. AI / Model layer
| Need | Choice | Notes |
|---|---|---|
| Primary provider | **`@google/generative-ai`** (Gemini SDK) | Matches `11-ai-model-fallback.md` primary choice |
| Fallback providers | **Groq SDK** (`groq-sdk`), **OpenRouter** (plain REST, OpenAI-compatible format), **GitHub Models** (OpenAI-compatible REST endpoint) | All roughly OpenAI-compatible request/response shape — makes the router in `11-ai-model-fallback.md` simpler to implement uniformly |
| Local fallback (optional) | **Ollama** via its REST API (`localhost:11434`) | No SDK needed, plain HTTP |
| Schema-constrained output | **Zod** + manual JSON parsing/validation of model output (retry on parse failure) | Needed since agent outputs must match the schemas in `08-api-contracts.md` |

## 6. Auth
| Need | Choice | Notes |
|---|---|---|
| App login | **Supabase Auth** (Google OAuth provider pre-built in) | Simplest path — Supabase already handles the "Sign in with Google" flow for your own app login, separate from the Drive OAuth connection |
| OAuth for integrations | **Custom OAuth flows** (Authorization Code) implemented per-provider, per `03-auth-integrations.md` | These are separate from app login — they're *you* granting the app access to GitHub/Drive/LinkedIn, not login |

## 7. Testing & tooling
| Need | Choice |
|---|---|
| Unit/integration tests | **Vitest** |
| E2E tests | **Playwright** (at least for the Draft Review approve/reject flow — your highest-stakes screen) |
| Linting/formatting | **ESLint + Prettier** |
| Type checking | **TypeScript strict mode** |
| CI | **GitHub Actions** (same place your daily cron lives) — run lint/test/typecheck on every push |

## 8. Hosting/deployment
| Need | Choice |
|---|---|
| App hosting | **Vercel** (free tier sufficient for single-user traffic) |
| Database | **Supabase** (free tier to start) |
| Cron | **GitHub Actions** (free for public/private repos within limits) |
| Secrets | Vercel project env vars (production) + GitHub Actions repo secrets (for the cron workflow's own calls) |

## 9. Why not X alternatives (brief rationale)
- **Why not a separate Express/Fastify backend?** Next.js Route Handlers are sufficient for this scope and keep one deployable unit — add a separate backend only if you outgrow serverless function limits.
- **Why not Prisma instead of Drizzle/Supabase client?** Either works; Drizzle is lighter-weight and pairs well with Supabase's Postgres directly. Prisma is a fine alternative if you're more familiar with it already.
- **Why not a dedicated job queue from day one?** Single-user, once-daily cadence doesn't justify Redis/BullMQ infrastructure yet — a simple cron-triggered API call is enough; revisit only if you add multi-user or intra-day scheduling later.
