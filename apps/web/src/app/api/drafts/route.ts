import { draftStatusSchema } from "@careerpulse/shared-types";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { listDrafts } from "@/lib/services/drafts";
import { ok, toErrorResponse } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const parsed = status ? draftStatusSchema.safeParse(status) : null;

    const db = await getDb();
    const drafts = await listDrafts(db, {
      status: parsed?.success ? parsed.data : undefined,
      limit: Number(url.searchParams.get("limit") ?? 50),
    });

    return ok(drafts);
  } catch (error) {
    return toErrorResponse(error);
  }
}
