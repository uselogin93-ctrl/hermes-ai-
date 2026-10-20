import { requireSessionOrCronSecret } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { runDailyCycle } from "@/lib/services/orchestrator";
import { ok, toErrorResponse } from "@/lib/api/response";

/**
 * The scheduler entry point.
 *
 * Called by the GitHub Actions cron workflow with the shared secret header,
 * or manually from the dashboard with a user session.
 */
export async function POST(request: Request) {
  try {
    await requireSessionOrCronSecret(request);
    const db = await getDb();
    const result = await runDailyCycle(db, { trigger: "cron" });
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
