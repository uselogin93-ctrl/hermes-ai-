import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getSettings } from "@/lib/services/settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationLog } from "@/components/notifications/notification-log";
import { TestNotificationButton } from "@/components/notifications/test-notification-button";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const db = await getDb();
  const [settings, rows] = await Promise.all([
    getSettings(db),
    db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(50),
  ]);

  const channel = settings.notification_channel;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            The channel the app uses to ask you for a review, and a log of everything it sent.
          </p>
        </div>
        <TestNotificationButton disabled={channel === "none"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Channel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted-foreground">Configured channel</span>
            <Badge tone={channel === "none" ? "neutral" : "accent"}>{channel}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted-foreground">Telegram chat id</span>
            {settings.telegram_chat_id ? (
              <Badge tone="outline" className="font-mono">
                {settings.telegram_chat_id}
              </Badge>
            ) : (
              <span className="text-[13px] text-muted-foreground">not set</span>
            )}
          </div>

          <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">
            A message is sent once per daily cycle, and only when that cycle produced a draft waiting
            for review. It carries the first lines of the draft and a link to the review screen.
            Failed deliveries are kept in the log below with the reason the provider gave, and
            nothing is sent when the kill switch is on or the channel is set to none.
          </p>
        </CardContent>
      </Card>

      <NotificationLog
        entries={rows.map((row) => ({
          id: row.id,
          channel: row.channel,
          kind: row.kind,
          message: row.message,
          status: row.status,
          error: row.error,
          createdAt: row.createdAt,
        }))}
        timeZone={settings.timezone}
      />
    </div>
  );
}
