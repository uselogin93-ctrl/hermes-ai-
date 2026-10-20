"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GoogleDriveLogoIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
  ListIcon,
  SignOutIcon,
} from "@phosphor-icons/react/ssr";
import type { Connection, Provider } from "@careerpulse/shared-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Shortcuts } from "@/components/shell/shortcuts";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/dates";

const PROVIDER_META: Record<
  Provider,
  { label: string; icon: React.ComponentType<{ size?: number; weight?: "fill" | "regular" }> }
> = {
  github: { label: "GitHub", icon: GithubLogoIcon },
  google_drive: { label: "Google Drive", icon: GoogleDriveLogoIcon },
  linkedin: { label: "LinkedIn", icon: LinkedinLogoIcon },
};

export type HeaderConnection = Pick<Connection, "provider" | "status" | "provider_account_label">;

export function AppHeader({
  connections,
  streakDays,
  nextRunAt,
  timezone,
  userName,
  onOpenNavigation,
}: {
  connections: HeaderConnection[];
  streakDays: number;
  nextRunAt: string;
  timezone: string;
  userName: string;
  onOpenNavigation?: () => void;
}) {
  const router = useRouter();

  const statusFor = (provider: Provider) =>
    connections.some((connection) => connection.provider === provider && connection.status === "active")
      ? "connected"
      : connections.some((connection) => connection.provider === provider)
        ? "attention"
        : "missing";

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        {onOpenNavigation ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={onOpenNavigation}
            aria-label="Open navigation"
          >
            <ListIcon size={16} />
          </Button>
        ) : null}

        <div className="flex items-center gap-2" aria-label="Connection health">
          {(Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
            const state = statusFor(provider);
            const meta = PROVIDER_META[provider];
            const Icon = meta.icon;
            return (
              <Tooltip key={provider}>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]",
                      state === "connected"
                        ? "border-border bg-surface text-muted-foreground"
                        : state === "attention"
                          ? "border-transparent bg-warning-subtle text-warning"
                          : "border-border bg-surface-muted text-muted-foreground/70",
                    )}
                  >
                    <Icon size={12} weight="fill" aria-hidden />
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        state === "connected"
                          ? "bg-success"
                          : state === "attention"
                            ? "bg-warning"
                            : "bg-border-strong",
                      )}
                      aria-hidden
                    />
                    <span className="hidden sm:inline">{meta.label}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {state === "connected"
                    ? `${meta.label} connected`
                    : state === "attention"
                      ? `${meta.label} needs re-authentication`
                      : `${meta.label} not connected`}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge tone="outline" className="hidden sm:inline-flex">
                Streak {streakDays} {streakDays === 1 ? "day" : "days"}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Consecutive days with a published post</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Badge tone="outline" className="hidden md:inline-flex">
                Next run {formatTime(nextRunAt, timezone)} ({timezone})
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Next scheduled daily cycle</TooltipContent>
          </Tooltip>

          <Shortcuts />
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-1">
                {userName.slice(0, 1).toUpperCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/settings")}>
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={signOut}>
                <SignOutIcon size={14} />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
