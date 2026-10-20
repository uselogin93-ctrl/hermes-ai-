import { regenerateRequestSchema } from "@careerpulse/shared-types";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { regenerateDraft } from "@/lib/services/drafts";
import { ApiError, ok, toErrorResponse, parseBody } from "@/lib/api/response";

/** Re-runs the Writer agent with optional user guidance. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const body = await parseBody(request, regenerateRequestSchema);

    const db = await getDb();
    const draft = await regenerateDraft(db, id, body.instruction);
    if (!draft) throw new ApiError("NOT_FOUND", "Draft not found.");

    return ok(draft);
  } catch (error) {
    return toErrorResponse(error);
  }
}
