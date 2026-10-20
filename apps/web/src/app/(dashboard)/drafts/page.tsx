import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import { listDrafts } from "@/lib/services/drafts";
import { DraftList } from "@/components/drafts/draft-list";

export const metadata: Metadata = { title: "Drafts" };
export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const db = await getDb();
  const drafts = await listDrafts(db, { limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Drafts</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Every generated post, with its history. Press J and K to move through the list, or open a
          draft to review it.
        </p>
      </div>

      <DraftList drafts={drafts} />
    </div>
  );
}
