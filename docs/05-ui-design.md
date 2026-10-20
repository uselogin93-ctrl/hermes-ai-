# UI / UX Design Specification

This section defines how the product should actually look and behave — structured like a real product spec, not an ad-hoc layout.

## 1. Design principles
- **Calm, dashboard-first, not flashy.** This is a daily-use tool — it should feel like a control panel (think Linear/Notion/Vercel dashboard aesthetic), not a marketing landing page.
- **Status-driven.** Every screen should make it instantly obvious: is anything waiting for my approval? Are all connections healthy?
- **Review-centric.** The single most important screen is the Draft Review screen — it deserves the most design care.
- **Consistent design tokens** — one spacing scale, one type scale, one color system, reused everywhere (not one-off styles per page).

## 2. Design system basics
- **Typography:** one primary sans-serif (e.g. Inter or Geist) for UI; a distinct but complementary font only if needed for marketing-style headers — not required here.
- **Color system:** neutral base (grays) + one primary accent color + semantic colors (success green, warning amber, error red, info blue). Support light/dark mode from day one.
- **Spacing/layout:** 8px base spacing grid, consistent card/radius system (e.g. 8–12px radius), consistent shadow levels (2–3 max).
- **Components:** build on a small, consistent component library (e.g. shadcn/ui on top of Tailwind) rather than custom one-off components per screen.

## 3. Core screens

### 3.1 Dashboard (home)
- Top summary bar: connection health (3 icons: GitHub / Drive / LinkedIn, green/red status), posting streak, next scheduled run.
- "Today's Draft" card front and center if one exists — with quick Approve/Reject actions.
- Recent activity feed (condensed) below.
- Recent posts performance snapshot (small chart).

### 3.2 Draft Review screen
- Split view: left = generated post (editable rich text area, character count, hashtag chips), right = source evidence (which commits/docs this was built from, with links).
- Confidence/flags panel from the Reviewer Agent (if any issues, shown clearly, not buried).
- Action bar: **Approve & Post Now**, **Schedule for later**, **Regenerate** (with optional instruction box), **Reject**.
- Edit history / version diff if regenerated.

### 3.3 Activity Timeline
- Chronological feed of everything pulled from GitHub + Drive, grouped by day, filterable by source and by "used in a post" / "not used."
- Each item links out to the original (GitHub commit / Drive file).

### 3.4 Connections / Settings
- One card per integration (GitHub, Drive, LinkedIn) with: status, connected account(s), scopes granted, "Reconnect" / "Disconnect" buttons.
- Tone profile selector with live preview of how it affects draft style.
- Exclusion rules editor (repo/folder picker).
- Schedule settings (time, timezone, frequency).
- Auto-approve toggle (default OFF), with clear warning copy explaining what it does.

### 3.5 Analytics
- Simple line/bar charts: posting frequency over time, engagement over time.
- Table of past posts with engagement numbers and a link to the live LinkedIn post.

### 3.6 Notifications
- Telegram-style compact log of what was sent and when, with a "test notification" button.

## 4. Interaction details
- Loading states should be specific ("Scanning GitHub…", "Drafting post…"), not generic spinners — this builds trust in an AI tool.
- Every AI-generated artifact is clearly labeled as AI-generated with a visible source trail — never presented as if it magically appeared.
- Destructive actions (Disconnect, Reject, Delete) always require a confirm step.
- Mobile-responsive is a should-have, not a must-have for v1, since this is primarily a desktop daily-review tool — but layout should not break on a phone (for Telegram-link quick checks).

## 5. What to avoid
- No unnecessary animation/gradients "for flash" — this is a utility tool.
- No hardcoded single-breakpoint layouts — use a real responsive grid.
- No inconsistent component styles screen-to-screen — enforce the design system strictly.
- No burying the approval action — it should never take more than one click from notification to decision.
