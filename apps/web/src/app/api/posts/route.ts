import { desc, gte, lte } from "drizzle-orm";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { ok, toErrorResponse } from "@/lib/api/response";

export async function GET(request: Request) {
  try {
    await requireSession();
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    const db = await getDb();
    const conditions = [];
    if (from) conditions.push(gte(posts.postedAt, new Date(from)));
    if (to) conditions.push(lte(posts.postedAt, new Date(to)));

    const rows = await db
      .select()
      .from(posts)
      .where(conditions.length > 0 ? conditions.reduce((acc, condition) => acc && condition) : undefined)
      .orderBy(desc(posts.postedAt))
      .limit(200);

    return ok(rows);
  } catch (error) {
    return toErrorResponse(error);
  }
}
