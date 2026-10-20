import type { Db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import { sendEmail } from "@/lib/notifications/email";
import { env } from "@/lib/env";
import type { Draft, NotificationChannel } from "@careerpulse/shared-types";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";

export type NotificationRecord = {
  channel: string;
  kind: string;
  message: string;
  status: "sent" | "failed" | "skipped";
  error?: string | null;
};

async function persist(db: Db, record: NotificationRecord): Promise<void> {
  await db.insert(notifications).values({
    channel: record.channel,
    kind: record.kind,
    message: record.message,
    status: record.status,
    error: record.error ?? null,
  });
}

/** Sends a plain message over the configured channel and records the attempt. */
export async function notifyMessage(
  db: Db,
  options: {
    channel: NotificationChannel;
    chatId?: string;
    email?: string;
    kind: string;
    message: string;
    subject?: string;
    buttons?: { text: string; url?: string }[];
  },
): Promise<NotificationRecord> {
  const { channel, kind, message } = options;

  if (channel === "none") {
    const record: NotificationRecord = {
      channel: "none",
      kind,
      message,
      status: "skipped",
      error: "Notifications are disabled in settings.",
    };
    await persist(db, record);
    return record;
  }

  if (channel === "telegram") {
    const result = await sendTelegramMessage(message, {
      chatId: options.chatId,
      buttons: options.buttons,
    });
    const record: NotificationRecord = {
      channel: "telegram",
      kind,
      message,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : result.detail,
    };
    await persist(db, record);
    await writeAudit(db, AUDIT_EVENTS.notificationSent, { channel: "telegram", ok: result.ok });
    return record;
  }

  const result = await sendEmail(
    options.email ?? env.adminEmail,
    options.subject ?? "CareerPulse AI",
    message,
  );
  const record: NotificationRecord = {
    channel: "email",
    kind,
    message,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.detail,
  };
  await persist(db, record);
  await writeAudit(db, AUDIT_EVENTS.notificationSent, { channel: "email", ok: result.ok });
  return record;
}

/**
 * Sends the "draft ready" alert.
 *
 * Telegram is the primary channel; email is the fallback. Every attempt is
 * written to the notification log so the Notifications screen can show what
 * was sent and when.
 */
export async function notifyDraftReady(
  db: Db,
  draft: Draft,
  options: { channel: NotificationChannel; chatId?: string; email?: string; appUrl?: string },
): Promise<NotificationRecord> {
  const appUrl = options.appUrl ?? env.appUrl;
  const link = `${appUrl}/drafts/${draft.id}`;
  const message = [
    "Today's draft is ready for review.",
    "",
    draft.draft_text.split("\n").slice(0, 6).join("\n"),
    "",
    `Review it here: ${link}`,
  ].join("\n");

  return notifyMessage(db, {
    channel: options.channel,
    chatId: options.chatId,
    email: options.email,
    kind: "draft_ready",
    message,
    buttons: [{ text: "Review draft", url: link }],
  });
}

/** Sends a test message through the configured channel. */
export async function sendTestNotification(
  db: Db,
  options: { channel: NotificationChannel; chatId?: string; email?: string },
): Promise<NotificationRecord> {
  const message = `CareerPulse AI test notification at ${new Date().toISOString()}.`;
  if (options.channel === "none") {
    const record: NotificationRecord = {
      channel: "none",
      kind: "test",
      message,
      status: "skipped",
      error: "Notifications are disabled in settings.",
    };
    await persist(db, record);
    return record;
  }
  if (options.channel === "telegram") {
    const result = await sendTelegramMessage(message, { chatId: options.chatId });
    const record: NotificationRecord = {
      channel: "telegram",
      kind: "test",
      message,
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : result.detail,
    };
    await persist(db, record);
    return record;
  }
  const result = await sendEmail(options.email ?? env.adminEmail, "CareerPulse AI test", message);
  const record: NotificationRecord = {
    channel: "email",
    kind: "test",
    message,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.detail,
  };
  await persist(db, record);
  return record;
}

export async function listNotifications(db: Db, limit = 50) {
  return db.select().from(notifications).orderBy(notifications.createdAt).limit(limit);
}
