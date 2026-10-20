import { ArrowRightIcon, GithubLogoIcon, GoogleDriveLogoIcon } from "@phosphor-icons/react/ssr";
import type { ActivityEvent } from "@careerpulse/shared-types";
import { relativeTime } from "@/lib/dates";
import { EmptyState } from "@/components/dashboard/summary-strip";

const SOURCE_LABEL = {
  github: "GitHub",
  google_drive: "Drive",
} as const;

/** Condensed activity feed for the dashboard. */
export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity captured yet"
        description="Once a source is connected, the daily scan picks up commits, pull requests and documents and shows them here."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {events.map((event) => {
        const Icon = event.source === "github" ? GithubLogoIcon : GoogleDriveLogoIcon;
        return (
          <li key={event.id}>
            <a
              href={event.url}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-start gap-3 py-2.5 transition-colors hover:bg-surface-muted/50"
            >
              <Icon size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-foreground">{event.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {SOURCE_LABEL[event.source]} · {relativeTime(event.occurred_at)}
                  {event.excluded ? " · excluded" : ""}
                </p>
              </div>
              <ArrowRightIcon size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
