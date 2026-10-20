import { generateDraftRequestSchema } from "@careerpulse/shared-types";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { dayBounds, localDate } from "@/lib/dates";
import { generateDraft } from "@/lib/services/drafts";
import { getSettings } from "@/lib/services/settings";
import { listActivity } from "@/lib/services/activity";
import { ok, toErrorResponse, parseBody } from "@/lib/api/response";

/** Runs Research → Writer → Reviewer for a given day. */
export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await parseBody(request, generateDraftRequestSchema);

    const db = await getDb();
    const settings = await getSettings(db);
    const runDate = body.run_date ?? localDate(new Date(), settings.timezone);
    const { start, end } = dayBounds(runDate, settings.timezone);

    const rows = await listActivity(db, { from: start, to: end, limit: 200 });
    const events = rows
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

    const result = await generateDraft(db, { runDate, events, force: body.force });

    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
