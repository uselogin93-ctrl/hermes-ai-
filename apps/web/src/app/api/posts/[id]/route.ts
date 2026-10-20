import { eq } from "drizzle-orm";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { ApiError, ok, toErrorResponse } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const db = await getDb();

    const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!row) throw new ApiError("NOT_FOUND", "Post not found.");

    return ok(row);
  } catch (error) {
    return toErrorResponse(error);
  }
}
