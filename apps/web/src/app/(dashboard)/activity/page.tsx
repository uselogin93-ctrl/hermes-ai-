import { Suspense } from "react";
import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { ActivityTimelineSkeleton } from "@/components/activity/activity-skeleton";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const db = await getDb();
  const settings = await getSettings(db);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Everything the scans picked up from GitHub and Google Drive, grouped by day. The filters
          live in the address bar, so a link to this screen carries the same view.
        </p>
      </div>

      <Suspense fallback={<ActivityTimelineSkeleton />}>
        <ActivityTimeline timezone={settings.timezone} />
      </Suspense>
    </div>
  );
}
