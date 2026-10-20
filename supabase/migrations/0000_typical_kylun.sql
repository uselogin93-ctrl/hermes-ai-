CREATE TABLE "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"source_connection_id" uuid,
	"external_id" text NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"used_in_draft_id" uuid,
	"significance" text
);
--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_account_label" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_date" date NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"activity_count" integer DEFAULT 0 NOT NULL,
	"draft_id" uuid,
	"provider_used" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "draft_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"draft_text" text NOT NULL,
	"hashtags" text[] DEFAULT '{}' NOT NULL,
	"origin" text DEFAULT 'ai' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_date" date NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"research_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"draft_text" text DEFAULT '' NOT NULL,
	"hashtags" text[] DEFAULT '{}' NOT NULL,
	"suggested_media_ref" text,
	"reviewer_flags" jsonb,
	"edited_text" text,
	"tone_profile" text,
	"model_provider" text,
	"model_name" text,
	"prompt_versions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" text NOT NULL,
	"kind" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'sent' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"draft_id" uuid NOT NULL,
	"linkedin_post_id" text NOT NULL,
	"final_text" text NOT NULL,
	"post_url" text,
	"posted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"impressions" integer,
	"metrics_updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"posting_schedule_time" time DEFAULT '07:00:00' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"tone_profile" text DEFAULT 'professional' NOT NULL,
	"auto_approve_minor" boolean DEFAULT false NOT NULL,
	"auto_draft_minor" boolean DEFAULT false NOT NULL,
	"excluded_repos" text[] DEFAULT '{}' NOT NULL,
	"excluded_drive_folders" text[] DEFAULT '{}' NOT NULL,
	"banned_phrases" text[] DEFAULT '{}' NOT NULL,
	"notification_channel" text DEFAULT 'telegram' NOT NULL,
	"user_name" text DEFAULT 'Your Name' NOT NULL,
	"user_role" text DEFAULT 'Software Engineer' NOT NULL,
	"user_background" text DEFAULT '' NOT NULL,
	"telegram_chat_id" text DEFAULT '' NOT NULL,
	"kill_switch" boolean DEFAULT false NOT NULL,
	"retention_days" integer DEFAULT 180 NOT NULL,
	"recent_topics" text[] DEFAULT '{}' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_source_connection_id_connections_id_fk" FOREIGN KEY ("source_connection_id") REFERENCES "public"."connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_versions" ADD CONSTRAINT "draft_versions_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_log_dedupe_unique" ON "activity_log" USING btree ("source","source_connection_id","external_id");--> statement-breakpoint
CREATE INDEX "activity_log_occurred_idx" ON "activity_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "activity_log_source_idx" ON "activity_log" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_unique" ON "app_users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "connections_provider_account_unique" ON "connections" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "connections_provider_idx" ON "connections" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "daily_runs_run_date_idx" ON "daily_runs" USING btree ("run_date");--> statement-breakpoint
CREATE INDEX "draft_versions_draft_idx" ON "draft_versions" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "drafts_run_date_idx" ON "drafts" USING btree ("run_date");--> statement-breakpoint
CREATE INDEX "drafts_status_idx" ON "drafts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_created_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "posts_posted_at_idx" ON "posts" USING btree ("posted_at");