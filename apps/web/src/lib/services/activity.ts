import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { activityLog, connections } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/security/crypto";
import { getConnector } from "@/lib/connectors";
import type { ConnectorContext } from "@/lib/connectors/types";
import { getSettings } from "@/lib/services/settings";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import type { ActivityEvent, ActivitySource, Provider } from "@careerpulse/shared-types";

export type ScanResult = {
  newEventsCount: number;
  events: ActivityEvent[];
  scannedConnections: number;
  skippedConnections: { label: string; reason: string }[];
};

type ConnectionRow = typeof connections.$inferSelect;

function toConnectorContext(row: ConnectionRow): ConnectorContext {
  return {
    connectionId: row.id,
    provider: row.provider as ConnectorContext["provider"],
    label: row.providerAccountLabel,
    accessToken: decryptSecret(row.accessToken),
    refreshToken: row.refreshToken ? decryptSecret(row.refreshToken) : null,
    scopes: row.scopes,
    providerUserId: row.providerUserId,
  };
}

/** Applies the user's exclusion rules to a single raw event. */
function isExcluded(
  detail: Record<string, unknown>,
  excludedRepos: string[],
  excludedFolders: string[],
): boolean {
  const repo = String(detail.repo ?? "").toLowerCase();
  if (repo && excludedRepos.map((r) => r.toLowerCase()).includes(repo)) return true;

  const parentIds = Array.isArray(detail.parentIds) ? (detail.parentIds as string[]) : [];
  if (parentIds.some((id) => excludedFolders.includes(id))) return true;

  return false;
}

/**
 * Pulls activity from every active connection and stores new events.
 *
 * Duplicate events are ignored through the `(source, connection, external_id)`
 * unique index, so a scan can safely run more than once per day.
 */
export async function scanActivity(db: Db, since: Date): Promise<ScanResult> {
  const settings = await getSettings(db);
  const activeConnections = await db
    .select()
    .from(connections)
    .where(eq(connections.status, "active"));

  const skippedConnections: ScanResult["skippedConnections"] = [];
  let newEventsCount = 0;
  const ingested: ActivityEvent[] = [];

  for (const row of activeConnections) {
    if (row.provider === "linkedin") continue; // publishing target only

    const ctx = toConnectorContext(row);
    try {
      const raw = await getConnector(row.provider as Provider).fetchActivity(ctx, since);

      for (const item of raw) {
        if (isExcluded(item.detail, settings.excluded_repos, settings.excluded_drive_folders)) {
          continue;
        }

        const inserted = await db
          .insert(activityLog)
          .values({
            source: row.provider,
            sourceConnectionId: row.id,
            externalId: item.externalId,
            eventType: item.eventType,
            title: item.title,
            detail: item.detail,
            url: item.url,
            occurredAt: item.occurredAt,
            ingestedAt: new Date(),
            excluded: false,
          })
          .onConflictDoNothing({
            target: [activityLog.source, activityLog.sourceConnectionId, activityLog.externalId],
          })
          .returning();

        if (inserted.length > 0) {
          newEventsCount += 1;
          ingested.push(toActivityEvent(inserted[0]!));
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown connector error";
      skippedConnections.push({ label: row.providerAccountLabel, reason });
      await writeAudit(db, AUDIT_EVENTS.providerFailed, {
        provider: row.provider,
        label: row.providerAccountLabel,
        error: reason,
      });
    }
  }

  await writeAudit(db, AUDIT_EVENTS.activityFetched, {
    since: since.toISOString(),
    newEventsCount,
    scannedConnections: activeConnections.length,
  });

  return {
    newEventsCount,
    events: ingested,
    scannedConnections: activeConnections.length,
    skippedConnections,
  };
}

export function toActivityEvent(row: typeof activityLog.$inferSelect): ActivityEvent {
  return {
    id: row.id,
    source: row.source as ActivityEvent["source"],
    source_connection_id: row.sourceConnectionId,
    external_id: row.externalId,
    event_type: row.eventType as ActivityEvent["event_type"],
    title: row.title,
    detail: row.detail,
    url: row.url,
    occurred_at: row.occurredAt.toISOString(),
    ingested_at: row.ingestedAt.toISOString(),
    excluded: row.excluded,
    used_in_draft_id: row.usedInDraftId,
  };
}

export type ActivityFilters = {
  from?: Date;
  to?: Date;
  source?: ActivitySource;
  used?: "used" | "unused";
  limit?: number;
  offset?: number;
};

export async function listActivity(db: Db, filters: ActivityFilters) {
  const conditions = [];
  if (filters.from) conditions.push(gte(activityLog.occurredAt, filters.from));
  if (filters.to) conditions.push(lte(activityLog.occurredAt, filters.to));
  if (filters.source) conditions.push(eq(activityLog.source, filters.source));
  if (filters.used === "used") conditions.push(sql`${activityLog.usedInDraftId} is not null`);
  if (filters.used === "unused") conditions.push(sql`${activityLog.usedInDraftId} is null`);

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select()
    .from(activityLog)
    .where(where)
    .orderBy(desc(activityLog.occurredAt))
    .limit(filters.limit ?? 50)
    .offset(filters.offset ?? 0);
}

export async function setActivityExcluded(db: Db, id: string, excluded: boolean) {
  const [row] = await db
    .update(activityLog)
    .set({ excluded })
    .where(eq(activityLog.id, id))
    .returning();
  return row ? toActivityEvent(row) : null;
}
