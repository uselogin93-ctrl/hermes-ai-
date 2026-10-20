import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { listActivity } from "@/lib/services/activity";
import { ok, toErrorResponse } from "@/lib/api/response";
import type { ActivitySource } from "@careerpulse/shared-types";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const source = url.searchParams.get("source") as ActivitySource | null;
    const used = url.searchParams.get("used");
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);

    const db = await getDb();
    const rows = await listActivity(db, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      source: source ?? undefined,
      used: used === "used" || used === "unused" ? used : undefined,
      limit: Number.isFinite(limit) ? limit : 50,
      offset: Number.isFinite(offset) ? offset : 0,
    });

    return ok(rows);
  } catch (error) {
    return toErrorResponse(error);
  }
}
