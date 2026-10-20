"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwiseIcon, CheckIcon, ClockIcon, XIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyButton } from "@/components/drafts/copy-button";

type ApproveResponse = {
  published?: boolean;
  message?: string;
  text?: string;
  url?: string | null;
};

/**
 * The decision bar for a draft.
 *
 * Approving publishes to LinkedIn when the account is connected. When it is
 * not, the final text is surfaced so it can be copied and posted by hand.
 */
export function DraftActions({
  draftId,
  status,
  className,
  onDecision,
}: {
  draftId: string;
  status: string;
  className?: string;
  onDecision?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"approve" | "reject" | "regenerate" | null>(null);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [instructionOpen, setInstructionOpen] = React.useState(false);
  const [instruction, setInstruction] = React.useState("");
  const [manualText, setManualText] = React.useState<string | null>(null);

  const decide = React.useCallback(
    async (action: "approve" | "reject") => {
      setPending(action);
      try {
        const response = await fetch(`/api/drafts/${draftId}/${action}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "approve" ? JSON.stringify({ post_now: true }) : undefined,
        });
        const data = (await response.json()) as ApproveResponse & {
          error?: { message?: string };
        };

        if (!response.ok) {
          toast.error(data.error?.message ?? "The action failed.");
          return;
        }

        if (action === "approve") {
          if (data.published) {
            toast.success(data.message ?? "Published to LinkedIn.");
          } else {
            setManualText(data.text ?? null);
            toast.info(data.message ?? "Ready to publish by hand.");
          }
        } else {
          toast.success("Draft rejected.");
        }

        setRejectOpen(false);
        onDecision?.();
        router.refresh();
      } catch {
        toast.error("Could not reach the server.");
      } finally {
        setPending(null);
      }
    },
    [draftId, onDecision, router],
  );

  const regenerate = async () => {
    setPending("regenerate");
    try {
      const response = await fetch(`/api/drafts/${draftId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: instruction.trim() || undefined }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        toast.error(data.error?.message ?? "The draft could not be regenerated.");
        return;
      }
      toast.success("A new version was generated.");
      setInstructionOpen(false);
      setInstruction("");
      router.refresh();
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setPending(null);
    }
  };

  const settled = status === "posted" || status === "rejected";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          data-action="approve"
          disabled={settled || pending !== null}
          onClick={() => decide("approve")}
        >
          <CheckIcon size={14} weight="bold" />
          {pending === "approve" ? "Approving…" : "Approve and post"}
        </Button>

        <Button
          variant="secondary"
          disabled={settled || pending !== null}
          onClick={() => setInstructionOpen(true)}
        >
          <ArrowClockwiseIcon size={14} />
          Regenerate
        </Button>

        <Button
          variant="ghost"
          data-action="reject"
          disabled={settled || pending !== null}
          onClick={() => setRejectOpen(true)}
        >
          <XIcon size={14} />
          Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this draft?</DialogTitle>
            <DialogDescription>
              The draft stays in the history marked as rejected, and nothing is published. You can
              always regenerate a new version later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRejectOpen(false)}>
              Keep the draft
            </Button>
            <Button variant="danger" onClick={() => decide("reject")} disabled={pending !== null}>
              {pending === "reject" ? "Rejecting…" : "Reject draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={instructionOpen} onOpenChange={setInstructionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate this draft</DialogTitle>
            <DialogDescription>
              Optionally tell the writer what to change, for example &ldquo;make it shorter and
              focus on the accuracy result&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            rows={3}
            placeholder="Optional guidance for the writer"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
          />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setInstructionOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={regenerate} disabled={pending !== null}>
              {pending === "regenerate" ? "Regenerating…" : "Regenerate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manualText !== null} onOpenChange={(open) => !open && setManualText(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ready to post by hand</DialogTitle>
            <DialogDescription>
              LinkedIn is not connected yet, so nothing was published. Copy the text below and post
              it on LinkedIn, or connect LinkedIn from the Connections screen.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-surface-muted p-3 text-[13px] leading-relaxed">
            {manualText}
          </pre>
          <DialogFooter>
            <CopyButton value={manualText ?? ""} label="Copy post text" variant="secondary" size="md" />
            <Button variant="primary" onClick={() => setManualText(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ClockIcon };
