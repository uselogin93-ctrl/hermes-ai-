# Project Structure & Environment Setup

## 1. Repository structure

```
careerpulse-ai/
├── apps/
│   └── web/                        # Next.js app (dashboard + API routes)
│       ├── app/
│       │   ├── (dashboard)/
│       │   │   ├── page.tsx                # Dashboard home
│       │   │   ├── drafts/[id]/page.tsx     # Draft review screen
│       │   │   ├── activity/page.tsx        # Activity timeline
│       │   │   ├── analytics/page.tsx
│       │   │   └── settings/page.tsx
│       │   ├── api/
│       │   │   ├── auth/...
│       │   │   ├── connections/...
│       │   │   ├── activity/...
│       │   │   ├── drafts/...
│       │   │   ├── posts/...
│       │   │   ├── settings/...
│       │   │   └── system/...
│       │   └── layout.tsx
│       ├── components/
│       │   ├── ui/                 # shadcn/ui-based primitives
│       │   ├── draft-review/
│       │   ├── activity-feed/
│       │   └── connection-card/
│       └── lib/
│           ├── db/                 # Supabase client + queries
│           ├── connectors/
│           │   ├── github.ts
│           │   ├── google-drive.ts
│           │   └── linkedin.ts
│           ├── agents/
│           │   ├── research-agent.ts
│           │   ├── writer-agent.ts
│           │   ├── reviewer-agent.ts
│           │   └── prompts/        # versioned prompt templates (.md)
│           └── notifications/
│               └── telegram.ts
├── packages/
│   └── shared-types/                # ActivityEvent, Draft, Post, etc. shared types
├── supabase/
│   ├── migrations/                  # SQL migration files (see 07-database-schema.md)
│   └── seed.sql
├── .github/
│   └── workflows/
│       └── daily-cycle.yml          # cron trigger calling /api/system/run-daily-cycle
├── .env.example
└── README.md
```

## 2. Environment variables (`.env.example`)

```bash
# App
APP_URL=https://careerpulse.yourdomain.com
APP_SESSION_SECRET=
APP_ADMIN_EMAIL=                      # for single-user login, if not using Google sign-in

# Supabase / Postgres
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server-only, never exposed to client

# Encryption
TOKEN_ENCRYPTION_KEY=                 # AES-256 key for encrypting stored OAuth tokens

# GitHub OAuth App
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_OAUTH_REDIRECT_URI=

# Google OAuth (Drive + app login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=
GOOGLE_DRIVE_API_KEY=                 # for Picker API

# LinkedIn OAuth
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_OAUTH_REDIRECT_URI=

# AI provider
GEMINI_API_KEY=

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Scheduler security
SYSTEM_CRON_SECRET=                   # shared secret header for /api/system/run-daily-cycle
```

## 3. External setup checklist (one-time, before coding)
1. **Supabase project** — create project, run initial migration (from `07-database-schema.md`).
2. **GitHub OAuth App** — register at github.com/settings/developers; set callback URL; note client id/secret.
3. **Google Cloud project** — enable Drive API; configure OAuth consent screen; create OAuth client; enable Picker API; get API key.
4. **LinkedIn Developer App** — create app at linkedin.com/developers; request "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn" products (the latter requires review — start this immediately, it's the longest lead time in the whole project).
5. **Telegram bot** — create via BotFather, get bot token, get your chat id.
6. **GitHub Actions secrets** — mirror the relevant `.env` values into repo secrets for the cron workflow.

## 4. Local dev vs production
- Local dev: use `.env.local`, point OAuth redirect URIs to `http://localhost:3000/...` (register these as additional redirect URIs on each provider — most allow multiple).
- Production: deploy web app to Vercel, set the same env vars in Vercel project settings, point OAuth redirect URIs to the production domain.
- Supabase: same project can serve both, or use separate dev/prod Supabase projects for safety — recommended once the app is stable.

## 5. Suggested build order (maps to `06-tech-stack-roadmap.md` phases)
1. Scaffold Next.js app + Supabase connection + run migrations.
2. Implement app login.
3. Implement GitHub connector + `/api/activity/scan` (GitHub only) + activity timeline UI.
4. Implement Google Drive connector, extend scan + timeline.
5. Implement agents (`research-agent.ts`, `writer-agent.ts`) + `/api/drafts/generate` + Draft Review UI (no posting yet).
6. Implement LinkedIn connector + Reviewer Agent + `/api/drafts/:id/approve` → real publish.
7. Add GitHub Actions cron → `/api/system/run-daily-cycle`.
8. Add Telegram notifications.
9. Add analytics + settings screens.
10. Harden: audit log, kill switch, token-refresh handling, error states.
