"use client";

import * as React from "react";
import { SHORTCUT_EVENTS } from "@/components/shell/shortcuts";
import type { Draft } from "@careerpulse/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DraftEditor } from "@/components/drafts/draft-editor";
import { DraftActions } from "@/components/drafts/draft-actions";
import { CopyButton } from "@/components/drafts/copy-button";

/**
 * The left half of the review screen.
 *
 * Owns the editable text and wires the keyboard shortcuts, so the decision
 * can be taken with a single keystroke from the notification.
 */
export function ReviewWorkspace({ draft }: { draft: Draft }) {
  const editable = draft.status === "pending" || draft.status === "edited";

  React.useEffect(() => {
    const onApprove = () => {
      const button = document.querySelector<HTMLButtonElement>('[data-action="approve"]');
      button?.click();
    };
    const onReject = () => {
      const button = document.querySelector<HTMLButtonElement>('[data-action="reject"]');
      button?.click();
    };

    window.addEventListener(SHORTCUT_EVENTS.approve, onApprove);
    window.addEventListener(SHORTCUT_EVENTS.reject, onReject);
    return () => {
      window.removeEventListener(SHORTCUT_EVENTS.approve, onApprove);
      window.removeEventListener(SHORTCUT_EVENTS.reject, onReject);
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Generated post</CardTitle>
          <p className="mt-1 text-[12px] text-muted-foreground">
            AI-generated from your activity. Edit it freely, nothing is published until you approve.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={draft.status === "posted" ? "success" : draft.status === "pending" ? "accent" : "neutral"}>
            {draft.status}
          </Badge>
          <CopyButton value={draft.edited_text ?? draft.draft_text} label="Copy post text" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <DraftEditor
          draftId={draft.id}
          initialText={draft.edited_text ?? draft.draft_text}
          hashtags={draft.hashtags}
          editable={editable}
        />

        <div className="border-t border-border pt-4">
          <DraftActions draftId={draft.id} status={draft.status} />
        </div>
      </CardContent>
    </Card>
  );
}
