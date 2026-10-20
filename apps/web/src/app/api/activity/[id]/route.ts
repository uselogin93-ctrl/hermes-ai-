import { patchActivityRequestSchema } from "@careerpulse/shared-types";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { setActivityExcluded } from "@/lib/services/activity";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { ApiError, ok, toErrorResponse, parseBody } from "@/lib/api/response";

/** Manually excludes or re-includes an activity item. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await parseBody(request, patchActivityRequestSchema);

    const db = await getDb();
    const updated = await setActivityExcluded(db, id, body.excluded);
    if (!updated) throw new ApiError("NOT_FOUND", "Activity item not found.");

    await writeAudit(db, AUDIT_EVENTS.activityExcluded, { id, excluded: body.excluded });

    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
