import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { getDb } from "@/lib/db";
import { listActivity, toActivityEvent } from "@/lib/services/activity";
import { listDrafts } from "@/lib/services/drafts";
import { getDashboardStats } from "@/lib/services/stats";
import { getSettings } from "@/lib/services/settings";
import { localDate } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryStrip } from "@/components/dashboard/summary-strip";
import { TodayDraft } from "@/components/dashboard/today-draft";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { RunCycleButton } from "@/components/dashboard/run-cycle-button";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = await getDb();
  const [stats, settings, drafts, recentRows] = await Promise.all([
    getDashboardStats(db),
    getSettings(db),
    listDrafts(db, { limit: 20 }),
    listActivity(db, { limit: 12 }),
  ]);

  const today = localDate(new Date(), settings.timezone);
  const todayDraft =
    drafts.find((draft) => draft.run_date === today && draft.status === "pending") ??
    drafts.find((draft) => draft.status === "pending") ??
    null;

  const recentEvents = recentRows.map(toActivityEvent);

  const engagement = await db.query.posts.findMany({
    orderBy: (posts, { desc }) => [desc(posts.postedAt)],
    limit: 12,
  });

  const chartData = engagement
    .slice()
    .reverse()
    .map((post) => ({
      date: post.postedAt.toISOString().slice(0, 10),
      likes: post.likes,
      comments: post.comments,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Everything the system picked up, and the one decision that needs you.
          </p>
        </div>
        <RunCycleButton />
      </div>

      <SummaryStrip
        items={[
          {
            label: "Waiting for review",
            value: stats.pendingDrafts,
            hint: stats.pendingDrafts === 0 ? "Nothing pending" : "Needs a decision",
          },
          { label: "Activity today", value: stats.activityToday, hint: `${stats.activityLast7Days} in 7 days` },
          { label: "Posting streak", value: `${stats.streakDays}d`, hint: `${stats.postedTotal} published` },
          {
            label: "Engagement",
            value: stats.engagement.likes,
            hint: `${stats.engagement.comments} comments`,
          },
        ]}
      />

      <TodayDraft draft={todayDraft} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle>Recent activity</CardTitle>
            <Link
              href="/activity"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
            >
              Full timeline
              <ArrowRightIcon size={12} />
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <ActivityFeed events={recentEvents} />
          </CardContent>
        </Card>

        <PerformanceChart data={chartData} />
      </div>
    </div>
  );
}
