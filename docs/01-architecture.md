# Architecture

## 1. High-level system diagram (textual)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CareerPulse AI                           │
│                                                                   │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐                  │
│  │  GitHub    │   │  Google   │   │ LinkedIn  │   External APIs  │
│  │  OAuth/API │   │  Drive    │   │  API      │                  │
│  └─────┬─────┘   │  OAuth/API│   └─────┬─────┘                  │
│        │         └─────┬─────┘         │                        │
│        ▼               ▼               ▼                        │
│  ┌─────────────────────────────────────────────┐                │
│  │           Integration Layer (connectors)      │                │
│  └───────────────────┬───────────────────────────┘                │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │        Orchestrator (Scheduler + Queue)       │  ← cron (daily)│
│  └───────────────────┬───────────────────────────┘                │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │                AI Agent Layer                 │                │
│  │  ┌───────────┐ ┌───────────┐ ┌─────────────┐ │                │
│  │  │ Research  │ │ Writer    │ │ Reviewer /  │ │                │
│  │  │ Agent     │ │ Agent     │ │ Compliance  │ │                │
│  │  └───────────┘ └───────────┘ └─────────────┘ │                │
│  └───────────────────┬───────────────────────────┘                │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │      Data Layer (Postgres/Supabase)           │                │
│  │  activity_log | drafts | posts | settings     │                │
│  └───────────────────┬───────────────────────────┘                │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │   Web App (Next.js) — Dashboard + Approval    │                │
│  └───────────────────┬───────────────────────────┘                │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────┐                │
│  │  Notification Layer — Telegram / Email        │                │
│  └─────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Components

### 2.1 Integration Layer
Thin, isolated connector modules — one per external service. Each connector:
- Owns its own OAuth token lifecycle (refresh, revoke).
- Exposes a normalized interface: `fetchActivity(since)` → returns a common `ActivityEvent[]` shape regardless of source.
- Is independently testable/mockable.

### 2.2 Orchestrator
- A scheduler (cron-based, e.g. GitHub Actions cron, or a hosted job scheduler) that runs once daily (configurable time).
- Pulls activity from all three connectors for the last 24h window.
- Pushes normalized events into a job queue for the AI Agent Layer.
- Also supports **manual trigger** ("Run now") from the dashboard.

### 2.3 AI Agent Layer
Three cooperating agents (detailed in `04-ai-agents.md`):
- **Research Agent** — reads raw activity, produces a structured summary.
- **Writer Agent** — turns the summary into a LinkedIn-style draft post.
- **Reviewer/Compliance Agent** — checks tone, length, factual grounding (no hallucinated claims), and flags anything sensitive (private repo content, confidential docs) before it ever reaches the draft stage.

### 2.4 Data Layer
Relational database (Postgres, e.g. via Supabase) with core tables:
- `activity_log` — raw + normalized events pulled from GitHub/Drive.
- `drafts` — AI-generated post drafts, versioned, with status (`pending`, `edited`, `approved`, `rejected`, `posted`).
- `posts` — final published post record + LinkedIn post ID + metrics (likes/comments, pulled back later).
- `settings` — user preferences (tone, posting time, auto-approve rules, excluded repos/folders).
- `connections` — OAuth tokens (encrypted at rest) and connection status per provider.

### 2.5 Web App
Next.js dashboard — the control center. See `05-ui-design.md` for full screen specs.

### 2.6 Notification Layer
Telegram bot (preferred) sends a daily message: "Today's draft is ready — review here [link]." Supports inline Approve/Reject if feasible, but full editing happens in the web dashboard.

## 3. Data flow (daily cycle)
1. Scheduler fires (e.g. 7:00 AM IST).
2. Orchestrator calls each connector for new activity since last run.
3. Activity normalized and stored in `activity_log`.
4. If activity exists → Research Agent summarizes it.
5. Writer Agent drafts a post from the summary + user's tone profile + recent post history (to avoid repetition).
6. Reviewer Agent checks the draft, attaches a confidence/safety flag.
7. Draft saved to `drafts` table, status = `pending`.
8. Telegram notification + dashboard update.
9. User reviews/edits in the dashboard and clicks **Approve & Post** (or **Reject**, or **Edit then Approve**).
10. On approval, LinkedIn connector publishes the post; result saved to `posts`.

## 4. Security & privacy principles
- No content is ever auto-posted without explicit human approval (configurable later, but off by default).
- OAuth tokens encrypted at rest; scoped to minimum required permissions (read-only on GitHub/Drive, post-only on LinkedIn).
- Clear exclusion list — private repos, specific Drive folders, or file types can be marked "never analyze."
- Full audit log of what was read and what was generated from it.
