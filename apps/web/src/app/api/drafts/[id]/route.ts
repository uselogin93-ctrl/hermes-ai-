import { patchDraftRequestSchema } from "@careerpulse/shared-types";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { getDraft, getDraftSourceActivity, getDraftVersions, saveDraftEdit } from "@/lib/services/drafts";
import { ApiError, ok, toErrorResponse, parseBody } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const db = await getDb();

    const draft = await getDraft(db, id);
    if (!draft) throw new ApiError("NOT_FOUND", "Draft not found.");

    const [sources, versions] = await Promise.all([
      getDraftSourceActivity(db, id),
      getDraftVersions(db, id),
    ]);

    return ok({ draft, sources, versions });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await parseBody(request, patchDraftRequestSchema);

    const db = await getDb();
    const updated = await saveDraftEdit(db, id, body.edited_text);
    if (!updated) throw new ApiError("NOT_FOUND", "Draft not found.");

    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
