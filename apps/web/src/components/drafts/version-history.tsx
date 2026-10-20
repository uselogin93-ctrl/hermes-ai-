import type { DraftVersionRow } from "@/lib/db/schema";
import { diffLines } from "@/lib/diff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/** Version history with a line diff between the two most recent versions. */
export function VersionHistory({ versions }: { versions: DraftVersionRow[] }) {
  if (versions.length === 0) return null;

  const [latest, previous] = versions;
  const diff = previous ? diffLines(previous.draftText, latest!.draftText) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version history</CardTitle>
        <p className="text-[12px] text-muted-foreground">
          {versions.length} version{versions.length === 1 ? "" : "s"} of this draft.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {versions.map((version) => (
            <li key={version.id} className="flex items-start justify-between gap-3 text-[12px]">
              <div>
                <p className="text-foreground">
                  Version {version.version}
                  {version.origin === "edit" ? " (manual edit)" : ""}
                </p>
                {version.note ? <p className="text-muted-foreground">{version.note}</p> : null}
              </div>
              <span className="shrink-0 text-muted-foreground">
                {version.createdAt.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>

        {diff && diff.some((line) => line.type !== "same") ? (
          <div>
            <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
              What changed in version {latest!.version}
            </p>
            <div className="mt-2 space-y-0.5 rounded-md border border-border bg-surface-muted p-2 font-mono text-[11px] leading-relaxed">
              {diff.map((line, index) => (
                <p
                  key={`${index}-${line.value}`}
                  className={
                    line.type === "added"
                      ? "text-success"
                      : line.type === "removed"
                        ? "text-danger line-through opacity-70"
                        : "text-muted-foreground"
                  }
                >
                  {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
                  {line.value || " "}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {versions.length === 1 ? (
          <Badge tone="outline">Only one version so far</Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}
