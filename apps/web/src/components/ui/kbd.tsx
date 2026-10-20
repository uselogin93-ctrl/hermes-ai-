"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Keyboard key hint used by the shortcuts panel. */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-surface-muted px-1.5 font-mono text-[11px] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

/** Section heading used inside panels. */
export function SectionTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", className)}
      {...props}
    >
      {children}
    </h2>
  );
}
