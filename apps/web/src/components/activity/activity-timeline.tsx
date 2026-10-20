"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  EyeIcon,
  EyeSlashIcon,
  GithubLogoIcon,
  GoogleDriveLogoIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { localDate, relativeTime } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/dashboard/summary-strip";
import { ActivityTimelineSkeleton } from "@/components/activity/activity-skeleton";

type SourceFilter = "all" | "github" | "google_drive";
type UsageFilter = "all" | "used" | "unused";

/** The row shape returned by `GET /api/activity` (a raw `activity_log` row). */
type ActivityRow = {
  id: string;
  source: "github" | "google_drive";
  sourceConnectionId: string | null;
  externalId: string;
  eventType: string;
  title: string;
  detail: Record<string, unknown>;
  url: string;
  occurredAt: string;
  ingestedAt: string;
  excluded: boolean;
  usedInDraftId: string | null;
};

type ApiFailure = { error?: { message?: string } };

type ScanResult = {
  newEventsCount?: number;
  scannedConnections?: number;
  skippedConnections?: { label: string; reason: string }[];
};

/** Reads the message out of either a success payload or the error envelope. */
function readMessage(payload: unknown): string | undefined {
  if (typeof payload !== "object" || payload === null) return undefined;
  const failure = (payload as Record<string, unknown>).error;
  if (typeof failure === "object" && failure !== null) {
    const message = (failure as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}

const SOURCE_LABEL: Record<ActivityRow["source"], string> = {
  github: "GitHub",
  google_drive: "Drive",
};

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "github", label: "GitHub" },
  { value: "google_drive", label: "Drive" },
];

const USAGE_OPTIONS: { value: UsageFilter; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "used", label: "Used in a post" },
  { value: "unused", label: "Not used yet" },
];

async function fetchActivity(): Promise<ActivityRow[]> {
  const response = await fetch("/api/activity?limit=200");
  const payload = (await response.json()) as ActivityRow[] | ApiFailure;

  if (!response.ok) {
    const message = Array.isArray(payload) ? undefined : payload.error?.message;
    throw new Error(message ?? "The activity list could not be loaded.");
  }

  return Array.isArray(payload) ? payload : [];
}

/** Human label for a local calendar day, relative to today. */
function formatDay(key: string, timezone: string, now: Date): string {
  const today = localDate(now, timezone);
  const yesterday = localDate(new Date(now.getTime() - 24 * 60 * 60 * 1000), timezone);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${key}T12:00:00Z`));
}

/**
 * The activity timeline.
 *
 * Filtering happens in the browser so the screen stays instant, and every
 * filter is mirrored into the query string so a link to this screen carries
 * the same view.
 */
export function ActivityTimeline({ timezone }: { timezone: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const source = (searchParams.get("source") ?? "all") as SourceFilter;
  const usage = (searchParams.get("used") ?? "all") as UsageFilter;
  const search = searchParams.get("q") ?? "";

  const [searchText, setSearchText] = React.useState(search);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [scanning, setScanning] = React.useState(false);

  const updateParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // Keep the search box in step with the address bar (browser back, shared links).
  React.useEffect(() => {
    setSearchText(search);
  }, [search]);

  // Debounced so typing does not push a history entry per keystroke.
  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = searchText.trim();
      if (next !== search) updateParams({ q: next || null });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, searchText, updateParams]);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["activity"],
    queryFn: fetchActivity,
  });

  const events = React.useMemo(() => data ?? [], [data]);

  const filtered = React.useMemo(() => {
    const needle = search.trim().toLowerCase();
    return events.filter((event) => {
      if (source !== "all" && event.source !== source) return false;
      if (usage === "used" && !event.usedInDraftId) return false;
      if (usage === "unused" && event.usedInDraftId) return false;
      if (needle && !event.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [events, search, source, usage]);

  const groups = React.useMemo(() => {
    const buckets = new Map<string, ActivityRow[]>();
    for (const event of filtered) {
      const key = localDate(new Date(event.occurredAt), timezone);
      const bucket = buckets.get(key);
      if (bucket) bucket.push(event);
      else buckets.set(key, [event]);
    }
    return Array.from(buckets.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered, timezone]);

  const toggleExcluded = async (event: ActivityRow) => {
    setBusyId(event.id);
    try {
      const response = await fetch(`/api/activity/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excluded: !event.excluded }),
      });
      const payload = (await response.json()) as ApiFailure;
      if (!response.ok) {
        toast.error(payload.error?.message ?? "The item could not be updated.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success(event.excluded ? "The item is back in the timeline." : "The item is excluded.");
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const response = await fetch("/api/activity/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        toast.error(readMessage(payload) ?? "The scan could not run.");
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      const count = (payload as ScanResult).newEventsCount ?? 0;
      toast.success(
        count === 0 ? "The scan finished, nothing new was found." : `${count} new item(s) captured.`,
      );
    } catch {
      toast.error("Could not reach the server.");
    } finally {
      setScanning(false);
    }
  };

  const filtersActive = source !== "all" || usage !== "all" || search.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <MagnifyingGlassIcon
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search titles"
            aria-label="Search activity titles"
            className="pl-8"
          />
        </div>

        <Tabs
          value={source}
          onValueChange={(value) => updateParams({ source: value === "all" ? null : value })}
        >
          <TabsList>
            {SOURCE_OPTIONS.map((option) => (
              <TabsTrigger key={option.value} value={option.value}>
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={usage} onValueChange={(value) => updateParams({ used: value === "all" ? null : value })}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by usage">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {USAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="secondary" onClick={runScan} disabled={scanning}>
          <ArrowClockwiseIcon size={13} />
          {scanning ? "Scanning…" : "Scan now"}
        </Button>
      </div>

      {isPending ? (
        <ActivityTimelineSkeleton />
      ) : isError ? (
        <EmptyState
          title="The activity list could not be loaded"
          description={error instanceof Error ? error.message : "The server did not answer."}
          action={
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              Try again
            </Button>
          }
        />
      ) : events.length === 0 ? (
        <EmptyState
          title="No activity captured yet"
          description="Connect GitHub or Google Drive, then run a scan. Commits, pull requests and documents show up here as soon as they are picked up."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No activity matches these filters"
          description="Widen the source or usage filter, or clear the search box to see the full timeline."
          action={
            filtersActive ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchText("");
                  updateParams({ source: null, used: null, q: null });
                }}
              >
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([day, rows]) => (
            <section key={day}>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {formatDay(day, timezone, new Date())}
                </h2>
                <span className="numeric text-[11px] text-muted-foreground">
                  {rows.length} {rows.length === 1 ? "item" : "items"}
                </span>
              </div>

              <ul className="overflow-hidden rounded-lg border border-border bg-surface">
                {rows.map((event) => {
                  const Icon = event.source === "github" ? GithubLogoIcon : GoogleDriveLogoIcon;
                  return (
                    <li
                      key={event.id}
                      className="flex flex-wrap items-start gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-muted/50"
                    >
                      <Icon size={15} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />

                      <div className="min-w-0 flex-1">
                        <a
                          href={event.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-start gap-1.5 text-[13px] text-foreground transition-colors hover:text-accent hover:underline"
                        >
                          <span className="break-words">{event.title}</span>
                          <ArrowSquareOutIcon size={12} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                        </a>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                          <span>{SOURCE_LABEL[event.source]}</span>
                          <span aria-hidden>·</span>
                          <span>{relativeTime(event.occurredAt)}</span>
                          {event.usedInDraftId ? (
                            <Badge tone="info">Used in a post</Badge>
                          ) : null}
                          {event.excluded ? <Badge tone="warning">Excluded</Badge> : null}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0"
                        onClick={() => void toggleExcluded(event)}
                        disabled={busyId === event.id}
                      >
                        {event.excluded ? <EyeIcon size={13} /> : <EyeSlashIcon size={13} />}
                        {event.excluded ? "Include" : "Exclude"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
