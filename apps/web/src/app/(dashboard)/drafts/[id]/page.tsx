import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import { getDb } from "@/lib/db";
import { getDraft, getDraftSourceActivity, getDraftVersions } from "@/lib/services/drafts";
import { ReviewWorkspace } from "@/components/drafts/review-workspace";
import { FlagsPanel } from "@/components/drafts/flags-panel";
import { SourceEvidence } from "@/components/drafts/source-evidence";
import { VersionHistory } from "@/components/drafts/version-history";
import { countWords } from "@/lib/diff";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const db = await getDb();
  const draft = await getDraft(db, id);
  return { title: draft ? `Draft for ${draft.run_date}` : "Draft" };
}

export default async function DraftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();

  const draft = await getDraft(db, id);
  if (!draft) notFound();

  const [sources, versions] = await Promise.all([
    getDraftSourceActivity(db, id),
    getDraftVersions(db, id),
  ]);

  const wordCount = countWords(draft.edited_text ?? draft.draft_text);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/drafts"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon size={12} />
            All drafts
          </Link>
          <h1 className="mt-2 text-lg font-semibold tracking-tight">
            Review the draft for {draft.run_date}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {draft.model_provider ? `Generated with ${draft.model_provider}` : "Generated draft"}
            {draft.prompt_versions
              ? ` · prompts ${Object.entries(draft.prompt_versions)
                  .map(([key, version]) => `${key} v${version}`)
                  .join(", ")}`
              : ""}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <ReviewWorkspace draft={draft} />
        </div>

        <div className="space-y-6">
          <FlagsPanel flags={draft.reviewer_flags} wordCount={wordCount} />
          <SourceEvidence events={sources} />
          <VersionHistory versions={versions} />
        </div>
      </div>
    </div>
  );
}
