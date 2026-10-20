# API Contracts (internal backend endpoints)

All endpoints are server-side only, auth-protected (session cookie / JWT), JSON in/out.

## Auth
- `POST /api/auth/login` — app login (Google OAuth callback or email/password)
- `POST /api/auth/logout`
- `GET /api/auth/session` → `{ user, authenticated }`

## Connections
- `GET /api/connections` → `[{ id, provider, label, status, scopes, connected_at }]`
- `POST /api/connections/:provider/start` → redirects to provider OAuth consent
- `GET /api/connections/:provider/callback` → handles OAuth code exchange, stores token
- `POST /api/connections/:id/disconnect` → revokes token with provider + marks `revoked`
- `GET /api/connections/:id/health` → `{ status, last_checked_at }`

## Activity
- `POST /api/activity/scan` — manual "scan now" trigger
  - body: `{ since?: ISODate }` (default: last run time)
  - returns: `{ new_events_count, events: ActivityEvent[] }`
- `GET /api/activity?from=&to=&source=&used=` — paginated activity list for the timeline view
- `PATCH /api/activity/:id` — body: `{ excluded: boolean }` (manual exclude/include)

## Drafts
- `POST /api/drafts/generate` — runs Research → Writer → Reviewer for a given date/activity set
  - body: `{ run_date?: ISODate }`
  - returns: `Draft`
- `GET /api/drafts?status=` — list drafts, filterable by status
- `GET /api/drafts/:id` → full `Draft` object incl. research_summary and reviewer_flags
- `PATCH /api/drafts/:id` — body: `{ edited_text?: string }` — save manual edit
- `POST /api/drafts/:id/regenerate` — body: `{ instruction?: string }` — re-run Writer Agent with optional user guidance
- `POST /api/drafts/:id/approve` — body: `{ post_now: boolean, scheduled_for?: ISODateTime }`
- `POST /api/drafts/:id/reject`

## Posts
- `GET /api/posts?from=&to=` → list with engagement metrics
- `POST /api/posts/:id/refresh-metrics` — manual pull of latest LinkedIn engagement
- `GET /api/posts/:id`

## Settings
- `GET /api/settings`
- `PATCH /api/settings` — body: partial `Settings` object

## Scheduler / system
- `POST /api/system/run-daily-cycle` — called by the cron job (GitHub Actions / Supabase scheduled function); protected by a shared secret header, not user session
  - Steps internally: scan activity → generate draft (if qualifying activity) → send notification
- `GET /api/system/audit-log?from=&to=`
- `POST /api/system/kill-switch` — body: `{ enabled: boolean }` — pauses all automation immediately

## Notifications
- `POST /api/notifications/test` — sends a test Telegram/email message
- Internal (not a public endpoint): notification dispatch triggered after `drafts/generate` and after `posts` creation

## Common types

```ts
type ActivityEvent = {
  id: string;
  source: "github" | "google_drive";
  event_type: string;
  title: string;
  detail: Record<string, any>;
  url: string;
  occurred_at: string; // ISO
  excluded: boolean;
};

type Draft = {
  id: string;
  run_date: string;
  version: number;
  status: "pending" | "edited" | "approved" | "rejected" | "posted";
  research_summary: {
    date: string;
    highlights: {
      source: string;
      type: string;
      summary: string;
      significance: "major" | "learning" | "minor" | "none";
    }[];
  };
  draft_text: string;
  hashtags: string[];
  suggested_media_ref?: string;
  reviewer_flags?: {
    confidence: number;
    issues: string[];
  };
  edited_text?: string;
};
```

## Error format (all endpoints)
```json
{
  "error": {
    "code": "GITHUB_TOKEN_EXPIRED",
    "message": "GitHub connection needs to be re-authenticated.",
    "retryable": false
  }
}
```
Standard codes to implement: `UNAUTHORIZED`, `TOKEN_EXPIRED`, `RATE_LIMITED`, `PROVIDER_ERROR`, `VALIDATION_ERROR`, `INTERNAL_ERROR`.
