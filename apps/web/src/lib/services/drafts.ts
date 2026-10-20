import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { activityLog, draftVersions, drafts } from "@/lib/db/schema";
import type {
  ActivityEvent,
  Draft,
  DraftStatus,
  ResearchSummary,
  ReviewerFlags,
  ToneProfile,
} from "@careerpulse/shared-types";
import { runResearchAgent, runReviewerAgent, runWriterAgent } from "@/lib/agents";
import { getSettings } from "@/lib/services/settings";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { toActivityEvent } from "@/lib/services/activity";

export function toDraft(row: typeof drafts.$inferSelect): Draft {
  return {
    id: row.id,
    run_date: row.runDate,
    version: row.version,
    status: row.status as DraftStatus,
    research_summary: row.researchSummary as unknown as ResearchSummary,
    draft_text: row.draftText,
    hashtags: row.hashtags,
    suggested_media_ref: row.suggestedMediaRef,
    reviewer_flags: row.reviewerFlags as unknown as ReviewerFlags | null,
    edited_text: row.editedText,
    created_at: row.createdAt.toISOString(),
    decided_at: row.decidedAt?.toISOString() ?? null,
    scheduled_for: row.scheduledFor?.toISOString() ?? null,
    model_provider: row.modelProvider,
    model_name: row.modelName,
    prompt_versions: row.promptVersions as Record<string, string> | null,
  };
}

export type GenerateOptions = {
  runDate: string;
  events: ActivityEvent[];
  instruction?: string;
  force?: boolean;
};

export type GenerateResult = {
  draft: Draft | null;
  skippedReason?: string;
  provider?: string | null;
};

/**
 * Runs the full agent pipeline (Research → Writer → Reviewer) and stores the
 * resulting draft.
 *
 * Nothing is published here: the draft lands in `pending` state and waits for
 * a human decision.
 */
export async function generateDraft(db: Db, options: GenerateOptions): Promise<GenerateResult> {
  const settings = await getSettings(db);

  if (options.events.length === 0) {
    return { draft: null, skippedReason: "No qualifying activity in the selected window." };
  }

  const research = await runResearchAgent({
    events: options.events,
    date: options.runDate,
  });

  const meaningful = research.data.highlights.filter((h) => h.significance !== "none");
  if (meaningful.length === 0 && !options.force) {
    return { draft: null, skippedReason: "Activity was classified as not worth posting." };
  }

  const recentTopics = await getRecentTopics(db, settings.recent_topics);

  const writer = await runWriterAgent({
    summary: research.data,
    tone: settings.tone_profile as ToneProfile,
    userName: settings.user_name,
    userRole: settings.user_role,
    userBackground: settings.user_background,
    recentTopics,
    instruction: options.instruction,
  });

  let reviewer = await runReviewerAgent({
    draftText: writer.data.draft_text,
    hashtags: writer.data.hashtags,
    summary: research.data,
    bannedPhrases: settings.banned_phrases,
    excludedSources: [...settings.excluded_repos, ...settings.excluded_drive_folders],
    tone: settings.tone_profile as ToneProfile,
  });

  // One automatic rewrite when the reviewer is not confident enough.
  if (reviewer.data.confidence < 0.6 && !options.instruction) {
    const retry = await runWriterAgent({
      summary: research.data,
      tone: settings.tone_profile as ToneProfile,
      userName: settings.user_name,
      userRole: settings.user_role,
      userBackground: settings.user_background,
      recentTopics,
      instruction:
        "Tighten the draft: stay within 100-200 words, keep every statement traceable to the research summary, and end with 3-5 hashtags.",
    });
    const reReviewed = await runReviewerAgent({
      draftText: retry.data.draft_text,
      hashtags: retry.data.hashtags,
      summary: research.data,
      bannedPhrases: settings.banned_phrases,
      excludedSources: [...settings.excluded_repos, ...settings.excluded_drive_folders],
      tone: settings.tone_profile as ToneProfile,
    });
    if (reReviewed.data.confidence >= reviewer.data.confidence) {
      writer.data.draft_text = retry.data.draft_text;
      writer.data.hashtags = retry.data.hashtags;
      writer.data.suggested_media = retry.data.suggested_media;
      reviewer = reReviewed;
    }
  }

  const promptVersions = {
    research_agent: research.promptVersion,
    writer_agent: writer.promptVersion,
    reviewer_agent: reviewer.promptVersion,
  };

  const [row] = await db
    .insert(drafts)
    .values({
      runDate: options.runDate,
      version: 1,
      status: "pending",
      researchSummary: research.data as unknown as Record<string, unknown>,
      draftText: writer.data.draft_text,
      hashtags: writer.data.hashtags,
      suggestedMediaRef: writer.data.suggested_media,
      reviewerFlags: reviewer.data as unknown as Record<string, unknown>,
      toneProfile: settings.tone_profile,
      modelProvider: writer.provider,
      modelName: writer.model,
      promptVersions,
    })
    .returning();

  const draftRow = row!;

  await db.insert(draftVersions).values({
    draftId: draftRow.id,
    version: 1,
    draftText: writer.data.draft_text,
    hashtags: writer.data.hashtags,
    origin: "ai",
    note: `Generated by ${writer.provider}/${writer.model}`,
  });

  // Mark the source activity as consumed so the timeline can show what was used.
  const eventIds = options.events.map((event) => event.id);
  if (eventIds.length > 0) {
    await db
      .update(activityLog)
      .set({ usedInDraftId: draftRow.id })
      .where(inArray(activityLog.id, eventIds));
  }

  await writeAudit(db, AUDIT_EVENTS.draftGenerated, {
    draft_id: draftRow.id,
    run_date: options.runDate,
    provider: writer.provider,
    model: writer.model,
    prompt_versions: promptVersions,
    provider_attempts: [...research.attempts, ...writer.attempts, ...reviewer.attempts],
  });

  return { draft: toDraft(draftRow), provider: writer.provider };
}

async function getRecentTopics(db: Db, storedTopics: string[]): Promise<string[]> {
  const recent = await db
    .select({ text: drafts.draftText, runDate: drafts.runDate })
    .from(drafts)
    .where(eq(drafts.status, "posted"))
    .orderBy(desc(drafts.createdAt))
    .limit(5);

  const topics = recent.map((row) => row.text.split("\n")[0]?.slice(0, 140) ?? "");
  return [...storedTopics, ...topics].filter(Boolean).slice(0, 8);
}

export async function listDrafts(db: Db, options: { status?: DraftStatus; limit?: number } = {}) {
  const where = options.status ? eq(drafts.status, options.status) : undefined;
  const rows = await db
    .select()
    .from(drafts)
    .where(where)
    .orderBy(desc(drafts.createdAt))
    .limit(options.limit ?? 50);
  return rows.map(toDraft);
}

export async function getDraftRow(db: Db, id: string) {
  const [row] = await db.select().from(drafts).where(eq(drafts.id, id)).limit(1);
  return row ?? null;
}

export async function getDraft(db: Db, id: string): Promise<Draft | null> {
  const row = await getDraftRow(db, id);
  return row ? toDraft(row) : null;
}

export async function getDraftVersions(db: Db, draftId: string) {
  return db
    .select()
    .from(draftVersions)
    .where(eq(draftVersions.draftId, draftId))
    .orderBy(desc(draftVersions.version));
}

export async function saveDraftEdit(db: Db, id: string, editedText: string): Promise<Draft | null> {
  const row = await getDraftRow(db, id);
  if (!row) return null;

  const [updated] = await db
    .update(drafts)
    .set({
      editedText,
      status: "edited",
      decidedAt: null,
    })
    .where(eq(drafts.id, id))
    .returning();

  await db.insert(draftVersions).values({
    draftId: id,
    version: row.version,
    draftText: editedText,
    hashtags: row.hashtags,
    origin: "edit",
    note: "Manual edit",
  });

  await writeAudit(db, AUDIT_EVENTS.draftEdited, { draft_id: id, characters: editedText.length });

  return toDraft(updated!);
}

/** Re-runs the Writer (and Reviewer) agent for an existing draft. */
export async function regenerateDraft(
  db: Db,
  id: string,
  instruction?: string,
): Promise<Draft | null> {
  const row = await getDraftRow(db, id);
  if (!row) return null;

  const settings = await getSettings(db);
  const summary = row.researchSummary as unknown as ResearchSummary;

  const writer = await runWriterAgent({
    summary,
    tone: settings.tone_profile as ToneProfile,
    userName: settings.user_name,
    userRole: settings.user_role,
    userBackground: settings.user_background,
    recentTopics: await getRecentTopics(db, settings.recent_topics),
    instruction,
  });

  const reviewer = await runReviewerAgent({
    draftText: writer.data.draft_text,
    hashtags: writer.data.hashtags,
    summary,
    bannedPhrases: settings.banned_phrases,
    excludedSources: [...settings.excluded_repos, ...settings.excluded_drive_folders],
    tone: settings.tone_profile as ToneProfile,
  });

  const nextVersion = row.version + 1;

  const [updated] = await db
    .update(drafts)
    .set({
      version: nextVersion,
      status: "pending",
      draftText: writer.data.draft_text,
      hashtags: writer.data.hashtags,
      suggestedMediaRef: writer.data.suggested_media,
      reviewerFlags: reviewer.data as unknown as Record<string, unknown>,
      editedText: null,
      decidedAt: null,
      modelProvider: writer.provider,
      modelName: writer.model,
    })
    .where(eq(drafts.id, id))
    .returning();

  await db.insert(draftVersions).values({
    draftId: id,
    version: nextVersion,
    draftText: writer.data.draft_text,
    hashtags: writer.data.hashtags,
    origin: "ai",
    note: instruction ? `Regenerated: ${instruction}` : "Regenerated",
  });

  await writeAudit(db, AUDIT_EVENTS.draftRegenerated, {
    draft_id: id,
    version: nextVersion,
    instruction: instruction ?? null,
    provider: writer.provider,
  });

  return toDraft(updated!);
}

export async function setDraftStatus(
  db: Db,
  id: string,
  status: DraftStatus,
  extra: { decidedAt?: Date; scheduledFor?: Date } = {},
): Promise<Draft | null> {
  const [updated] = await db
    .update(drafts)
    .set({
      status,
      decidedAt: extra.decidedAt ?? new Date(),
      scheduledFor: extra.scheduledFor ?? null,
    })
    .where(eq(drafts.id, id))
    .returning();
  return updated ? toDraft(updated) : null;
}

/** Activity events that were used to build a specific draft. */
export async function getDraftSourceActivity(db: Db, draftId: string): Promise<ActivityEvent[]> {
  const rows = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.usedInDraftId, draftId))
    .orderBy(desc(activityLog.occurredAt));
  return rows.map(toActivityEvent);
}

export async function getPostedDrafts(db: Db, limit = 10) {
  return db
    .select()
    .from(drafts)
    .where(eq(drafts.status, "posted"))
    .orderBy(desc(drafts.createdAt))
    .limit(limit);
}

export { and, sql };
