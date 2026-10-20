# Tech Stack & Roadmap

## 1. Suggested stack (matches your existing skills)
| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js + React + Tailwind CSS + shadcn/ui | Matches your existing stack; good for dashboard-style apps |
| Backend | Next.js API routes or a separate Node.js service | Keep integration/agent logic server-side only |
| Database | Supabase (Postgres) | You've used it before (billing-saas project); gives auth + DB + storage in one |
| Scheduler | GitHub Actions cron (free) or Supabase scheduled functions | Matches your existing career-agent approach |
| AI/LLM | Gemini API (cost-effective, already in use) — swappable | Keep agent prompts provider-agnostic |
| Notifications | Telegram Bot API | Your stated preference |
| Hosting | Vercel (frontend/API) + Supabase (DB/auth) | Free-tier friendly, matches Next.js stack |

## 2. Build phases

### Phase 1 — Foundations
- App shell + auth (your own login)
- GitHub connector (read-only) + activity storage
- Basic dashboard showing raw activity feed (no AI yet)

### Phase 2 — Google Drive integration
- Drive connector (Picker-scoped) + activity storage
- Unified activity timeline (GitHub + Drive)

### Phase 3 — AI drafting pipeline
- Research Agent + Writer Agent (Reviewer can start simple/manual)
- Draft Review screen (approve/edit, no auto-post yet)
- Store drafts, no LinkedIn connection required yet — you manually copy-paste to test quality

### Phase 4 — LinkedIn integration
- LinkedIn OAuth + posting API (apply for LinkedIn API access early — approval can take time)
- Wire up Approve & Post → live publish
- Reviewer/Compliance Agent added as a real gate

### Phase 5 — Automation & polish
- Daily scheduler fully automated end-to-end
- Telegram notifications
- Analytics screen (engagement pull-back)
- Settings: tone profiles, exclusions, auto-approve rules

### Phase 6 — Hardening
- Token refresh/expiry handling, audit log, kill switch
- Design system pass — consistent components across all screens
- Error handling/retries for all external API calls

## 3. Key risks to plan for early
- **LinkedIn API approval** — the "Share on LinkedIn" permission requires LinkedIn's review; start this application early since it can be the longest lead time.
- **Google Drive scope** — using `drive.file` + Picker (rather than full Drive read) avoids a Google verification review for sensitive scopes; broad `drive.readonly` may require Google's app verification process, which takes time.
- **Rate limits** — GitHub, Drive, and LinkedIn all have API rate limits; daily single-user usage is low-volume so this should be a non-issue, but design the connectors to handle 429s gracefully regardless.
