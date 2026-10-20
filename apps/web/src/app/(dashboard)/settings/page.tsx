import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/services/settings";
import { listDrafts } from "@/lib/services/drafts";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const db = await getDb();
  const [settings, drafts] = await Promise.all([
    getSettings(db),
    listDrafts(db, { limit: 1 }),
  ]);

  const promptVersions = drafts[0]?.prompt_versions ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The schedule, the voice and the limits of what the system is allowed to do on its own.
        </p>
      </div>

      <SettingsForm settings={settings} promptVersions={promptVersions} />
    </div>
  );
}
