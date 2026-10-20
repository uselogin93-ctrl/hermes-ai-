import type {
  ActivityEvent,
  ModelProviderId,
  ResearchSummary,
  ToneProfile,
} from "@careerpulse/shared-types";
import { researchSummarySchema } from "@careerpulse/shared-types";
import { callModel } from "@/lib/agents/model-router";
import { renderPrompt, loadPrompt } from "@/lib/agents/prompts";
import { extractJsonObject } from "@/lib/agents/json";

export type AgentResult<T> = {
  data: T;
  provider: ModelProviderId;
  model: string;
  promptVersion: string;
  attempts: { provider: ModelProviderId; error: string; retryable: boolean }[];
};

/**
 * Research Agent: groups raw activity into a structured, grounded summary.
 *
 * Grounding is the whole point of this agent, so the input events are passed
 * verbatim and the output is validated against a strict schema.
 */
export async function runResearchAgent(input: {
  events: ActivityEvent[];
  date: string;
}): Promise<AgentResult<ResearchSummary>> {
  const prompt = renderPrompt("research_agent", {
    activity_events_json: JSON.stringify(input.events, null, 2),
  });

  const response = await callModel({
    prompt,
    json: true,
    task: "research",
    temperature: 0.2,
    context: { activityEvents: input.events, date: input.date },
  });

  const parsed = researchSummarySchema.safeParse(extractJsonObject(response.text));
  if (!parsed.success) {
    throw new Error(
      `Research output did not match the expected schema: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")} ${issue.message}`)
        .join("; ")}`,
    );
  }

  return {
    data: parsed.data,
    provider: response.provider,
    model: response.model,
    promptVersion: loadPrompt("research_agent").version,
    attempts: response.attempts,
  };
}

/**
 * Writer Agent: turns the research summary into a LinkedIn post in the
 * user's voice.
 */
export async function runWriterAgent(input: {
  summary: ResearchSummary;
  tone: ToneProfile;
  userName: string;
  userRole: string;
  userBackground: string;
  recentTopics: string[];
  instruction?: string;
}): Promise<AgentResult<{ draft_text: string; hashtags: string[]; suggested_media: string | null }>> {
  let prompt = renderPrompt("writer_agent", {
    user_name: input.userName,
    user_role: input.userRole,
    user_background: input.userBackground || "independent builder",
    tone_profile: input.tone,
    recent_post_summaries: input.recentTopics.length > 0 ? input.recentTopics.join(" | ") : "none yet",
    research_summary_json: JSON.stringify(input.summary, null, 2),
  });

  if (input.instruction) {
    prompt += `\n\nAdditional instruction from the user for this revision: ${input.instruction}\n`;
  }

  const response = await callModel({
    prompt,
    json: true,
    task: "writer",
    temperature: 0.75,
    context: {
      researchSummary: input.summary,
      toneProfile: input.tone,
      userName: input.userName,
      userRole: input.userRole,
      recentTopics: input.recentTopics,
    },
  });

  const raw = extractJsonObject(response.text) as {
    draft_text?: string;
    hashtags?: string[];
    suggested_media?: string | null;
  };

  const draftText = String(raw.draft_text ?? "").trim();
  if (!draftText) throw new Error("Writer output did not contain draft_text.");

  const hashtags = Array.isArray(raw.hashtags)
    ? raw.hashtags
        .map((tag) => String(tag).trim())
        .filter(Boolean)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    : [];

  return {
    data: {
      draft_text: draftText,
      hashtags,
      suggested_media: raw.suggested_media ? String(raw.suggested_media) : null,
    },
    provider: response.provider,
    model: response.model,
    promptVersion: loadPrompt("writer_agent").version,
    attempts: response.attempts,
  };
}

/**
 * Reviewer / Compliance Agent: the quality gate in front of the human.
 *
 * It never rewrites the post, it only reports issues and a confidence score.
 */
export async function runReviewerAgent(input: {
  draftText: string;
  hashtags: string[];
  summary: ResearchSummary;
  bannedPhrases: string[];
  excludedSources: string[];
  tone: ToneProfile;
}): Promise<AgentResult<{ confidence: number; issues: string[] }>> {
  const prompt = renderPrompt("reviewer_agent", {
    excluded_sources: input.excludedSources.length > 0 ? input.excludedSources.join(", ") : "none",
    banned_phrases: input.bannedPhrases.length > 0 ? input.bannedPhrases.join(", ") : "none",
    draft_text: input.draftText,
    research_summary_json: JSON.stringify(input.summary, null, 2),
  });

  const response = await callModel({
    prompt,
    json: true,
    task: "reviewer",
    temperature: 0.1,
    context: {
      draftText: input.draftText,
      hashtags: input.hashtags,
      researchSummary: input.summary,
      bannedPhrases: input.bannedPhrases,
      excludedSources: input.excludedSources,
    },
  });

  const raw = extractJsonObject(response.text) as { confidence?: number; issues?: string[] };
  const confidence =
    typeof raw.confidence === "number" ? Math.min(1, Math.max(0, raw.confidence)) : 0.5;
  const issues = Array.isArray(raw.issues) ? raw.issues.map((issue) => String(issue)) : [];

  return {
    data: { confidence: Number(confidence.toFixed(2)), issues },
    provider: response.provider,
    model: response.model,
    promptVersion: loadPrompt("reviewer_agent").version,
    attempts: response.attempts,
  };
}
