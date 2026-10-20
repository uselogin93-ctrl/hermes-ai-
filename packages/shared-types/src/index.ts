/**
 * @careerpulse/shared-types
 *
 * Single source of truth for the shapes exchanged between the Next.js route
 * handlers, the agent layer, the connectors and the UI.
 *
 * Mirrors `docs/08-api-contracts.md` (common types) and `docs/07-database-schema.md`.
 */

import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Enumerations                                                        */
/* ------------------------------------------------------------------ */

export const PROVIDERS = ["github", "google_drive", "linkedin"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const CONNECTION_STATUSES = ["active", "expired", "revoked"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const ACTIVITY_SOURCES = ["github", "google_drive"] as const;
export type ActivitySource = (typeof ACTIVITY_SOURCES)[number];

export const ACTIVITY_EVENT_TYPES = [
  "commit",
  "new_repo",
  "pr",
  "doc_created",
  "doc_edited",
  "notebook_updated",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const SIGNIFICANCE_LEVELS = ["major", "learning", "minor", "none"] as const;
export type Significance = (typeof SIGNIFICANCE_LEVELS)[number];

export const DRAFT_STATUSES = [
  "pending",
  "edited",
  "approved",
  "rejected",
  "posted",
  "scheduled",
] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

export const TONE_PROFILES = ["professional", "casual_technical", "storytelling"] as const;
export type ToneProfile = (typeof TONE_PROFILES)[number];

export const NOTIFICATION_CHANNELS = ["telegram", "email", "none"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const RUN_STATUSES = ["running", "completed", "skipped", "failed"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

/* ------------------------------------------------------------------ */
/* Domain types                                                        */
/* ------------------------------------------------------------------ */

export type ActivityEvent = {
  id: string;
  source: ActivitySource;
  source_connection_id: string | null;
  external_id: string;
  event_type: ActivityEventType;
  title: string;
  detail: Record<string, unknown>;
  url: string;
  occurred_at: string;
  ingested_at: string;
  excluded: boolean;
  used_in_draft_id: string | null;
};

export type ResearchHighlight = {
  source: string;
  type: string;
  summary: string;
  significance: Significance;
};

export type ResearchSummary = {
  date: string;
  highlights: ResearchHighlight[];
};

export type ReviewerFlags = {
  confidence: number;
  issues: string[];
};

export type Draft = {
  id: string;
  run_date: string;
  version: number;
  status: DraftStatus;
  research_summary: ResearchSummary;
  draft_text: string;
  hashtags: string[];
  suggested_media_ref: string | null;
  reviewer_flags: ReviewerFlags | null;
  edited_text: string | null;
  created_at: string;
  decided_at: string | null;
  scheduled_for: string | null;
  model_provider: string | null;
  model_name: string | null;
  prompt_versions: Record<string, string> | null;
};

export type Post = {
  id: string;
  draft_id: string;
  linkedin_post_id: string;
  final_text: string;
  post_url: string | null;
  posted_at: string;
  likes: number;
  comments: number;
  impressions: number | null;
  metrics_updated_at: string | null;
};

export type Connection = {
  id: string;
  provider: Provider;
  provider_account_label: string;
  provider_user_id: string;
  scopes: string[];
  status: ConnectionStatus;
  connected_at: string;
  last_checked_at: string | null;
  expires_at: string | null;
};

export type Settings = {
  id: string;
  posting_schedule_time: string;
  timezone: string;
  tone_profile: ToneProfile;
  auto_approve_minor: boolean;
  excluded_repos: string[];
  excluded_drive_folders: string[];
  banned_phrases: string[];
  notification_channel: NotificationChannel;
  user_name: string;
  user_role: string;
  user_background: string;
  telegram_chat_id: string;
  kill_switch: boolean;
  retention_days: number;
  auto_draft_minor: boolean;
  recent_topics: string[];
};

export type AuditEntry = {
  id: string;
  event: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type NotificationLogEntry = {
  id: string;
  channel: string;
  kind: string;
  message: string;
  status: "sent" | "failed" | "skipped";
  error: string | null;
  created_at: string;
};

export type DailyRun = {
  id: string;
  run_date: string;
  status: RunStatus;
  started_at: string;
  finished_at: string | null;
  activity_count: number;
  draft_id: string | null;
  provider_used: string | null;
  error: string | null;
};

/* ------------------------------------------------------------------ */
/* Zod schemas — used for API validation and form validation          */
/* ------------------------------------------------------------------ */

export const providerSchema = z.enum(PROVIDERS);
export const toneProfileSchema = z.enum(TONE_PROFILES);
export const draftStatusSchema = z.enum(DRAFT_STATUSES);
export const significanceSchema = z.enum(SIGNIFICANCE_LEVELS);
export const notificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);

export const activityEventSchema = z.object({
  id: z.string(),
  source: z.enum(ACTIVITY_SOURCES),
  source_connection_id: z.string().nullable(),
  external_id: z.string(),
  event_type: z.enum(ACTIVITY_EVENT_TYPES),
  title: z.string(),
  detail: z.record(z.string(), z.unknown()),
  url: z.string(),
  occurred_at: z.string(),
  ingested_at: z.string(),
  excluded: z.boolean(),
  used_in_draft_id: z.string().nullable(),
});

export const researchHighlightSchema = z.object({
  source: z.string(),
  type: z.string(),
  summary: z.string(),
  significance: significanceSchema,
});

export const researchSummarySchema = z.object({
  date: z.string(),
  highlights: z.array(researchHighlightSchema),
});

export const reviewerFlagsSchema = z.object({
  confidence: z.number().min(0).max(1),
  issues: z.array(z.string()),
});

export const draftSchema = z.object({
  id: z.string(),
  run_date: z.string(),
  version: z.number(),
  status: draftStatusSchema,
  research_summary: researchSummarySchema,
  draft_text: z.string(),
  hashtags: z.array(z.string()),
  suggested_media_ref: z.string().nullable(),
  reviewer_flags: reviewerFlagsSchema.nullable(),
  edited_text: z.string().nullable(),
  created_at: z.string(),
  decided_at: z.string().nullable(),
  scheduled_for: z.string().nullable(),
  model_provider: z.string().nullable(),
  model_name: z.string().nullable(),
  prompt_versions: z.record(z.string(), z.string()).nullable(),
});

export const scanRequestSchema = z.object({
  since: z.string().optional(),
});

export const generateDraftRequestSchema = z.object({
  run_date: z.string().optional(),
  force: z.boolean().optional(),
});

export const regenerateRequestSchema = z.object({
  instruction: z.string().max(2000).optional(),
});

export const approveDraftRequestSchema = z.object({
  post_now: z.boolean(),
  scheduled_for: z.string().optional(),
});

export const patchDraftRequestSchema = z.object({
  edited_text: z.string().min(1).max(5000),
});

export const patchActivityRequestSchema = z.object({
  excluded: z.boolean(),
});

export const settingsPatchSchema = z
  .object({
    posting_schedule_time: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().min(1).max(64),
    tone_profile: toneProfileSchema,
    auto_approve_minor: z.boolean(),
    auto_draft_minor: z.boolean(),
    excluded_repos: z.array(z.string()),
    excluded_drive_folders: z.array(z.string()),
    banned_phrases: z.array(z.string()),
    notification_channel: notificationChannelSchema,
    user_name: z.string().min(1).max(120),
    user_role: z.string().max(160),
    user_background: z.string().max(600),
    telegram_chat_id: z.string().max(64),
    kill_switch: z.boolean(),
    retention_days: z.number().int().min(1).max(3650),
    recent_topics: z.array(z.string()),
  })
  .partial();

export const killSwitchSchema = z.object({
  enabled: z.boolean(),
});

/* ------------------------------------------------------------------ */
/* Error envelope — `docs/08-api-contracts.md`                        */
/* ------------------------------------------------------------------ */

export const ERROR_CODES = [
  "UNAUTHORIZED",
  "TOKEN_EXPIRED",
  "RATE_LIMITED",
  "PROVIDER_ERROR",
  "VALIDATION_ERROR",
  "INTERNAL_ERROR",
  "NOT_FOUND",
  "KILL_SWITCH_ACTIVE",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
  };
};

export function apiError(code: ErrorCode, message: string, retryable = false): ApiErrorBody {
  return { error: { code, message, retryable } };
}

/* ------------------------------------------------------------------ */
/* Agent layer contracts                                               */
/* ------------------------------------------------------------------ */

export type ModelProviderId =
  | "gemini-free"
  | "groq-free"
  | "openrouter-free"
  | "github-models-free"
  | "ollama-local"
  | "demo-local";

export type ModelRequest = {
  prompt: string;
  /** Optional schema name so providers that support JSON mode can enable it. */
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  /** Optional override of the provider chain, used by the "regenerate" flow. */
  preferredProvider?: ModelProviderId;
  /** Which agent is calling — lets the offline provider behave deterministically. */
  task?: "research" | "writer" | "reviewer";
  /** Structured payload behind the prompt text. */
  context?: Record<string, unknown>;
};

export type ModelResponse = {
  text: string;
  provider: ModelProviderId;
  model: string;
  attempts: { provider: ModelProviderId; error: string; retryable: boolean }[];
  latencyMs: number;
};
