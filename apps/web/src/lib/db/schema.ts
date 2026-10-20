import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ *
 * connections — one row per connected external account
 * ------------------------------------------------------------------ */

export const connections = pgTable(
  "connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerAccountLabel: text("provider_account_label").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    scopes: text("scopes").array().notNull().default([]),
    status: text("status").notNull().default("active"),
    connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    uniqueIndex("connections_provider_account_unique").on(
      table.provider,
      table.providerUserId,
    ),
    index("connections_provider_idx").on(table.provider),
  ],
);

/* ------------------------------------------------------------------ *
 * activity_log — normalized GitHub / Drive events
 * ------------------------------------------------------------------ */

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source").notNull(),
    sourceConnectionId: uuid("source_connection_id").references(() => connections.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id").notNull(),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    url: text("url").notNull().default(""),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
    excluded: boolean("excluded").notNull().default(false),
    usedInDraftId: uuid("used_in_draft_id"),
    significance: text("significance"),
  },
  (table) => [
    uniqueIndex("activity_log_dedupe_unique").on(
      table.source,
      table.sourceConnectionId,
      table.externalId,
    ),
    index("activity_log_occurred_idx").on(table.occurredAt),
    index("activity_log_source_idx").on(table.source),
  ],
);

/* ------------------------------------------------------------------ *
 * drafts — versioned AI drafts
 * ------------------------------------------------------------------ */

export const drafts = pgTable(
  "drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runDate: date("run_date").notNull(),
    version: integer("version").notNull().default(1),
    status: text("status").notNull().default("pending"),
    researchSummary: jsonb("research_summary").$type<Record<string, unknown>>().notNull().default({}),
    draftText: text("draft_text").notNull().default(""),
    hashtags: text("hashtags").array().notNull().default([]),
    suggestedMediaRef: text("suggested_media_ref"),
    reviewerFlags: jsonb("reviewer_flags").$type<Record<string, unknown> | null>(),
    editedText: text("edited_text"),
    toneProfile: text("tone_profile"),
    modelProvider: text("model_provider"),
    modelName: text("model_name"),
    promptVersions: jsonb("prompt_versions").$type<Record<string, string> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  },
  (table) => [
    index("drafts_run_date_idx").on(table.runDate),
    index("drafts_status_idx").on(table.status),
  ],
);

/* ------------------------------------------------------------------ *
 * draft_versions — keeps history for the diff view
 * ------------------------------------------------------------------ */

export const draftVersions = pgTable(
  "draft_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    draftText: text("draft_text").notNull(),
    hashtags: text("hashtags").array().notNull().default([]),
    origin: text("origin").notNull().default("ai"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("draft_versions_draft_idx").on(table.draftId)],
);

/* ------------------------------------------------------------------ *
 * posts — published record
 * ------------------------------------------------------------------ */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => drafts.id, { onDelete: "cascade" }),
    linkedinPostId: text("linkedin_post_id").notNull(),
    finalText: text("final_text").notNull(),
    postUrl: text("post_url"),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    impressions: integer("impressions"),
    metricsUpdatedAt: timestamp("metrics_updated_at", { withTimezone: true }),
  },
  (table) => [index("posts_posted_at_idx").on(table.postedAt)],
);

/* ------------------------------------------------------------------ *
 * settings — single row, app wide (single tenant v1)
 * ------------------------------------------------------------------ */

export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  postingScheduleTime: time("posting_schedule_time").notNull().default("07:00:00"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  toneProfile: text("tone_profile").notNull().default("professional"),
  autoApproveMinor: boolean("auto_approve_minor").notNull().default(false),
  autoDraftMinor: boolean("auto_draft_minor").notNull().default(false),
  excludedRepos: text("excluded_repos").array().notNull().default([]),
  excludedDriveFolders: text("excluded_drive_folders").array().notNull().default([]),
  bannedPhrases: text("banned_phrases").array().notNull().default([]),
  notificationChannel: text("notification_channel").notNull().default("telegram"),
  userName: text("user_name").notNull().default("Your Name"),
  userRole: text("user_role").notNull().default("Software Engineer"),
  userBackground: text("user_background").notNull().default(""),
  telegramChatId: text("telegram_chat_id").notNull().default(""),
  killSwitch: boolean("kill_switch").notNull().default(false),
  retentionDays: integer("retention_days").notNull().default(180),
  recentTopics: text("recent_topics").array().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ *
 * audit_log — full trace of what was read and generated
 * ------------------------------------------------------------------ */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event: text("event").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_log_created_idx").on(table.createdAt)],
);

/* ------------------------------------------------------------------ *
 * daily_runs — one row per orchestrator cycle
 * ------------------------------------------------------------------ */

export const dailyRuns = pgTable(
  "daily_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runDate: date("run_date").notNull(),
    status: text("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    activityCount: integer("activity_count").notNull().default(0),
    draftId: uuid("draft_id"),
    providerUsed: text("provider_used"),
    error: text("error"),
  },
  (table) => [index("daily_runs_run_date_idx").on(table.runDate)],
);

/* ------------------------------------------------------------------ *
 * notifications — delivery log for Telegram / email
 * ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channel: text("channel").notNull(),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    status: text("status").notNull().default("sent"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_created_idx").on(table.createdAt)],
);

/* ------------------------------------------------------------------ *
 * app_users — single-admin login for the local credential flow
 * ------------------------------------------------------------------ */

export const appUsers = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("app_users_email_unique").on(table.email)],
);

/* ------------------------------------------------------------------ *
 * Relations
 * ------------------------------------------------------------------ */

export const connectionsRelations = relations(connections, ({ many }) => ({
  activity: many(activityLog),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  connection: one(connections, {
    fields: [activityLog.sourceConnectionId],
    references: [connections.id],
  }),
}));

export const draftsRelations = relations(drafts, ({ many }) => ({
  versions: many(draftVersions),
  posts: many(posts),
  usedActivity: many(activityLog),
}));

export const draftVersionsRelations = relations(draftVersions, ({ one }) => ({
  draft: one(drafts, {
    fields: [draftVersions.draftId],
    references: [drafts.id],
  }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  draft: one(drafts, {
    fields: [posts.draftId],
    references: [drafts.id],
  }),
}));

export type ConnectionRow = typeof connections.$inferSelect;
export type ActivityLogRow = typeof activityLog.$inferSelect;
export type DraftRow = typeof drafts.$inferSelect;
export type DraftVersionRow = typeof draftVersions.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
export type DailyRunRow = typeof dailyRuns.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type AppUserRow = typeof appUsers.$inferSelect;
