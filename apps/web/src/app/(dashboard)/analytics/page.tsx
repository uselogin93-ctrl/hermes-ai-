import type { Metadata } from "next";
import Link from "next/link";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { getDb } from "@/lib/db";
import { getDashboardStats } from "@/lib/services/stats";
import { getSettings } from "@/lib/services/settings";
import { localDate } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SummaryStrip, EmptyState } from "@/components/dashboard/summary-strip";
import { PerformanceChart } from "@/components/dashboard/performance-chart";
import { PostingFrequency, type WeekBucket } from "@/components/analytics/posting-frequency";
import { RefreshMetricsButton } from "@/components/analytics/refresh-metrics-button";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

function formatDate(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

/** Counts the published posts in each of the last eight seven day windows. */
function buildWeeks(postDates: string[], today: string): WeekBucket[] {
  const buckets: WeekBucket[] = [];

  for (let index = 7; index >= 0; index -= 1) {
    const end = new Date(`${today}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() - index * 7);
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);

    const startKey = start.toISOString().slice(0, 10);
    const endKey = end.toISOString().slice(0, 10);
    const count = postDates.filter((date) => date >= startKey && date <= endKey).length;

    buckets.push({
      start: startKey,
      label: new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
      }).format(new Date(`${startKey}T12:00:00Z`)),
      count,
    });
  }

  return buckets;
}

export default async function AnalyticsPage() {
  const db = await getDb();
  const [settings, stats, postRows] = await Promise.all([
    getSettings(db),
    getDashboardStats(db),
    db.query.posts.findMany({
      orderBy: (posts, { desc }) => [desc(posts.postedAt)],
      limit: 200,
    }),
  ]);

  const today = localDate(new Date(), settings.timezone);
  const postDates = postRows.map((post) => localDate(post.postedAt, settings.timezone));
  const weeks = buildWeeks(postDates, today);

  const totalLikes = postRows.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = postRows.reduce((sum, post) => sum + post.comments, 0);

  const chartData = postRows
    .slice(0, 12)
    .reverse()
    .map((post) => ({
      date: post.postedAt.toISOString().slice(0, 10),
      likes: post.likes,
      comments: post.comments,
    }));

  const confidence = stats.averageConfidence;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          What the published posts actually achieved, taken from the posts table.
        </p>
      </div>

      <SummaryStrip
        items={[
          { label: "Published posts", value: postRows.length, hint: "All time" },
          { label: "Likes", value: totalLikes, hint: `${totalComments} comments` },
          {
            label: "Average confidence",
            value: confidence === null ? "n/a" : `${Math.round(confidence * 100)}%`,
            hint: "Reviewer score on posted drafts",
          },
          { label: "Posting streak", value: `${stats.streakDays}d`, hint: "Consecutive days" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <PerformanceChart data={chartData} />

        <Card>
          <CardHeader>
            <CardTitle>Posts per week</CardTitle>
            <p className="text-[12px] text-muted-foreground">
              Published posts in each of the last eight seven day windows.
            </p>
          </CardHeader>
          <CardContent>
            {postRows.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-muted-foreground">
                Nothing has been published yet, so there is no frequency to show.
              </p>
            ) : (
              <PostingFrequency weeks={weeks} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Published posts</CardTitle>
          <p className="text-[12px] text-muted-foreground">
            Every post that went out, with the engagement numbers stored for it.
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {postRows.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState
                title="No posts published yet"
                description="Approve a draft to publish it to LinkedIn. Once a post goes out it appears here with its likes, comments and impressions."
                action={
                  <Link
                    href="/drafts"
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
                  >
                    Open the drafts
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-y border-border bg-surface-muted/60">
                    <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Date
                    </th>
                    <th className="px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Post
                    </th>
                    <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Likes
                    </th>
                    <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Comments
                    </th>
                    <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Impressions
                    </th>
                    <th className="px-5 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {postRows.map((post) => {
                    const firstLine = post.finalText.split("\n").find((line) => line.trim().length > 0);
                    return (
                      <tr
                        key={post.id}
                        className="border-b border-border transition-colors last:border-b-0 hover:bg-surface-muted/50"
                      >
                        <td className="numeric whitespace-nowrap px-5 py-3 align-middle text-[12px] text-muted-foreground">
                          {formatDate(post.postedAt, settings.timezone)}
                        </td>
                        <td className="max-w-[320px] px-5 py-3 align-middle text-[13px] text-foreground">
                          <span className="line-clamp-2">{firstLine ?? "(no text)"}</span>
                        </td>
                        <td className="numeric px-5 py-3 text-right align-middle text-[13px] text-foreground">
                          {post.likes}
                        </td>
                        <td className="numeric px-5 py-3 text-right align-middle text-[13px] text-foreground">
                          {post.comments}
                        </td>
                        <td className="numeric px-5 py-3 text-right align-middle text-[13px] text-foreground">
                          {post.impressions ?? "n/a"}
                        </td>
                        <td className="px-5 py-3 text-right align-middle">
                          <div className="flex items-center justify-end gap-1">
                            {post.postUrl ? (
                              <a
                                href={post.postUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-accent transition-colors hover:bg-surface-muted hover:underline"
                              >
                                Live post
                                <ArrowSquareOutIcon size={12} />
                              </a>
                            ) : null}
                            <RefreshMetricsButton postId={post.id} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
