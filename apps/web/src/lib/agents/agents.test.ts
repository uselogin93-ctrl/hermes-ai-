import { describe, expect, it } from "vitest";
import { researchSummarySchema } from "@careerpulse/shared-types";
import { extractJsonObject } from "@/lib/agents/json";
import { createDemoProvider } from "@/lib/agents/providers/demo";

const provider = createDemoProvider("demo-local");

const activityEvents = [
  {
    id: "1",
    source: "github" as const,
    source_connection_id: null,
    external_id: "commit:1",
    event_type: "commit" as const,
    title: "owner/app: Add the training pipeline",
    detail: { repo: "owner/app", filesChanged: 12 },
    url: "https://example.test/commit/1",
    occurred_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    excluded: false,
    used_in_draft_id: null,
  },
  {
    id: "2",
    source: "google_drive" as const,
    source_connection_id: null,
    external_id: "drive:1",
    event_type: "doc_edited" as const,
    title: "Edited Report",
    detail: { name: "Report" },
    url: "https://example.test/doc/1",
    occurred_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    excluded: false,
    used_in_draft_id: null,
  },
];

describe("offline research provider", () => {
  it("produces a schema valid research summary", async () => {
    const text = await provider.complete("prompt", {
      json: true,
      temperature: 0,
      maxTokens: 100,
      timeoutMs: 1000,
      context: { activityEvents, date: "2026-10-20" },
    });

    const parsed = researchSummarySchema.safeParse(JSON.parse(text));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.highlights.length).toBeGreaterThan(0);
      expect(parsed.data.highlights.some((h) => h.significance === "major")).toBe(true);
    }
  });
});

describe("offline writer provider", () => {
  it("produces draft text and hashtags", async () => {
    const text = await provider.complete("prompt", {
      json: true,
      temperature: 0,
      maxTokens: 100,
      timeoutMs: 1000,
      context: {
        researchSummary: {
          date: "2026-10-20",
          highlights: [
            {
              source: "repo:owner/app",
              type: "code_change",
              summary: "Added the training pipeline to owner/app",
              significance: "major",
            },
          ],
        },
        toneProfile: "professional",
        userName: "Aarav",
        userRole: "Engineer",
        recentTopics: [],
      },
    });

    const parsed = JSON.parse(text) as { draft_text: string; hashtags: string[] };
    expect(parsed.draft_text.length).toBeGreaterThan(0);
    expect(parsed.hashtags.length).toBeGreaterThan(0);
  });
});

describe("offline reviewer provider", () => {
  it("flags banned phrases and reports confidence", async () => {
    const text = await provider.complete("prompt", {
      json: true,
      temperature: 0,
      maxTokens: 100,
      timeoutMs: 1000,
      context: {
        draftText: "Excited to share the new pipeline with 42 models trained.",
        hashtags: ["#One"],
        researchSummary: { date: "2026-10-20", highlights: [] },
        bannedPhrases: ["Excited to share"],
        excludedSources: [],
      },
    });

    const parsed = JSON.parse(text) as { confidence: number; issues: string[] };
    expect(parsed.confidence).toBeLessThan(1);
    expect(parsed.issues.some((issue) => issue.includes("Excited to share"))).toBe(true);
  });
});

describe("extractJsonObject", () => {
  it("parses a fenced json block", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it("parses json wrapped in prose", () => {
    expect(extractJsonObject('Here you go: {"a":2} thanks')).toEqual({ a: 2 });
  });

  it("throws when there is no json", () => {
    expect(() => extractJsonObject("no json here")).toThrow(/JSON object/);
  });
});
