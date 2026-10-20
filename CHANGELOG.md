# Changelog

All notable changes to CareerPulse AI are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-20

First versioned release. Implements the product specification in `docs/`.

### Added

- **Application shell** — Next.js 15 App Router with a sticky header, sidebar navigation, skip to
  content link, back to top control, keyboard shortcut panel, explicit light/dark/system theme
  switch and a privacy notice.
- **Authentication** — single operator sign-in with scrypt hashed passwords and an HTTP-only signed
  session cookie, plus login, logout and session endpoints.
- **Integration layer** — GitHub connector (events feed, private repository filtering), Google
  Drive connector (file list with folder awareness), LinkedIn publishing connector, OAuth start and
  callback routes with signed state, token encryption at rest (AES-256-GCM), disconnect with remote
  revocation and a connection health check.
- **Activity pipeline** — normalised `activity_log`, de-duplication on
  `(source, connection, external id)`, exclusion rules for repositories, Drive folders, private
  repositories and manual exclusions.
- **AI agent layer** — Research, Writer and Reviewer agents with versioned prompt files, strict
  schema validation of every response, automatic regeneration when the reviewer is not confident,
  and a provider agnostic model router with the Gemini → Groq → OpenRouter → GitHub Models →
  Ollama fallback chain plus a deterministic offline provider.
- **Review workflow** — drafts inbox with status filters, split review screen with an editable
  draft, character and word counters, hashtag chips, reviewer flags panel, source evidence panel,
  version history with a line diff, regenerate with optional guidance, approve and post, schedule
  and reject with confirmation.
- **Orchestrator** — daily cycle (scan → research → write → review → notify), run history, manual
  trigger with stage specific loading labels, kill switch and a cron endpoint protected by a shared
  secret.
- **Notifications** — Telegram bot delivery with a review link, email fallback, delivery log and a
  test notification action.
- **Analytics** — engagement over time, posting streaks, published post table with metrics refresh.
- **Settings** — schedule and timezone, tone profile with live preview, writer profile, exclusion
  lists, banned phrases, auto approve and auto draft switches with warnings, retention, kill
  switch and an expandable FAQ.
- **Data layer** — Drizzle ORM schema for `connections`, `activity_log`, `drafts`,
  `draft_versions`, `posts`, `settings`, `audit_log`, `daily_runs`, `notifications` and
  `app_users`, with SQL migrations for Supabase and an embedded Postgres fallback for local runs.
- **Operations** — sample data seed script, GitHub Actions cron workflow, CI workflow, unit tests
  for the agent layer, cryptography, password hashing, date handling and diffing.
