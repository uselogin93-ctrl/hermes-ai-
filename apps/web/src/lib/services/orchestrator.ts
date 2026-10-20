import { desc, eq, gte } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { dailyRuns } from "@/lib/db/schema";
import type { RunStatus } from "@careerpulse/shared-types";
import { getSettings } from "@/lib/services/settings";
import { scanActivity, listActivity } from "@/lib/services/activity";
import { generateDraft } from "@/lib/services/drafts";
import { notifyDraftReady, notifyMessage } from "@/lib/services/notifications";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { dayBounds, localDate } from "@/lib/dates";
import { env } from "@/lib/env";

export type CycleTrigger = "cron" | "manual";

export type CycleResult = {
  runId: string;
  status: RunStatus;
  activityCount: number;
  draftId: string | null;
  provider: string | null;
  message: string;
  skippedReason?: string;
  error?: string;
};

/**
 * The daily cycle: scan activity → research → write → review → notify.
 *
 * This is the single entry point used by the cron workflow, the "Run now"
 * button and the dashboard, so every path produces the same audit trail.
 */
export async function runDailyCycle(
  db: Db,
  options: { runDate?: string; trigger: CycleTrigger; since?: Date } = { trigger: "cron" },
): Promise<CycleResult> {
  const settings = await getSettings(db);
  const runDate = options.runDate ?? localDate(new Date(), settings.timezone);

  if (settings.kill_switch) {
    const [row] = await db
      .insert(dailyRuns)
      .values({
        runDate,
        status: "skipped",
        finishedAt: new Date(),
        error: "Automation paused by the kill switch.",
      })
      .returning();

    await writeAudit(db, AUDIT_EVENTS.dailyCycleFinished, { run_date: runDate, status: "skipped" });

    return {
      runId: row!.id,
      status: "skipped",
      activityCount: 0,
      draftId: null,
      provider: null,
      skippedReason: "Automation is paused by the kill switch.",
      message: "Automation is paused. Turn the kill switch off in Settings to resume.",
    };
  }

  const [run] = await db
    .insert(dailyRuns)
    .values({ runDate, status: "running", startedAt: new Date() })
    .returning();

  const runId = run!.id;
  await writeAudit(db, AUDIT_EVENTS.dailyCycleStarted, {
    run_date: runDate,
    trigger: options.trigger,
    run_id: runId,
  });

  try {
    const since =
      options.since ??
      (await resolveSinceWindow(db, runDate, settings.timezone));

    const scan = await scanActivity(db, since);

    const { start, end } = dayBounds(runDate, settings.timezone);
    const events = await listActivity(db, {
      from: start,
      to: end,
      limit: 200,
    });

    const usableEvents = events
      .filter((row) => !row.excluded)
      .map((row) => ({
        id: row.id,
        source: row.source as "github" | "google_drive",
        source_connection_id: row.sourceConnectionId,
        external_id: row.externalId,
        event_type: row.eventType as never,
        title: row.title,
        detail: row.detail,
        url: row.url,
        occurred_at: row.occurredAt.toISOString(),
        ingested_at: row.ingestedAt.toISOString(),
        excluded: row.excluded,
        used_in_draft_id: row.usedInDraftId,
      }));

    const result = await generateDraft(db, { runDate, events: usableEvents });

    if (!result.draft) {
      await db
        .update(dailyRuns)
        .set({
          status: "completed",
          finishedAt: new Date(),
          activityCount: scan.newEventsCount,
          error: result.skippedReason ?? null,
        })
        .where(eq(dailyRuns.id, runId));

      await writeAudit(db, AUDIT_EVENTS.dailyCycleFinished, {
        run_date: runDate,
        status: "completed",
        activity_count: scan.newEventsCount,
        skipped: result.skippedReason ?? null,
      });

      return {
        runId,
        status: "completed",
        activityCount: scan.newEventsCount,
        draftId: null,
        provider: null,
        skippedReason: result.skippedReason,
        message: result.skippedReason ?? "No draft was created for this run.",
      };
    }

    const notification = await notifyDraftReady(db, result.draft, {
      channel: settings.notification_channel,
      chatId: settings.telegram_chat_id,
      appUrl: env.appUrl,
    });

    await db
      .update(dailyRuns)
      .set({
        status: "completed",
        finishedAt: new Date(),
        activityCount: scan.newEventsCount,
        draftId: result.draft.id,
        providerUsed: result.provider ?? null,
      })
      .where(eq(dailyRuns.id, runId));

    await writeAudit(db, AUDIT_EVENTS.dailyCycleFinished, {
      run_date: runDate,
      status: "completed",
      activity_count: scan.newEventsCount,
      draft_id: result.draft.id,
      provider: result.provider,
      notification: notification.status,
    });

    return {
      runId,
      status: "completed",
      activityCount: scan.newEventsCount,
      draftId: result.draft.id,
      provider: result.provider ?? null,
      message: "Draft generated and ready for review.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The daily cycle failed.";

    await db
      .update(dailyRuns)
      .set({ status: "failed", finishedAt: new Date(), error: message })
      .where(eq(dailyRuns.id, runId));

    await writeAudit(db, AUDIT_EVENTS.dailyCycleFinished, {
      run_date: runDate,
      status: "failed",
      error: message,
    });

    await notifyMessage(db, {
      channel: settings.notification_channel,
      chatId: settings.telegram_chat_id,
      kind: "cycle_failed",
      subject: "CareerPulse AI: the daily cycle did not complete",
      message: `The daily cycle could not finish: ${message}`,
    });

    return {
      runId,
      status: "failed",
      activityCount: 0,
      draftId: null,
      provider: null,
      message,
      error: message,
    };
  }
}

/** Uses the previous run as the window start, falling back to the last 24h. */
async function resolveSinceWindow(db: Db, runDate: string, timeZone: string): Promise<Date> {
  const [lastRun] = await db
    .select()
    .from(dailyRuns)
    .where(gte(dailyRuns.runDate, "1970-01-01"))
    .orderBy(desc(dailyRuns.startedAt))
    .limit(1);

  if (lastRun?.startedAt) return lastRun.startedAt;

  const { start } = dayBounds(runDate, timeZone);
  return new Date(start.getTime() - 24 * 60 * 60 * 1000);
}

export async function listRuns(db: Db, limit = 20) {
  return db.select().from(dailyRuns).orderBy(desc(dailyRuns.startedAt)).limit(limit);
}
