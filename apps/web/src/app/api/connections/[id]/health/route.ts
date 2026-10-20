import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { getConnectionTokens, markConnectionStatus } from "@/lib/services/connections";
import { getConnector } from "@/lib/connectors";
import type { Provider } from "@careerpulse/shared-types";
import { ok, toErrorResponse } from "@/lib/api/response";

/** Checks a stored token against its provider. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const db = await getDb();

    const tokens = await getConnectionTokens(db, id);
    if (!tokens) {
      return ok({ status: "missing", last_checked_at: null });
    }

    const result = await getConnector(tokens.row.provider as Provider).healthCheck({
      connectionId: tokens.row.id,
      provider: tokens.row.provider as Provider,
      label: tokens.row.providerAccountLabel,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      scopes: tokens.row.scopes,
      providerUserId: tokens.row.providerUserId,
    });

    await markConnectionStatus(db, id, result.ok ? "active" : "expired");

    return ok({
      status: result.ok ? "active" : "expired",
      detail: result.detail ?? null,
      last_checked_at: new Date().toISOString(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
