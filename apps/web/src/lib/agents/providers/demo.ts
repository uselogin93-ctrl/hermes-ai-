import type { ProviderAdapter, CompleteOptions } from "@/lib/agents/providers/types";
import type { ActivityEvent, ResearchSummary } from "@careerpulse/shared-types";

/**
 * Offline, deterministic provider.
 *
 * It never touches the network. It exists so the full pipeline (scan →
 * research → write → review → approve) can be exercised on a laptop with no
 * API keys, and so the app degrades gracefully when every hosted provider is
 * out of quota. The UI always labels drafts produced this way.
 */

type ResearchContext = {
  activityEvents: ActivityEvent[];
  date: string;
};

type WriterContext = {
  researchSummary: ResearchSummary;
  toneProfile: string;
  userName: string;
  userRole: string;
  recentTopics: string[];
};

type ReviewerContext = {
  draftText: string;
  hashtags: string[];
  researchSummary: ResearchSummary;
  bannedPhrases: string[];
  excludedSources: string[];
};

function groupActivities(events: ActivityEvent[]) {
  const groups = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    const detail = event.detail ?? {};
    const key =
      event.source === "github"
        ? `repo:${String(detail.repo ?? event.title)}`
        : `file:${String(detail.name ?? event.title)}`;
    const bucket = groups.get(key) ?? [];
    bucket.push(event);
    groups.set(key, bucket);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items }));
}

function classify(items: ActivityEvent[]): { significance: string; type: string; summary: string } {
  const first = items[0]!;
  const detail = first.detail ?? {};
  const repo = String(detail.repo ?? "");
  const fileName = String(detail.name ?? "");
  const commits = items.filter((item) => item.event_type === "commit");
  const filesChanged = commits.reduce(
    (total, item) => total + Number((item.detail as Record<string, unknown>)?.filesChanged ?? 0),
    0,
  );
  const mergedPr = items.some(
    (item) => item.event_type === "pr" && Boolean((item.detail as Record<string, unknown>)?.merged),
  );
  const newRepo = items.some((item) => item.event_type === "new_repo");

  if (newRepo) {
    return {
      significance: "major",
      type: "new_project",
      summary: `Started a new repository ${repo || "unnamed"}`,
    };
  }

  if (mergedPr) {
    const pr = items.find((item) => item.event_type === "pr");
    const prDetail = (pr?.detail ?? {}) as Record<string, unknown>;
    return {
      significance: "major",
      type: "pull_request",
      summary: `Merged a pull request in ${repo}: ${String(prDetail.title ?? "feature work")} (${
        Number(prDetail.additions ?? 0)
      } insertions, ${Number(prDetail.deletions ?? 0)} deletions across ${String(
        prDetail.changedFiles ?? 0,
      )} files)`,
    };
  }

  if (first.source === "google_drive") {
    const created = items.length > 0 && first.event_type === "doc_created";
    return {
      significance: created ? "learning" : "minor",
      type: first.event_type === "notebook_updated" ? "notebook_update" : "document_update",
      summary: `${created ? "Drafted" : "Updated"} ${fileName || "a document"}${
        items.length > 1 ? ` (${items.length} revisions)` : ""
      }`,
    };
  }

  const headline = commits[0]?.title?.split(": ").slice(1).join(": ") ?? first.title;
  if (filesChanged >= 8) {
    return {
      significance: "major",
      type: "code_change",
      summary: `Substantial work in ${repo}: ${commits.length} commit(s) touching ${filesChanged} files, led by "${headline}"`,
    };
  }
  if (filesChanged >= 3 || commits.length >= 3) {
    return {
      significance: "learning",
      type: "code_change",
      summary: `Iteration in ${repo}: ${commits.length} commit(s), ${filesChanged} files touched, focused on "${headline}"`,
    };
  }
  return {
    significance: "minor",
    type: "code_change",
    summary: `Small maintenance in ${repo}: "${headline}"`,
  };
}

function buildResearch(context: ResearchContext) {
  const groups = groupActivities(context.activityEvents);
  const highlights = groups.map((group) => {
    const classified = classify(group.items);
    return {
      source: group.key,
      type: classified.type,
      summary: classified.summary,
      significance: classified.significance,
    };
  });
  return { date: context.date, highlights };
}

function buildDraft(context: WriterContext) {
  const highlights = context.researchSummary.highlights.filter(
    (highlight) => highlight.significance !== "none",
  );
  const primary = highlights[0];
  const secondary = highlights.slice(1, 3);

  if (!primary) {
    return {
      draft_text:
        "No notable activity to report today. Quiet days are part of the work, and tomorrow's write-up will cover what actually landed.",
      hashtags: ["#BuildInPublic", "#Engineering", "#DailyWork"],
      suggested_media: null,
    };
  }

  const isCode =
    primary.type === "code_change" ||
    primary.type === "pull_request" ||
    primary.type === "new_project";
  const isDocument = primary.type === "document_update" || primary.type === "notebook_update";

  const subject = primary.source.replace(/^repo:/, "").replace(/^file:/, "");
  const shortSubject = subject.split("/").pop() ?? subject;

  const hook = isCode
    ? primary.type === "pull_request"
      ? `A pull request on ${subject} just landed.`
      : primary.type === "new_project"
        ? `Started something new this week: ${shortSubject}.`
        : `Real progress on ${shortSubject} today.`
    : isDocument
      ? `Wrote my way through ${shortSubject} today.`
      : `Real progress today.`;

  const bodyLines: string[] = [primary.summary];

  for (const item of secondary) {
    bodyLines.push(item.summary);
  }

  if (secondary.length === 0) {
    bodyLines.push(
      isCode
        ? "The work was incremental, but each commit moved the project closer to something I could actually show."
        : "Writing it out is still the fastest way I find to understand what I actually know.",
    );
  }

  bodyLines.push(
    "I keep a running record of this work so the progress is easy to look back on, and so the next step is obvious.",
  );

  const closing =
    context.toneProfile === "storytelling"
      ? "Small steps, but the steps compound. The interesting part is what the next one unlocks, and I will keep writing it down as I go."
      : context.toneProfile === "casual_technical"
        ? "Nothing flashy, just steady progress on the parts that actually matter. The rest is iteration and a lot of small fixes."
        : "Consistent, incremental work, documented as it happens. It is unglamorous on any given day, and it compounds over a year.";

  const tags = new Set<string>();
  if (shortSubject && /^[a-z0-9-_]+$/i.test(shortSubject)) {
    tags.add(`#${shortSubject.replace(/[^a-z0-9-_]/gi, "")}`);
  }
  tags.add("#BuildInPublic");
  tags.add(
    context.userRole.toLowerCase().includes("data")
      ? "#MachineLearning"
      : context.userRole.toLowerCase().includes("design")
        ? "#Design"
        : "#SoftwareEngineering",
  );
  tags.add("#DailyProgress");

  const draftText = [hook, "", ...bodyLines, "", closing].join("\n");

  return {
    draft_text: draftText,
    hashtags: [...tags].slice(0, 5),
    suggested_media: isCode ? `Screenshot of the ${subject} diff` : null,
  };
}

function buildReview(context: ReviewerContext) {
  const issues: string[] = [];
  const words = context.draftText.trim().split(/\s+/).filter(Boolean).length;

  if (words < 60) issues.push("The draft is under 60 words, shorter than the usual 100 to 200 words.");
  if (words > 320) issues.push("The draft is over 320 words, longer than the usual 100 to 200 words.");
  if (context.hashtags.length < 3) issues.push("Fewer than three hashtags were produced.");
  if (context.hashtags.length > 5) issues.push("More than five hashtags were produced.");

  for (const phrase of context.bannedPhrases) {
    if (phrase && context.draftText.toLowerCase().includes(phrase.toLowerCase())) {
      issues.push(`Banned phrase detected: "${phrase}".`);
    }
  }

  const summaryText = JSON.stringify(context.researchSummary).toLowerCase();
  const numbers = context.draftText.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? [];
  const unsupported = numbers.filter((value) => !summaryText.includes(value.toLowerCase()));
  if (unsupported.length > 0) {
    issues.push(`Numbers not traceable to the research summary: ${unsupported.join(", ")}.`);
  }

  for (const source of context.excludedSources) {
    if (source && context.draftText.toLowerCase().includes(source.toLowerCase().split(":").pop() ?? "")) {
      issues.push(`Draft mentions excluded source: ${source}.`);
    }
  }

  const confidence = Math.max(0.3, Math.min(1, 1 - issues.length * 0.15));
  return { confidence: Number(confidence.toFixed(2)), issues };
}

export function createDemoProvider(id: "demo-local"): ProviderAdapter {
  return {
    id,
    isConfigured: () => true,
    async complete(_prompt: string, options: CompleteOptions) {
      // The router forwards the structured context so the offline provider can
      // build a grounded answer without an LLM.
      const context = options.context as
        | ResearchContext
        | WriterContext
        | ReviewerContext
        | undefined;

      if (context) {
        if ("activityEvents" in context) return JSON.stringify(buildResearch(context));
        if ("draftText" in context) return JSON.stringify(buildReview(context));
        if ("researchSummary" in context) return JSON.stringify(buildDraft(context));
      }

      return JSON.stringify({ confidence: 0.5, issues: ["Offline provider had no structured context."] });
    },
  };
}
