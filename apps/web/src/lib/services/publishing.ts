import { and, eq, lte } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { connections, drafts, posts } from "@/lib/db/schema";
import { decryptSecret } from "@/lib/security/crypto";
import { publishLinkedInPost } from "@/lib/connectors/linkedin";
import { getDraftRow, setDraftStatus } from "@/lib/services/drafts";
import { writeAudit, AUDIT_EVENTS } from "@/lib/services/audit";
import { notifyMessage } from "@/lib/services/notifications";
import { getSettings } from "@/lib/services/settings";

export type PublishOutcome = {
  published: boolean;
  postId?: string;
  url?: string | null;
  message: string;
  text: string;
};

/** Builds the exact text that will be published (body + hashtags). */
export function composePostText(body: string, hashtags: string[]): string {
  const trimmedBody = body.trim();
  const tags = hashtags
    .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
    .join(" ");
  return tags ? `${trimmedBody}\n\n${tags}` : trimmedBody;
}

/**
 * Publishes an approved draft to LinkedIn.
 *
 * When LinkedIn is not connected (the pre-approval phase described in the
 * roadmap) the draft is returned as ready-to-copy text instead of failing,
 * so the flow stays usable before the LinkedIn app review completes.
 */
export async function publishDraftToLinkedIn(db: Db, draftId: string): Promise<PublishOutcome> {
  const draft = await getDraftRow(db, draftId);
  if (!draft) {
    return { published: false, message: "Draft not found.", text: "" };
  }

  const text = composePostText(draft.editedText ?? draft.draftText, draft.hashtags);

  const [linkedin] = await db
    .select()
    .from(connections)
    .where(eq(connections.provider, "linkedin"));

  if (!linkedin || linkedin.status !== "active") {
    await writeAudit(db, AUDIT_EVENTS.postPublished, {
      draft_id: draftId,
      published: false,
      reason: "linkedin_not_connected",
    });
    return {
      published: false,
      message:
        "LinkedIn is not connected yet, so nothing was published. Copy the text below and post it manually, or connect LinkedIn in Connections.",
      text,
    };
  }

  try {
    const result = await publishLinkedInPost(
      {
        connectionId: linkedin.id,
        provider: "linkedin",
        label: linkedin.providerAccountLabel,
        accessToken: decryptSecret(linkedin.accessToken),
        refreshToken: linkedin.refreshToken ? decryptSecret(linkedin.refreshToken) : null,
        scopes: linkedin.scopes,
        providerUserId: linkedin.providerUserId,
      },
      text,
    );

    await db.insert(posts).values({
      draftId: draftId,
      linkedinPostId: result.id || `local-${Date.now()}`,
      finalText: text,
      postUrl: result.url,
      postedAt: new Date(),
    });

    await setDraftStatus(db, draftId, "posted");

    await writeAudit(db, AUDIT_EVENTS.postPublished, {
      draft_id: draftId,
      linkedin_post_id: result.id,
      url: result.url,
    });

    return {
      published: true,
      postId: result.id,
      url: result.url,
      message: "Published to LinkedIn.",
      text,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn publish failed";
    await writeAudit(db, AUDIT_EVENTS.providerFailed, {
      provider: "linkedin",
      draft_id: draftId,
      error: message,
    });
    return { published: false, message: `LinkedIn publish failed: ${message}`, text };
  }
}

/** Marks a draft as scheduled for a future publish time. */
export async function scheduleDraft(db: Db, draftId: string, scheduledFor: Date): Promise<boolean> {
  const [row] = await db
    .update(drafts)
    .set({ status: "scheduled", scheduledFor, decidedAt: new Date() })
    .where(eq(drafts.id, draftId))
    .returning();
  return Boolean(row);
}

export type ScheduledSweepOutcome = {
  checked: number;
  published: string[];
  failed: Array<{ draftId: string; message: string }>;
};

/**
 * Publishes every draft whose `scheduledFor` time has arrived.
 *
 * Must be called periodically (the cron entry point calls this right
 * alongside `runDailyCycle`) — `scheduleDraft` only records the intent to
 * publish later; this is what actually carries it out.
 */
export async function publishDueScheduledDrafts(db: Db): Promise<ScheduledSweepOutcome> {
  const now = new Date();
  const due = await db
    .select()
    .from(drafts)
    .where(and(eq(drafts.status, "scheduled"), lte(drafts.scheduledFor, now)));

  const outcome: ScheduledSweepOutcome = { checked: due.length, published: [], failed: [] };

  for (const draft of due) {
    try {
      const result = await publishDraftToLinkedIn(db, draft.id);
      if (result.published) {
        outcome.published.push(draft.id);
        await notifyPublished(db, draft.id, result.url ?? null);
      } else {
        // LinkedIn not connected / publish declined: don't retry forever as
        // "scheduled" — surface it as failed so it isn't silently stuck.
        await setDraftStatus(db, draft.id, "approved");
        outcome.failed.push({ draftId: draft.id, message: result.message });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Scheduled publish failed";
      outcome.failed.push({ draftId: draft.id, message });
      await writeAudit(db, AUDIT_EVENTS.providerFailed, {
        provider: "linkedin",
        draft_id: draft.id,
        error: message,
      });
    }
  }

  return outcome;
}

/** Notifies the user that a draft was approved and published. */
export async function notifyPublished(db: Db, draftId: string, url: string | null): Promise<void> {
  const settings = await getSettings(db);
  const draft = await getDraftRow(db, draftId);
  if (!draft) return;
  await notifyMessage(db, {
    channel: settings.notification_channel,
    chatId: settings.telegram_chat_id,
    kind: "post_published",
    subject: "CareerPulse AI: your post is live",
    message: `Your post went live${url ? `: ${url}` : "."}`,
  });
}
