# Database Schema (Postgres / Supabase)

## 1. `connections`
Stores one row per connected external account (GitHub can have multiple).

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| provider | text | `github` \| `google_drive` \| `linkedin` |
| provider_account_label | text | e.g. "github-main", "github-second" — user-defined label |
| provider_user_id | text | the external account's id |
| access_token | text, encrypted | AES-256 encrypted at rest |
| refresh_token | text, encrypted, nullable | |
| scopes | text[] | granted scopes |
| status | text | `active` \| `expired` \| `revoked` |
| connected_at | timestamptz | |
| last_checked_at | timestamptz | |

## 2. `activity_log`
Normalized events pulled from GitHub/Drive.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| source | text | `github` \| `google_drive` |
| source_connection_id | uuid, FK → connections.id | which account it came from |
| external_id | text | commit sha, file id, etc. (for de-dup) |
| event_type | text | `commit` \| `new_repo` \| `pr` \| `doc_created` \| `doc_edited` \| `notebook_updated` |
| title | text | short label |
| detail | jsonb | raw structured data (diff stats, file metadata, etc.) |
| url | text | link back to source |
| occurred_at | timestamptz | when the activity actually happened |
| ingested_at | timestamptz | when the app pulled it |
| excluded | boolean, default false | manually or rule-excluded from analysis |
| used_in_draft_id | uuid, FK → drafts.id, nullable | set once consumed by a draft |

Unique constraint: `(source, source_connection_id, external_id)` to prevent duplicate ingestion.

## 3. `drafts`
AI-generated post drafts, versioned.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| run_date | date | the daily cycle this belongs to |
| version | int | increments on regenerate |
| status | text | `pending` \| `edited` \| `approved` \| `rejected` \| `posted` |
| research_summary | jsonb | Research Agent output |
| draft_text | text | Writer Agent output (current version) |
| hashtags | text[] | |
| suggested_media_ref | text, nullable | e.g. activity_log id or file ref |
| reviewer_flags | jsonb, nullable | Reviewer Agent output (confidence, issues) |
| edited_text | text, nullable | if user edited before approving |
| created_at | timestamptz | |
| decided_at | timestamptz, nullable | when approved/rejected |

## 4. `posts`
Final published record.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| draft_id | uuid, FK → drafts.id | |
| linkedin_post_id | text | id returned by LinkedIn API |
| final_text | text | what was actually posted |
| posted_at | timestamptz | |
| likes | int, default 0 | refreshed periodically |
| comments | int, default 0 | |
| impressions | int, nullable | if available via API |
| metrics_updated_at | timestamptz, nullable | |

## 5. `settings`
Single-row (or key-value) table for user preferences.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| posting_schedule_time | time | e.g. 07:00 |
| timezone | text | e.g. Asia/Kolkata |
| tone_profile | text | `professional` \| `casual_technical` \| `storytelling` |
| auto_approve_minor | boolean, default false | |
| excluded_repos | text[] | |
| excluded_drive_folders | text[] | |
| banned_phrases | text[] | |
| notification_channel | text | `telegram` \| `email` \| `none` |

## 6. `audit_log`
Full trace of what the system read and generated, for transparency/debugging.

| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| event | text | e.g. `activity_fetched`, `draft_generated`, `post_published`, `token_refreshed` |
| payload | jsonb | relevant details |
| created_at | timestamptz | |

## 7. Relationships summary
- `connections` 1 → many `activity_log`
- `activity_log` many → 1 `drafts` (via `used_in_draft_id`)
- `drafts` 1 → 0..1 `posts`
- `settings` — single row, app-wide (single-tenant v1)
