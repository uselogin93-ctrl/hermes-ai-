import { requireSessionOrCronSecret } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { runDailyCycle } from "@/lib/services/orchestrator";
import { publishDueScheduledDrafts } from "@/lib/services/publishing";
import { ok, toErrorResponse } from "@/lib/api/response";

/**
 * The scheduler entry point.
 *
 * Called by the GitHub Actions cron workflow with the shared secret header,
 * or manually from the dashboard with a user session. Runs the daily
 * scan → draft cycle, then publishes any drafts whose scheduled time has
 * arrived (scheduling a draft only records intent; this sweep is what
 * actually posts it).
 */
export async function POST(request: Request) {
  try {
    await requireSessionOrCronSecret(request);
    const db = await getDb();
    const result = await runDailyCycle(db, { trigger: "cron" });
    const scheduled = await publishDueScheduledDrafts(db);
    return ok({ ...result, scheduledPublish: scheduled });
  } catch (error) {
    return toErrorResponse(error);
  }
}
