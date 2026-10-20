"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { Draft } from "@careerpulse/shared-types";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/dashboard/summary-strip";
import { SHORTCUT_EVENTS } from "@/components/shell/shortcuts";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "pending", label: "Pending" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Published" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

type FilterValue = (typeof FILTERS)[number]["value"];

function matches(draft: Draft, filter: FilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return draft.status === "pending" || draft.status === "edited";
  return draft.status === filter;
}

/** The review inbox: every draft, newest first, filterable by state. */
export function DraftList({ drafts }: { drafts: Draft[] }) {
  const [filter, setFilter] = React.useState<FilterValue>("pending");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const visible = React.useMemo(() => drafts.filter((draft) => matches(draft, filter)), [drafts, filter]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [filter]);

  React.useEffect(() => {
    const onNavigate = (event: Event) => {
      const direction = (event as CustomEvent<string>).detail;
      setActiveIndex((index) => {
        const next = direction === "next" ? index + 1 : index - 1;
        return Math.min(Math.max(next, 0), Math.max(visible.length - 1, 0));
      });
    };
    window.addEventListener(SHORTCUT_EVENTS.navigate, onNavigate);
    return () => window.removeEventListener(SHORTCUT_EVENTS.navigate, onNavigate);
  }, [visible.length]);

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(value) => setFilter(value as FilterValue)}>
        <TabsList>
          {FILTERS.map((item) => (
            <TabsTrigger key={item.value} value={item.value}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState
          title={`No ${filter === "all" ? "" : filter} drafts yet`}
          description="Drafts appear here after the daily cycle finds activity worth mentioning. Use the run button on the dashboard to trigger it right now."
          action={
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
            >
              Go to the dashboard
              <ArrowRightIcon size={13} />
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {visible.map((draft, index) => (
            <li key={draft.id}>
              <Link
                href={`/drafts/${draft.id}`}
                className={cn(
                  "flex items-start gap-4 px-4 py-3 transition-colors hover:bg-surface-muted/60",
                  index === activeIndex && "bg-surface-muted/40",
                )}
                onFocus={() => setActiveIndex(index)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] text-muted-foreground">{draft.run_date}</span>
                    <Badge
                      tone={
                        draft.status === "pending"
                          ? "accent"
                          : draft.status === "posted"
                            ? "success"
                            : draft.status === "rejected"
                              ? "danger"
                              : "neutral"
                      }
                    >
                      {draft.status}
                    </Badge>
                    {typeof draft.reviewer_flags?.confidence === "number" ? (
                      <span className="numeric text-[11px] text-muted-foreground">
                        confidence {Math.round(draft.reviewer_flags.confidence * 100)}%
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-foreground">
                    {draft.edited_text ?? draft.draft_text}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    version {draft.version} · created {relativeTime(draft.created_at)}
                  </p>
                </div>
                <ArrowRightIcon size={14} className="mt-1 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
