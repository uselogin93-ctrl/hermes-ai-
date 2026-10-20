import { scanRequestSchema } from "@careerpulse/shared-types";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { scanActivity } from "@/lib/services/activity";
import { ok, toErrorResponse, parseBody } from "@/lib/api/response";

/** Manual "Scan now" trigger. */
export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await parseBody(request, scanRequestSchema);
    const since = body.since ? new Date(body.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);

    const db = await getDb();
    const result = await scanActivity(db, since);
    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
