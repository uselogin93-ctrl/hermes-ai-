import { approveDraftRequestSchema } from "@careerpulse/shared-types";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { publishDraftToLinkedIn, scheduleDraft } from "@/lib/services/publishing";
import { notifyPublished } from "@/lib/services/publishing";

import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { ApiError, ok, toErrorResponse, parseBody } from "@/lib/api/response";

/** Approves a draft, either publishing it now or scheduling it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await parseBody(request, approveDraftRequestSchema);

    const db = await getDb();

    if (!body.post_now) {
      if (!body.scheduled_for) {
        throw new ApiError("VALIDATION_ERROR", "Pick a date and time for the scheduled post.");
      }
      const scheduled = await scheduleDraft(db, id, new Date(body.scheduled_for));
      if (!scheduled) throw new ApiError("NOT_FOUND", "Draft not found.");
      await writeAudit(db, AUDIT_EVENTS.draftApproved, { draft_id: id, scheduled_for: body.scheduled_for });
      return ok({ published: false, scheduled_for: body.scheduled_for });
    }

    const result = await publishDraftToLinkedIn(db, id);

    if (!result.published) {
      await writeAudit(db, AUDIT_EVENTS.draftApproved, {
        draft_id: id,
        published: false,
        reason: result.message,
      });
      return ok(result);
    }

    await writeAudit(db, AUDIT_EVENTS.draftApproved, { draft_id: id, published: true });
    await notifyPublished(db, id, result.url ?? null);

    return ok(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
