import { and, eq, ne } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { connections } from "@/lib/db/schema";
import type { Connection, ConnectionStatus, Provider } from "@careerpulse/shared-types";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";

export function toConnection(row: typeof connections.$inferSelect): Connection {
  return {
    id: row.id,
    provider: row.provider as Provider,
    provider_account_label: row.providerAccountLabel,
    provider_user_id: row.providerUserId,
    scopes: row.scopes,
    status: row.status as ConnectionStatus,
    connected_at: row.connectedAt.toISOString(),
    last_checked_at: row.lastCheckedAt?.toISOString() ?? null,
    expires_at: row.expiresAt?.toISOString() ?? null,
  };
}

export async function listConnections(db: Db): Promise<Connection[]> {
  const rows = await db.select().from(connections).orderBy(connections.connectedAt);
  return rows.map(toConnection);
}

export async function listConnectionsByProvider(db: Db, provider: Provider): Promise<Connection[]> {
  const rows = await db
    .select()
    .from(connections)
    .where(and(eq(connections.provider, provider), ne(connections.status, "revoked")));
  return rows.map(toConnection);
}

export async function upsertConnection(
  db: Db,
  input: {
    provider: Provider;
    label: string;
    providerUserId: string;
    accessToken: string;
    refreshToken: string | null;
    scopes: string[];
    expiresAt: Date | null;
  },
): Promise<Connection> {
  const encryptedAccess = encryptSecret(input.accessToken);
  const encryptedRefresh = input.refreshToken ? encryptSecret(input.refreshToken) : null;

  const [row] = await db
    .insert(connections)
    .values({
      provider: input.provider,
      providerAccountLabel: input.label,
      providerUserId: input.providerUserId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      scopes: input.scopes,
      status: "active",
      connectedAt: new Date(),
      lastCheckedAt: new Date(),
      expiresAt: input.expiresAt,
    })
    .onConflictDoUpdate({
      target: [connections.provider, connections.providerUserId],
      set: {
        providerAccountLabel: input.label,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        scopes: input.scopes,
        status: "active",
        lastCheckedAt: new Date(),
        expiresAt: input.expiresAt,
      },
    })
    .returning();

  await writeAudit(db, AUDIT_EVENTS.connectionCreated, {
    provider: input.provider,
    label: input.label,
    scopes: input.scopes,
  });

  return toConnection(row!);
}

export async function markConnectionStatus(
  db: Db,
  id: string,
  status: ConnectionStatus,
): Promise<void> {
  await db
    .update(connections)
    .set({ status, lastCheckedAt: new Date() })
    .where(eq(connections.id, id));
}

export async function revokeConnection(db: Db, id: string): Promise<Connection | null> {
  const [row] = await db
    .update(connections)
    .set({ status: "revoked", lastCheckedAt: new Date() })
    .where(eq(connections.id, id))
    .returning();

  if (row) {
    await writeAudit(db, AUDIT_EVENTS.connectionRevoked, {
      provider: row.provider,
      label: row.providerAccountLabel,
    });
  }

  return row ? toConnection(row) : null;
}

export async function getConnectionTokens(db: Db, id: string) {
  const [row] = await db.select().from(connections).where(eq(connections.id, id)).limit(1);
  if (!row) return null;
  return {
    row,
    accessToken: decryptSecret(row.accessToken),
    refreshToken: row.refreshToken ? decryptSecret(row.refreshToken) : null,
  };
}
