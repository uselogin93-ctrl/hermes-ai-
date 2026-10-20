import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { Draft } from "@careerpulse/shared-types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DraftActions } from "@/components/drafts/draft-actions";
import { EmptyState } from "@/components/dashboard/summary-strip";

/** The centrepiece card: today's draft with a one-click decision. */
export function TodayDraft({ draft }: { draft: Draft | null }) {
  if (!draft) {
    return (
      <EmptyState
        title="No draft is waiting for today"
        description="Connect GitHub or Google Drive, then run the cycle. Once there is activity worth mentioning, the draft shows up here for review."
        action={
          <Link
            href="/connections"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
          >
            Connect a source
            <ArrowRightIcon size={13} />
          </Link>
        }
      />
    );
  }

  const confidence = draft.reviewer_flags?.confidence;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Today&apos;s draft
            <Badge tone="outline">AI-generated</Badge>
          </CardTitle>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Generated {new Date(draft.created_at).toLocaleString()} · version {draft.version}
            {draft.model_provider ? ` · ${draft.model_provider}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {typeof confidence === "number" ? (
            <Badge tone={confidence >= 0.8 ? "success" : confidence >= 0.6 ? "warning" : "danger"}>
              Confidence {Math.round(confidence * 100)}%
            </Badge>
          ) : null}
          <Badge tone={draft.status === "pending" ? "accent" : "neutral"}>{draft.status}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
          {draft.draft_text}
        </p>

        {draft.hashtags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {draft.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {draft.reviewer_flags && draft.reviewer_flags.issues.length > 0 ? (
          <div className="mt-4 rounded-md border border-warning/30 bg-warning-subtle px-3 py-2">
            <p className="text-[12px] font-medium text-warning">Reviewer notes</p>
            <ul className="mt-1 space-y-0.5 text-[12px] leading-relaxed text-muted-foreground">
              {draft.reviewer_flags.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <DraftActions draftId={draft.id} status={draft.status} />
          <Link
            href={`/drafts/${draft.id}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
          >
            Open the full review
            <ArrowRightIcon size={13} />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
