import * as React from "react";
import { cn } from "@/lib/utils";

/** Loading placeholder used on every data-driven surface. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
}

/** Skeleton shaped like a text line. */
export function SkeletonText({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <Skeleton className={cn("h-3.5 w-full", className)} {...props} />;
}
