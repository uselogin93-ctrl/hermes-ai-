import { Badge } from "@/components/ui/badge";

import type { ReviewerFlags } from "@careerpulse/shared-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** The reviewer agent's verdict, shown prominently when something needs attention. */
export function FlagsPanel({
  flags,
  wordCount,
}: {
  flags: ReviewerFlags | null;
  wordCount: number;
}) {
  if (!flags) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compliance review</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[13px] text-muted-foreground">
            This draft has not been reviewed yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const confidence = flags.confidence;
  const tone = confidence >= 0.8 ? "success" : confidence >= 0.6 ? "warning" : "danger";
  const lengthNote =
    wordCount < 60
      ? "Shorter than the usual 100 to 200 words."
      : wordCount > 320
        ? "Longer than the usual 100 to 200 words."
        : "Length is inside the usual range.";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <CardTitle>Compliance review</CardTitle>
        <Badge tone={tone}>Confidence {Math.round(confidence * 100)}%</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[13px] text-muted-foreground">
          Every claim in the post was checked against the source activity, and the post was checked
          against your excluded sources and banned phrases.
        </p>

        <div className="rounded-md border border-border bg-surface-muted px-3 py-2">
          <p className="text-[12px] font-medium text-foreground">Length</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {wordCount} words. {lengthNote}
          </p>
        </div>

        {flags.issues.length > 0 ? (
          <div className="rounded-md border border-warning/30 bg-warning-subtle px-3 py-2">
            <p className="text-[12px] font-medium text-warning">
              {flags.issues.length} issue{flags.issues.length === 1 ? "" : "s"} to look at
            </p>
            <ul className="mt-1 space-y-1 text-[12px] leading-relaxed text-muted-foreground">
              {flags.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-md border border-success/30 bg-success-subtle px-3 py-2">
            <p className="text-[12px] font-medium text-success">No issues found</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              The post is grounded in the source activity and stays inside your rules.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
