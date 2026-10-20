import { ArrowSquareOutIcon, GithubLogoIcon, GoogleDriveLogoIcon } from "@phosphor-icons/react/ssr";
import type { ActivityEvent } from "@careerpulse/shared-types";
import { relativeTime } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** The evidence trail: which commits and documents the post was built from. */
export function SourceEvidence({ events }: { events: ActivityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Source evidence</CardTitle>
        <p className="text-[12px] text-muted-foreground">
          The activity this draft was written from. Every claim should trace back to one of these.
        </p>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No activity is linked to this draft. It may have been generated before the source links
            were recorded.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => {
              const Icon = event.source === "github" ? GithubLogoIcon : GoogleDriveLogoIcon;
              return (
                <li key={event.id} className="flex gap-2.5">
                  <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-start gap-1 text-[13px] text-foreground underline-offset-2 hover:underline"
                    >
                      <span className="break-words">{event.title}</span>
                      <ArrowSquareOutIcon size={12} className="mt-0.5 shrink-0 text-muted-foreground" />
                    </a>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {event.source === "github" ? "GitHub" : "Google Drive"} ·{" "}
                      {relativeTime(event.occurred_at)} · {event.event_type.replace("_", " ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
