import { eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { settings as settingsTable, type SettingsRow } from "@/lib/db/schema";
import type { Settings, ToneProfile } from "@careerpulse/shared-types";

export function toSettings(row: SettingsRow): Settings {
  return {
    id: row.id,
    posting_schedule_time: row.postingScheduleTime.slice(0, 5),
    timezone: row.timezone,
    tone_profile: row.toneProfile as ToneProfile,
    auto_approve_minor: row.autoApproveMinor,
    auto_draft_minor: row.autoDraftMinor,
    excluded_repos: row.excludedRepos,
    excluded_drive_folders: row.excludedDriveFolders,
    banned_phrases: row.bannedPhrases,
    notification_channel: row.notificationChannel as Settings["notification_channel"],
    user_name: row.userName,
    user_role: row.userRole,
    user_background: row.userBackground,
    telegram_chat_id: row.telegramChatId,
    kill_switch: row.killSwitch,
    retention_days: row.retentionDays,
    recent_topics: row.recentTopics,
  };
}

export async function getSettings(db: Db): Promise<Settings> {
  const [row] = await db.select().from(settingsTable).limit(1);
  if (!row) {
    const [created] = await db.insert(settingsTable).values({}).returning();
    return toSettings(created!);
  }
  return toSettings(row);
}

export async function updateSettings(
  db: Db,
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings(db);
  const next = { ...current, ...patch };

  const [row] = await db
    .update(settingsTable)
    .set({
      postingScheduleTime: `${next.posting_schedule_time}:00`,
      timezone: next.timezone,
      toneProfile: next.tone_profile,
      autoApproveMinor: next.auto_approve_minor,
      autoDraftMinor: next.auto_draft_minor,
      excludedRepos: next.excluded_repos,
      excludedDriveFolders: next.excluded_drive_folders,
      bannedPhrases: next.banned_phrases,
      notificationChannel: next.notification_channel,
      userName: next.user_name,
      userRole: next.user_role,
      userBackground: next.user_background,
      telegramChatId: next.telegram_chat_id,
      killSwitch: next.kill_switch,
      retentionDays: next.retention_days,
      recentTopics: next.recent_topics,
      updatedAt: sql`now()`,
    })
    .where(eq(settingsTable.id, current.id))
    .returning();

  return toSettings(row!);
}
