# Implementation notes

How the specification in `docs/` maps onto the code in this repository. Use it as a checklist: every
row is either implemented, partially implemented (with the reason given) or deliberately different
from the specification.

## 1. Document map

| Spec file | Where it lives in the code |
|---|---|
| `00-overview.md` | `README.md`, `src/app/(dashboard)/dashboard/page.tsx` |
| `01-architecture.md` | `src/lib/connectors/`, `src/lib/services/orchestrator.ts`, `src/lib/agents/`, `src/lib/db/`, `src/app/(dashboard)/`, `src/lib/notifications/` |
| `02-features.md` | The screens under `src/app/(dashboard)/` and the services in `src/lib/services/` |
| `03-auth-integrations.md` | `src/lib/connectors/oauth.ts`, `src/lib/connectors/{github,google-drive,linkedin}.ts`, `src/lib/security/crypto.ts` |
| `04-ai-agents.md` | `src/lib/agents/index.ts` (research, writer, reviewer) and `src/lib/services/drafts.ts` (orchestration) |
| `05-ui-design.md` | `src/app/globals.css` (tokens), `src/components/ui/`, `src/components/shell/`, the screens under `src/app/(dashboard)/` |
| `06-tech-stack-roadmap.md` | `package.json` in `apps/web` and `packages/shared-types`, `.github/workflows/` |
| `07-database-schema.md` | `src/lib/db/schema.ts`, `apps/web/drizzle/`, `supabase/migrations/` |
| `08-api-contracts.md` | `src/app/api/**/route.ts` |
| `09-agent-prompts.md` | `src/lib/agents/prompts/*.md` and `src/lib/agents/prompts/index.ts` |
| `10-project-structure-env.md` | Repository layout, `.env.example`, `apps/web/scripts/seed.ts` |
| `11-ai-model-fallback.md` | `src/lib/agents/model-router.ts`, `src/lib/agents/providers.config.json`, `src/lib/agents/providers/` |
| `12-ui-standards-checklist.md` | `src/components/` (required components) and the design tokens in `src/app/globals.css` |
| `13-technology-framework-detail.md` | Dependency list in `apps/web/package.json` |

## 2. Data flow

| Step | Implementation |
|---|---|
| Scheduler fires | `.github/workflows/daily-cycle.yml` calls `POST /api/system/run-daily-cycle` with the `x-system-secret` header |
| Pull activity | `scanActivity()` in `src/lib/services/activity.ts`, one call per active connection |
| Normalise and store | `activity_log`, unique on `(source, source_connection_id, external_id)` |
| Research | `runResearchAgent()` in `src/lib/agents/index.ts` |
| Write | `runWriterAgent()`, with the tone profile and the recent post topics |
| Review | `runReviewerAgent()`, one automatic rewrite when the confidence is below 0.6 |
| Save | `drafts` row with status `pending`, plus a `draft_versions` row |
| Notify | `notifyDraftReady()` in `src/lib/services/notifications.ts` (Telegram, email fallback) |
| Approve | `POST /api/drafts/:id/approve` → `publishDraftToLinkedIn()` |
| Record | `posts` row with the LinkedIn post id and the metrics |

## 3. Deliberate differences

| Specification | Implementation | Reason |
|---|---|---|
| Supabase Auth with "Sign in with Google" | Local single operator account with a scrypt hashed password and a signed HTTP-only session cookie | The app has to run without a Supabase project, and `03-auth-integrations.md` explicitly allows a single admin account. The session layer is isolated in `src/lib/auth/`, so swapping in Supabase Auth touches one module. |
| Supabase Postgres only | Drizzle ORM over Postgres, with an embedded Postgres (PGlite) fallback when `DATABASE_URL` is empty | Same SQL and same schema in both modes, so the product is usable with no infrastructure. The Drizzle schema and the SQL in `supabase/migrations/` are identical to `07-database-schema.md`. |
| `googleapis` for Drive | `googleapis` is used for OAuth and file listing; the Picker API is documented as the recommended flow | Keeps one dependency rather than a second Drive client. |
| Octokit for GitHub | `@octokit/rest` events feed plus a visibility lookup per repository | The events feed covers pushes, new repositories and pull requests in one call. |
| LinkedIn SDK | Direct REST calls to `api.linkedin.com/rest/posts` | LinkedIn has no first party SDK, as the specification states. |
| Auto publish on approval | Approval publishes when LinkedIn is connected, otherwise the exact text is handed back for manual posting | The "Share on LinkedIn" product needs LinkedIn review, and the roadmap explicitly allows a manual copy and paste phase before that approval exists. |
| Engagement metrics from LinkedIn | The stored metrics are kept and refreshed, and the UI states that per post analytics need the additional LinkedIn product | The available LinkedIn products do not expose per post engagement to this app. |
| Redis job queue | A single daily batch through one API call | The specification advises against a queue at this scale. |
| Bundled prompt strings | Markdown files in `src/lib/agents/prompts/` with a version header, loaded at runtime | The specification requires prompts to live in version controlled files so they can be tuned without a code change. |

## 4. Requirements that need external accounts

These parts are implemented but cannot be exercised until the matching developer account exists:

| Requirement | What is needed |
|---|---|
| GitHub activity scanning | A GitHub OAuth app with `repo` and `read:user` scopes |
| Google Drive activity scanning | A Google Cloud project with the Drive API, the `drive.file` scope and the Picker API |
| LinkedIn publishing | A LinkedIn developer app with the "Sign In with LinkedIn" and "Share on LinkedIn" products. The publishing product is subject to LinkedIn review |
| Telegram notifications | A bot token from BotFather and a chat id |
| Email fallback | `SMTP_URL` and `EMAIL_FROM` |
| Scheduled runs | `APP_URL` and `SYSTEM_CRON_SECRET` as GitHub Actions repository secrets |

## 5. Design system notes

- Palette: warm limestone neutrals with a single clay accent, plus semantic success, warning, danger
  and info colours. Light and dark themes are defined as CSS variables in `src/app/globals.css`.
- Type: IBM Plex Sans for the interface, IBM Plex Mono for identifiers, timestamps and diffs. Chosen
  deliberately, since the specification rules out defaulting to Inter, Geist or Space Grotesk.
- Depth: borders and surface tints. Shadows are limited to the two levels defined in the token file
  and are used for overlays only.
- Icons: Phosphor Icons, used only where they carry meaning.
- Required components from `12-ui-standards-checklist.md`: dark mode toggle (`theme-toggle.tsx`),
  skeleton loaders (`ui/skeleton.tsx`), sticky header (`shell/app-header.tsx`), back to top
  (`shell/back-to-top.tsx`), skip to content link (`shell/app-shell.tsx`), responsive layout, keyboard
  shortcuts with a visible panel (`shell/shortcuts.tsx`), open graph metadata (`app/layout.tsx`),
  empty states (`dashboard/summary-strip.tsx`), hover states on every interactive element, themed
  scrollbars, an expandable FAQ in Settings, toasts (Sonner), copy to clipboard buttons
  (`drafts/copy-button.tsx`) and a password visibility toggle (`app/login/login-form.tsx`).
