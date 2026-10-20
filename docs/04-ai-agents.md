# AI Agent Layer

The system uses a small team of specialized agents rather than one monolithic prompt. This keeps each step reliable, debuggable, and independently improvable.

## 1. Research Agent
**Input:** Raw normalized activity events from GitHub + Drive for the time window.
**Job:**
- Group related events (e.g. commits to the same repo on the same day).
- Summarize what each piece of activity actually represents in plain language.
- Classify significance: `major` | `learning` | `minor` | `none`.
- Pull out concrete, specific details (repo name, what changed, key numbers/results) — grounding is critical so the Writer Agent doesn't hallucinate.
**Output:** A structured JSON summary, e.g.:
```json
{
  "date": "2026-10-20",
  "highlights": [
    {
      "source": "github:second-account/python",
      "type": "notebook_update",
      "summary": "Added ensemble model (RandomForest + XGBoost) to tic-tac-toe endgame classifier, improved accuracy from 91% to 96%",
      "significance": "major"
    }
  ]
}
```

## 2. Writer Agent
**Input:** Research Agent's structured summary + user's tone profile + last N post topics (to avoid repetition).
**Job:**
- Draft a LinkedIn post (hook line, body, optional call-to-action, hashtags).
- Match the chosen tone preset.
- Keep claims strictly grounded in the summary — never invent metrics or outcomes not present in the input.
- Suggest 1 image/snippet reference if relevant (e.g. "attach the accuracy comparison chart from the notebook").
**Output:** Draft text + metadata (suggested hashtags, suggested media reference, source links used).

## 3. Reviewer / Compliance Agent
**Input:** The Writer Agent's draft + original research summary.
**Job (automated quality gate before it ever reaches you):**
- Fact-check: does every claim in the draft trace back to something in the research summary? Flag anything unsupported.
- Privacy check: does the draft reference anything from excluded/private sources?
- Tone/length check: within LinkedIn best-practice length, no excessive jargon, no banned words/phrases (user-configurable list).
- Produces a confidence score and a list of flags, if any.
**Output:** Approved-for-review draft, or draft + flags shown to the user before they approve.

## 4. Orchestration pattern
- Agents run in sequence (Research → Writer → Reviewer), each a separate, focused LLM call rather than one giant prompt — this makes failures easier to localize and outputs easier to validate.
- Each agent's prompt and output schema is stored/versioned so you can see exactly what instructions produced a given post (important for debugging and trust).
- Retries: if the Reviewer flags major issues, the system can automatically ask the Writer Agent to regenerate once before surfacing to you.

## 5. Model/provider notes
- You've previously used Gemini API for a related project (cost reasons) — same approach applies well here; any capable LLM API works since prompts are modular.
- Keep prompts and schemas in version control (not hardcoded inline) so they can be tuned over time without redeploying the whole app.
