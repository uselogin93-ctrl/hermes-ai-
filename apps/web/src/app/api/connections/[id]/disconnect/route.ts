import { requireSession } from "@/lib/api/guard";
import { getDb } from "@/lib/db";
import { getConnectionTokens, revokeConnection } from "@/lib/services/connections";
import { revokeToken } from "@/lib/connectors/oauth";
import type { Provider } from "@careerpulse/shared-types";
import { ok, toErrorResponse } from "@/lib/api/response";

/** Disconnects an account and revokes the token at the provider. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;
    const db = await getDb();

    const tokens = await getConnectionTokens(db, id);
    if (!tokens) {
      return ok({ disconnected: false, message: "Connection not found." });
    }

    await revokeToken(tokens.row.provider as Provider, tokens.accessToken);
    const updated = await revokeConnection(db, id);

    return ok({
      disconnected: Boolean(updated),
      message: "The account was disconnected and the token revoked.",
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
