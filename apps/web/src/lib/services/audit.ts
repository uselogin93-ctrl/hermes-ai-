import type { Db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

/**
 * Appends an entry to the audit log.
 *
 * Every external read, every AI generation and every publish is recorded so
 * the user can always answer "where did this post come from?".
 */
export async function writeAudit(
  db: Db,
  event: string,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(auditLog).values({ event, payload });
  } catch (error) {
    // Auditing must never break the primary flow.
    console.error("[audit] failed to record entry", event, error);
  }
}

export const AUDIT_EVENTS = {
  activityFetched: "activity_fetched",
  activityExcluded: "activity_excluded",
  draftGenerated: "draft_generated",
  draftEdited: "draft_edited",
  draftRegenerated: "draft_regenerated",
  draftApproved: "draft_approved",
  draftRejected: "draft_rejected",
  postPublished: "post_published",
  connectionCreated: "connection_created",
  connectionRevoked: "connection_revoked",
  tokenRefreshed: "token_refreshed",
  providerFailed: "provider_failed",
  killSwitchToggled: "kill_switch_toggled",
  settingsUpdated: "settings_updated",
  notificationSent: "notification_sent",
  dailyCycleStarted: "daily_cycle_started",
  dailyCycleFinished: "daily_cycle_finished",
} as const;

export type AuditEvent = (typeof AUDIT_EVENTS)[keyof typeof AUDIT_EVENTS];
