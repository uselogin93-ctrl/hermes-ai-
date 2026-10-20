import { and, count, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { activityLog, drafts, posts } from "@/lib/db/schema";
import { getSettings } from "@/lib/services/settings";
import { nextScheduledRun, localDate } from "@/lib/dates";

export type DashboardStats = {
  pendingDrafts: number;
  postedTotal: number;
  activityToday: number;
  activityLast7Days: number;
  streakDays: number;
  nextRunAt: string;
  averageConfidence: number | null;
  engagement: { likes: number; comments: number };
};

/** Current publishing streak, counted in consecutive days with a live post. */
async function computeStreak(db: Db): Promise<number> {
  const posted = await db
    .select({ runDate: drafts.runDate })
    .from(drafts)
    .where(eq(drafts.status, "posted"))
    .orderBy(desc(drafts.runDate))
    .limit(120);

  if (posted.length === 0) return 0;

  const dates = new Set(posted.map((row) => row.runDate));
  let streak = 0;
  const cursor = new Date();

  for (let index = 0; index < 120; index += 1) {
    const key = localDate(cursor, "UTC");
    if (dates.has(key)) {
      streak += 1;
    } else if (index > 0) {
      break;
    } else if (streak === 0) {
      // Today may simply not have a post yet; look one day back.
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export async function getDashboardStats(db: Db): Promise<DashboardStats> {
  const settings = await getSettings(db);
  const today = localDate(new Date(), settings.timezone);

  const [pending] = await db
    .select({ value: count() })
    .from(drafts)
    .where(and(eq(drafts.status, "pending"), eq(drafts.runDate, today)));

  const [postedTotal] = await db.select({ value: count() }).from(posts);

  const sinceToday = new Date(`${today}T00:00:00.000Z`);
  const [activityToday] = await db
    .select({ value: count() })
    .from(activityLog)
    .where(gte(activityLog.occurredAt, sinceToday));

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [activityLast7Days] = await db
    .select({ value: count() })
    .from(activityLog)
    .where(gte(activityLog.occurredAt, weekAgo));

  const [engagement] = await db
    .select({
      likes: sql<number>`coalesce(sum(${posts.likes}), 0)::int`,
      comments: sql<number>`coalesce(sum(${posts.comments}), 0)::int`,
    })
    .from(posts);

  const [confidenceRow] = await db
    .select({
      value: sql<number>`coalesce(avg((${drafts.reviewerFlags} ->> 'confidence')::numeric), 0)::float`,
    })
    .from(drafts)
    .where(and(isNotNull(drafts.reviewerFlags), eq(drafts.status, "posted")));

  const nextRun = nextScheduledRun(settings.posting_schedule_time, settings.timezone);

  return {
    pendingDrafts: pending?.value ?? 0,
    postedTotal: postedTotal?.value ?? 0,
    activityToday: activityToday?.value ?? 0,
    activityLast7Days: activityLast7Days?.value ?? 0,
    streakDays: await computeStreak(db),
    nextRunAt: nextRun.toISOString(),
    averageConfidence: confidenceRow?.value ?? null,
    engagement: {
      likes: engagement?.likes ?? 0,
      comments: engagement?.comments ?? 0,
    },
  };
}
