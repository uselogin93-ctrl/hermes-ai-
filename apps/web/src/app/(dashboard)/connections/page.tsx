import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { env } from "@/lib/env";
import { listConnections } from "@/lib/services/connections";
import { getSettings } from "@/lib/services/settings";
import type { Provider } from "@careerpulse/shared-types";
import { ConnectionsPanel } from "@/components/connections/connections-panel";

export const metadata: Metadata = { title: "Connections" };
export const dynamic = "force-dynamic";

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const db = await getDb();
  const [connections, settings, params] = await Promise.all([
    listConnections(db),
    getSettings(db),
    searchParams,
  ]);

  const configured: Record<Provider, boolean> = {
    github: Boolean(env.githubClientId),
    google_drive: Boolean(env.googleClientId),
    linkedin: Boolean(env.linkedinClientId),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Connections</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The accounts the app reads from and publishes to. Tokens are encrypted at rest, and
          disconnecting revokes the access at the provider.
        </p>
      </div>

      <ConnectionsPanel
        connections={connections}
        configured={configured}
        timezone={settings.timezone}
        connectedProvider={params.connected ?? null}
        errorMessage={params.error ?? null}
      />
    </div>
  );
}
