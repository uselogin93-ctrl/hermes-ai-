"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  ChartLineUpIcon,
  GearSixIcon,
  HouseIcon,
  LinkSimpleIcon,
  NotePencilIcon,
  PulseIcon,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: HouseIcon },
  { href: "/drafts", label: "Drafts", icon: NotePencilIcon },
  { href: "/activity", label: "Activity", icon: PulseIcon },
  { href: "/connections", label: "Connections", icon: LinkSimpleIcon },
  { href: "/analytics", label: "Analytics", icon: ChartLineUpIcon },
  { href: "/notifications", label: "Notifications", icon: ActivityIcon },
  { href: "/settings", label: "Settings", icon: GearSixIcon },
] as const;

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5 p-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
              active
                ? "bg-surface-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground",
            )}
          >
            <Icon size={15} weight={active ? "fill" : "regular"} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
