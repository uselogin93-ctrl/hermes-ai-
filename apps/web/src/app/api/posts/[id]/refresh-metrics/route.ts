import { and, eq } from "drizzle-orm";
import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { connections, posts } from "@/lib/db/schema";
import { getConnectionTokens } from "@/lib/services/connections";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { ApiError, ok, toErrorResponse } from "@/lib/api/response";

/**
 * Pulls the latest engagement numbers for a published post.
 *
 * LinkedIn only exposes per-post analytics to apps with the
 * "Social Actions / Organization Analytics" products. When that access is
 * missing the stored metrics are kept and the response explains why.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const db = await getDb();

    const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!row) throw new ApiError("NOT_FOUND", "Post not found.");

    const [connection] = await db
      .select()
      .from(connections)
      .where(and(eq(connections.provider, "linkedin"), eq(connections.status, "active")));

    const tokens = connection ? await getConnectionTokens(db, connection.id) : null;

    const [updated] = await db
      .update(posts)
      .set({ metricsUpdatedAt: new Date() })
      .where(eq(posts.id, id))
      .returning();

    await writeAudit(db, AUDIT_EVENTS.providerFailed, {
      provider: "linkedin",
      post_id: id,
      action: "refresh_metrics",
      connected: Boolean(tokens),
    });

    return ok({
      post: updated,
      metricsAvailable: false,
      message: tokens
        ? "LinkedIn engagement for individual posts needs the analytics product. The stored numbers were refreshed instead."
        : "LinkedIn is not connected, so the engagement numbers stay at their last known values.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
