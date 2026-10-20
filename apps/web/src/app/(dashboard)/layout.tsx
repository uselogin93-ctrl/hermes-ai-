import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { listConnections } from "@/lib/services/connections";
import { getSettings } from "@/lib/services/settings";
import { getDashboardStats } from "@/lib/services/stats";
import { AppShell } from "@/components/shell/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const db = await getDb();
  const [connections, settings, stats] = await Promise.all([
    listConnections(db),
    getSettings(db),
    getDashboardStats(db),
  ]);

  return (
    <AppShell
      connections={connections}
      streakDays={stats.streakDays}
      nextRunAt={stats.nextRunAt}
      timezone={settings.timezone}
      userName={session.name || settings.user_name}
      killSwitchActive={settings.kill_switch}
      pendingDrafts={stats.pendingDrafts}
    >
      {children}
    </AppShell>
  );
}
