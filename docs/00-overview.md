# CareerPulse AI — Product Overview

## 1. One-line description
CareerPulse AI is a personal career-automation platform that connects your **GitHub**, **Google Drive**, and **LinkedIn** accounts, uses AI agents to research your real activity across all three, and automatically drafts and (on approval) publishes a daily LinkedIn post — turning your day-to-day coding and documentation work into a consistent professional presence.

## 2. Problem it solves
- You do real work (commits, notebooks, documents) but rarely turn it into visible, consistent LinkedIn content.
- Manually writing a good post every day is time-consuming and easy to skip.
- There's no single place that looks at *all* your activity (code + documents) and turns it into a narrative.

## 3. Core idea
Every day, the system:
1. **Scans** your GitHub (commits, repos, PRs) and Google Drive (new/edited docs, notebooks, reports).
2. **Understands** what you did using AI (summarization + classification: "major milestone" vs "learning in public" vs "minor update").
3. **Drafts** a LinkedIn post in your voice, with relevant hashtags/media.
4. **Shows you the draft** for approval/edit (never posts blind).
5. **Publishes** to LinkedIn once approved — on a schedule or on-demand.

## 4. Who uses it
- Single user (you) — this is a personal tool, not a multi-tenant SaaS, at least for v1.
- Designed to run unattended in the background (daily cron) with a lightweight approval step.

## 5. Non-goals (v1)
- Not a general social media scheduler for multiple platforms (LinkedIn only, first).
- Not fully autonomous posting without human approval (safety-gated by design).
- Not a public multi-user product in phase 1 — architecture should allow it later, but scope stays single-tenant first.

## 6. Document map
| File | Contents |
|---|---|
| `01-architecture.md` | System design, services, data flow diagram |
| `02-features.md` | Full feature list by module |
| `03-auth-integrations.md` | Login/auth flows for GitHub, Google Drive, LinkedIn |
| `04-ai-agents.md` | Agent roles, prompts, responsibilities, orchestration |
| `05-ui-design.md` | Screens, design system, UX flows |
| `06-tech-stack-roadmap.md` | Technology choices, build phases, timeline |
| `07-database-schema.md` | Full table definitions, columns, relationships |
| `08-api-contracts.md` | Internal API endpoints, request/response types, error format |
| `09-agent-prompts.md` | Exact system prompts for each AI agent, versioning convention |
| `10-project-structure-env.md` | Repo folder structure, env vars, external setup checklist, build order |
| `11-ai-model-fallback.md` | Multi-provider AI fallback chain so quota limits on one model don't stop the app |
| `12-ui-standards-checklist.md` | Required UI components + forbidden "AI vibe-coded" patterns — binding design rulebook |
| `13-technology-framework-detail.md` | Exact libraries/packages per layer (frontend, backend, DB, integrations, AI, testing, hosting) |
