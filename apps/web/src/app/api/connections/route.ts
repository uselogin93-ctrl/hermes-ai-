import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { listConnections } from "@/lib/services/connections";
import { ok, toErrorResponse } from "@/lib/api/response";

export async function GET() {
  try {
    await requireSession();
    const db = await getDb();
    return ok(await listConnections(db));
  } catch (error) {
    return toErrorResponse(error);
  }
}
