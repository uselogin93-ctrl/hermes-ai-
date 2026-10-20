import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StatItem = {
  label: string;
  value: ReactNode;
  hint?: string;
};

/**
 * A single bordered strip of key numbers.
 *
 * Deliberately one connected band with dividers rather than a grid of
 * floating cards.
 */
export function SummaryStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface sm:grid-cols-4 sm:divide-y-0">
      {items.map((item) => (
        <div key={item.label} className="px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{item.label}</p>
          <p className="numeric mt-1 text-xl font-semibold tracking-tight text-foreground">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg border border-dashed border-border-strong bg-surface/60 px-5 py-8",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
