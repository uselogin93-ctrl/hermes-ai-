"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FloppyDiskIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { countWords } from "@/lib/diff";
import { CopyButton } from "@/components/drafts/copy-button";

const LINKEDIN_LIMIT = 3000;

/** Editable draft body with the counters that matter for LinkedIn. */
export function DraftEditor({
  draftId,
  initialText,
  hashtags,
  editable,
}: {
  draftId: string;
  initialText: string;
  hashtags: string[];
  editable: boolean;
}) {
  const router = useRouter();
  const [text, setText] = React.useState(initialText);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setText(initialText);
    setDirty(false);
  }, [initialText]);

  const words = countWords(text);
  const characters = text.length;
  const overLimit = characters > LINKEDIN_LIMIT;

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edited_text: text }),
      });
      const data = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        toast.error(data.error?.message ?? "The edit could not be saved.");
        return;
      }
      setDirty(false);
      toast.success("Edit saved.");
      router.refresh();
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        readOnly={!editable}
        onChange={(event) => {
          setText(event.target.value);
          setDirty(true);
        }}
        rows={14}
        aria-label="Draft text"
        className="font-sans leading-relaxed"
        placeholder="The draft text will appear here once the agents have run."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className={overLimit ? "text-danger" : undefined}>
            {characters} characters
            {overLimit ? ` (${characters - LINKEDIN_LIMIT} over the LinkedIn limit)` : ""}
          </span>
          <span className="numeric">{words} words</span>
        </div>

        {editable ? (
          <Button variant="secondary" size="sm" onClick={save} disabled={!dirty || saving}>
            <FloppyDiskIcon size={13} />
            {saving ? "Saving…" : dirty ? "Save edit" : "Saved"}
          </Button>
        ) : null}
      </div>

      {hashtags.length > 0 ? (
        <div>
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Hashtags</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            <CopyButton value={hashtags.join(" ")} label="Copy hashtags" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
