# AI Model Strategy: Free Tiers & Fallback Chain

## 1. The actual risk (clarified)
A stored encryption key doesn't "run out." What actually breaks a pipeline like this is a single AI provider's **free-tier quota or rate limit** being exhausted on a given day — if the Writer Agent only knows how to call one provider, the whole daily cycle fails silently that day. The fix is a **provider-agnostic agent layer with an ordered fallback chain**, not relying on one model.

## 2. Design principle
Every agent call goes through a single internal function — `callModel(prompt, options)` — which tries providers in a configured order and falls through automatically on failure (quota, rate limit, downtime). The agents themselves (Research/Writer/Reviewer) never call a provider SDK directly.

```ts
// lib/agents/model-router.ts
const PROVIDER_CHAIN = [
  "gemini-free",
  "groq-free",
  "openrouter-free",
  "github-models-free",
  "ollama-local",       // optional, if self-hosting
];
```

On failure (429, quota error, timeout), the router logs it to `audit_log` and tries the next provider in the chain with the same prompt. Only if all providers fail does the daily cycle mark itself "skipped — all providers unavailable" and notify you via Telegram.

## 3. Free/low-cost model options worth configuring
| Provider | Notes |
|---|---|
| **Google Gemini API (free tier)** | Already your current choice; generous free quota, good general quality. |
| **Groq** | Free tier, extremely fast inference, hosts open models (Llama, Mixtral, etc.) — good as a fast fallback. |
| **OpenRouter** | Aggregates many providers; several models have a genuinely free tier (rotates — check their free-model list periodically, it changes). Good as a wide fallback net since one account covers many underlying models. |
| **GitHub Models** | Free (with usage limits) for GitHub account holders — you already have GitHub accounts, so this is a natural fit and ties into the same ecosystem. |
| **Ollama (self-hosted, fully free/unlimited)** | Run an open model (e.g. Llama 3, Mistral, Qwen) locally or on a small VPS. Zero per-request limits since it's your own hardware — best long-term "unlimited" option, at the cost of lower quality than frontier hosted models and needing you to run/maintain the server. Good as the final fallback rung, or even the primary if quality is acceptable for drafting (since a human reviews every post anyway). |

## 4. Recommended chain order
1. **Gemini free tier** (primary — best quality/cost balance you already use)
2. **Groq free tier** (fast fallback, different quota pool)
3. **OpenRouter free models** (wide fallback net)
4. **GitHub Models free tier** (fits your existing GitHub-centric workflow)
5. **Self-hosted Ollama** (true unlimited fallback — optional, add once you're ready to run a small server)

## 5. Practical notes
- Each provider's "free" terms change over time — this chain should be a **config file** (`/lib/agents/providers.config.json`), not hardcoded, so you can reorder/add/remove without redeploying.
- Keep prompts provider-agnostic (plain text in/out, JSON schema requested in the prompt itself) so swapping providers doesn't require rewriting agent logic — this is already the approach in `09-agent-prompts.md`.
- Since every draft is human-reviewed before posting, a slightly lower-quality fallback model producing a weaker draft is a low-risk failure mode — you'll just edit or reject it, not a big deal.
- Log which provider actually generated each draft (add `model_provider`, `model_name` to the `drafts` table from `07-database-schema.md`) — useful for comparing quality over time and deciding your default order.
