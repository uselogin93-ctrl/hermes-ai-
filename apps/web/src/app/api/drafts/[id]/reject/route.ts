import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { setDraftStatus } from "@/lib/services/drafts";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { ApiError, ok, toErrorResponse } from "@/lib/api/response";

/** Rejects a draft. The action is always confirmed in the UI first. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const db = await getDb();

    const draft = await setDraftStatus(db, id, "rejected");
    if (!draft) throw new ApiError("NOT_FOUND", "Draft not found.");

    await writeAudit(db, AUDIT_EVENTS.draftRejected, { draft_id: id });

    return ok(draft);
  } catch (error) {
    return toErrorResponse(error);
  }
}
