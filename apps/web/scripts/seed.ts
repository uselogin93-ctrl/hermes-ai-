/**
 * Seeds a realistic sample workspace so the whole product can be exercised
 * without connecting a single external account.
 *
 *   pnpm --filter @careerpulse/web exec tsx scripts/seed.ts
 *
 * The generated drafts go through the real Research → Writer → Reviewer
 * pipeline, using the offline provider when no AI key is configured.
 */
import { and, gte, lt } from "drizzle-orm";
import { getDb, closeDb } from "@/lib/db";
import { activityLog, connections, drafts, posts, settings } from "@/lib/db/schema";
import { encryptSecret } from "@/lib/security/crypto";
import { generateDraft } from "@/lib/services/drafts";
import { updateSettings } from "@/lib/services/settings";
import { dayBounds, localDate } from "@/lib/dates";

const DEMO_GITHUB_TOKEN = "demo-github-token-not-a-real-credential";
const DEMO_DRIVE_TOKEN = "demo-drive-token-not-a-real-credential";

type SeedEvent = {
  source: "github" | "google_drive";
  externalId: string;
  eventType: string;
  title: string;
  url: string;
  detail: Record<string, unknown>;
  hoursAgo: number;
};

const EVENTS: SeedEvent[] = [
  {
    source: "github",
    externalId: "commit:demo-a1",
    eventType: "commit",
    title: "second-account/llm-lab: Add gradient boosting baseline to the churn model",
    url: "https://github.com/second-account/llm-lab/commit/demo-a1",
    detail: {
      repo: "second-account/llm-lab",
      branch: "main",
      sha: "demo-a1",
      filesChanged: 9,
      message: "Add gradient boosting baseline to the churn model",
    },
    hoursAgo: 5,
  },
  {
    source: "github",
    externalId: "commit:demo-a2",
    eventType: "commit",
    title: "second-account/llm-lab: Wire up cross-validation and save the report",
    url: "https://github.com/second-account/llm-lab/commit/demo-a2",
    detail: {
      repo: "second-account/llm-lab",
      branch: "main",
      sha: "demo-a2",
      filesChanged: 6,
      message: "Wire up cross-validation and save the report",
    },
    hoursAgo: 4,
  },
  {
    source: "github",
    externalId: "commit:demo-a3",
    eventType: "commit",
    title: "second-account/llm-lab: Fix the feature pipeline leak",
    url: "https://github.com/second-account/llm-lab/commit/demo-a3",
    detail: {
      repo: "second-account/llm-lab",
      branch: "main",
      sha: "demo-a3",
      filesChanged: 2,
      message: "Fix the feature pipeline leak",
    },
    hoursAgo: 3,
  },
  {
    source: "github",
    externalId: "pr:demo-p1",
    eventType: "pr",
    title: "Pull request #12 on second-account/llm-lab: Add the churn model report page",
    url: "https://github.com/second-account/llm-lab/pull/12",
    detail: {
      repo: "second-account/llm-lab",
      number: 12,
      action: "closed",
      merged: true,
      additions: 214,
      deletions: 18,
      changedFiles: 7,
    },
    hoursAgo: 2,
  },
  {
    source: "github",
    externalId: "repo:demo-r1",
    eventType: "new_repo",
    title: "Created repository second-account/pricing-notes",
    url: "https://github.com/second-account/pricing-notes",
    detail: { repo: "second-account/pricing-notes", defaultBranch: "main" },
    hoursAgo: 26,
  },
  {
    source: "google_drive",
    externalId: "drive:demo-d1",
    eventType: "doc_edited",
    title: "Edited Churn model report",
    url: "https://docs.google.com/document/d/demo-d1",
    detail: { name: "Churn model report", mimeType: "application/vnd.google-apps.document", isNotebook: false },
    hoursAgo: 6,
  },
  {
    source: "google_drive",
    externalId: "drive:demo-d2",
    eventType: "notebook_updated",
    title: "Edited churn-analysis.ipynb",
    url: "https://docs.google.com/document/d/demo-d2",
    detail: { name: "churn-analysis.ipynb", mimeType: "application/vnd.google-apps.document", isNotebook: true },
    hoursAgo: 7,
  },
  {
    source: "github",
    externalId: "commit:demo-b1",
    eventType: "commit",
    title: "second-account/pricing-notes: Draft the pricing research outline",
    url: "https://github.com/second-account/pricing-notes/commit/demo-b1",
    detail: {
      repo: "second-account/pricing-notes",
      branch: "main",
      sha: "demo-b1",
      filesChanged: 3,
      message: "Draft the pricing research outline",
    },
    hoursAgo: 27,
  },
];

async function main() {
  const db = await getDb();

  const [githubConnection] = await db
    .insert(connections)
    .values({
      provider: "github",
      providerAccountLabel: "github-second",
      providerUserId: "demo-github-user",
      accessToken: encryptSecret(DEMO_GITHUB_TOKEN),
      scopes: ["repo", "read:user"],
      status: "active",
      connectedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      lastCheckedAt: new Date(),
    })
    .onConflictDoNothing({ target: [connections.provider, connections.providerUserId] })
    .returning();

  const [driveConnection] = await db
    .insert(connections)
    .values({
      provider: "google_drive",
      providerAccountLabel: "drive-workspace",
      providerUserId: "demo-drive-user",
      accessToken: encryptSecret(DEMO_DRIVE_TOKEN),
      scopes: ["https://www.googleapis.com/auth/drive.file"],
      status: "active",
      connectedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      lastCheckedAt: new Date(),
    })
    .onConflictDoNothing({ target: [connections.provider, connections.providerUserId] })
    .returning();

  await updateSettings(db, {
    user_name: "Aarav",
    user_role: "Machine Learning Engineer",
    user_background:
      "Building churn models and small tools, mostly in Python and TypeScript. Currently focused on practical evaluation and reporting.",
    tone_profile: "professional",
    notification_channel: "none",
    excluded_repos: ["second-account/scratch"],
    banned_phrases: ["Excited to share", "Thrilled to announce"],
    retention_days: 180,
  });

  const today = localDate(new Date(), "UTC");
  const insertedIds: string[] = [];

  for (const event of EVENTS) {
    const occurredAt = new Date(Date.now() - event.hoursAgo * 60 * 60 * 1000);
    const [row] = await db
      .insert(activityLog)
      .values({
        source: event.source,
        sourceConnectionId:
          event.source === "github" ? (githubConnection?.id ?? null) : (driveConnection?.id ?? null),
        externalId: event.externalId,
        eventType: event.eventType,
        title: event.title,
        detail: event.detail,
        url: event.url,
        occurredAt,
        ingestedAt: occurredAt,
        excluded: false,
      })
      .onConflictDoNothing({
        target: [activityLog.source, activityLog.sourceConnectionId, activityLog.externalId],
      })
      .returning();

    if (row) insertedIds.push(row.id);
  }

  const { start, end } = dayBounds(today, "UTC");
  const todayRows = await db
    .select()
    .from(activityLog)
    .where(and(gte(activityLog.occurredAt, start), lt(activityLog.occurredAt, end)));

  const todaysEvents = todayRows
    .filter((row) => row.occurredAt >= start && row.occurredAt < end)
    .map((row) => ({
      id: row.id,
      source: row.source as "github" | "google_drive",
      source_connection_id: row.sourceConnectionId,
      external_id: row.externalId,
      event_type: row.eventType as never,
      title: row.title,
      detail: row.detail,
      url: row.url,
      occurred_at: row.occurredAt.toISOString(),
      ingested_at: row.ingestedAt.toISOString(),
      excluded: row.excluded,
      used_in_draft_id: row.usedInDraftId,
    }));

  if (todaysEvents.length > 0) {
    const result = await generateDraft(db, { runDate: today, events: todaysEvents });
    console.log(`Draft generated: ${result.draft?.id ?? "none"} (${result.skippedReason ?? "ok"})`);
  }

  // A previously published post so the analytics screen has real data.
  const [previousDraft] = await db
    .insert(drafts)
    .values({
      runDate: localDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), "UTC"),
      version: 1,
      status: "posted",
      researchSummary: {
        date: localDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), "UTC"),
        highlights: [
          {
            source: "repo:second-account/llm-lab",
            type: "code_change",
            summary: "Set up the evaluation harness for the churn model",
            significance: "major",
          },
        ],
      },
      draftText:
        "Built the evaluation harness for the churn model this week.\n\nEvery model now runs through the same cross-validation loop, so comparisons stop being guesswork.\n\n#MachineLearning #BuildInPublic",
      hashtags: ["#MachineLearning", "#BuildInPublic"],
      reviewerFlags: { confidence: 0.92, issues: [] },
      modelProvider: "demo-local",
      modelName: "deterministic-offline",
    })
    .returning();

  if (previousDraft) {
    await db
      .insert(posts)
      .values({
        draftId: previousDraft.id,
        linkedinPostId: `demo-post-${previousDraft.id.slice(0, 8)}`,
        finalText: previousDraft.draftText,
        postUrl: "https://www.linkedin.com/feed/update/demo-post/",
        postedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        likes: 34,
        comments: 6,
        impressions: 1420,
        metricsUpdatedAt: new Date(),
      });
  }

  const [currentSettings] = await db.select().from(settings).limit(1);
  console.log(`Seeded ${insertedIds.length} activity events.`);
  console.log(`Settings row: ${currentSettings?.id}`);

  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
