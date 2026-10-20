# Features

## 1. Account connections
- Connect / disconnect GitHub, Google Drive, LinkedIn independently.
- Per-connection status indicator (connected, token expired, needs re-auth).
- Scope transparency — show exactly what permissions were granted.

## 2. Activity research
- Daily automatic scan of GitHub (commits, new repos, PRs, READMEs changed) across multiple linked GitHub accounts.
- Daily scan of Google Drive (new/edited docs, notebooks, PDFs, reports) in designated folders.
- Manual "Scan now" trigger.
- Exclusion rules: ignore specific repos, folders, file types, or private/sensitive items.
- Activity timeline view — see everything the system picked up, with source links.

## 3. AI drafting
- Auto-classification of each day's activity: **Major milestone**, **Learning in public**, **Minor update**, or **Nothing notable** (skip).
- One draft per day when there's qualifying activity (configurable: daily, or only on major milestones).
- Tone presets (e.g. professional, casual-technical, storytelling) — user-selectable, remembered as default.
- Draft includes: post text, suggested hashtags, optional suggested image/snippet (e.g. a code screenshot or chart from a notebook).
- Avoids repeating recent post topics (checks last N posts before drafting).

## 4. Review & approval workflow
- Dashboard inbox of pending drafts.
- Inline edit before approving.
- Approve & Post / Approve & Schedule / Reject / Regenerate (ask AI to try again, optionally with a note like "make it shorter").
- Full history of past drafts and what was actually posted (diff view).

## 5. Scheduling & publishing
- Daily auto-run at a user-set time.
- Option to batch-approve and schedule posts for specific future days (content calendar).
- Direct publish to LinkedIn via API on approval.

## 6. Analytics
- Pull back LinkedIn engagement (likes, comments, impressions where available) for posted content.
- Simple trend view: posting streak, engagement over time, which activity types perform best.

## 7. Notifications
- Telegram daily summary + draft-ready alert.
- Optional email fallback.

## 8. Settings
- Posting schedule and timezone.
- Tone/voice profile.
- Source exclusions (repos/folders).
- Auto-approve rules (e.g. "auto-post minor updates without review" — off by default).
- Data retention controls (how long activity logs are kept).

## 9. Admin/safety
- Audit log of all data read and all AI generations.
- Manual kill switch to pause all automation instantly.
- Token/connection health dashboard.
