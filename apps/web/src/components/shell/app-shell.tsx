"use client";

import * as React from "react";
import Link from "next/link";
import { ListIcon, PulseIcon } from "@phosphor-icons/react/ssr";
import { AppHeader, type HeaderConnection } from "@/components/shell/app-header";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { BackToTop } from "@/components/shell/back-to-top";
import { PrivacyNotice } from "@/components/shell/privacy-notice";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type AppShellProps = {
  children: React.ReactNode;
  connections: HeaderConnection[];
  streakDays: number;
  nextRunAt: string;
  timezone: string;
  userName: string;
  killSwitchActive: boolean;
  pendingDrafts: number;
};

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-4">
      <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
        <PulseIcon size={15} weight="bold" />
      </span>
      <div className="leading-tight">
        <p className="text-[13px] font-semibold text-foreground">CareerPulse AI</p>
        <p className="text-[11px] text-muted-foreground">Career automation</p>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  connections,
  streakDays,
  nextRunAt,
  timezone,
  userName,
  killSwitchActive,
  pendingDrafts,
}: AppShellProps) {
  const [navigationOpen, setNavigationOpen] = React.useState(false);

  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-border focus:bg-surface focus:px-3 focus:py-2 focus:text-[13px] focus:outline-none"
      >
        Skip to content
      </a>

      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-r border-border bg-surface lg:block">
          <div className="flex h-full flex-col">
            <Brand />
            <SidebarNav />
            <div className="mt-auto space-y-3 border-t border-border p-4">
              {killSwitchActive ? (
                <Badge tone="danger" className="w-full justify-center">
                  Automation paused
                </Badge>
              ) : null}
              {pendingDrafts > 0 ? (
                <Link
                  href="/drafts"
                  className="block text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {pendingDrafts} draft{pendingDrafts === 1 ? "" : "s"} waiting for review
                </Link>
              ) : (
                <p className="text-[12px] text-muted-foreground">Nothing waiting for review.</p>
              )}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            connections={connections}
            streakDays={streakDays}
            nextRunAt={nextRunAt}
            timezone={timezone}
            userName={userName}
            onOpenNavigation={() => setNavigationOpen(true)}
          />

          <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>

          <footer className="border-t border-border px-4 py-4 text-[11px] text-muted-foreground sm:px-6">
            <p>
              CareerPulse AI v{process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0"} · Nothing is posted
              without your approval.
            </p>
            <PrivacyNotice />
          </footer>
        </div>
      </div>

      <Dialog open={navigationOpen} onOpenChange={setNavigationOpen}>
        <DialogContent className="left-0 top-0 h-dvh w-72 max-w-none translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0">
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <div className="flex h-full flex-col" onClick={() => setNavigationOpen(false)}>
            <Brand />
            <SidebarNav />
          </div>
        </DialogContent>
      </Dialog>

      <BackToTop />
    </div>
  );
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation"
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
    >
      <ListIcon size={16} />
    </button>
  );
}
