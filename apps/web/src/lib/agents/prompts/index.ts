import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type PromptId = "research_agent" | "writer_agent" | "reviewer_agent";

const FILES: Record<PromptId, string> = {
  research_agent: "research-agent.md",
  writer_agent: "writer-agent.md",
  reviewer_agent: "reviewer-agent.md",
};

export type LoadedPrompt = {
  id: PromptId;
  version: string;
  updated: string;
  text: string;
};

function resolvePromptDir(): string {
  const candidates = [
    path.join(process.cwd(), "src", "lib", "agents", "prompts"),
    path.join(process.cwd(), "apps", "web", "src", "lib", "agents", "prompts"),
    path.join(process.cwd(), "..", "..", "apps", "web", "src", "lib", "agents", "prompts"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? candidates[0]!;
}

const cache = new Map<PromptId, LoadedPrompt>();

/**
 * Loads a versioned prompt template from disk.
 *
 * Prompts live in markdown files (not inline strings) so they can be tuned
 * without touching application code, and every draft records the exact
 * prompt version that produced it.
 */
export function loadPrompt(id: PromptId): LoadedPrompt {
  const cached = cache.get(id);
  if (cached) return cached;

  const file = path.join(resolvePromptDir(), FILES[id]);
  const raw = readFileSync(file, "utf8");
  const header = raw.match(
    /<!--\s*prompt_id:\s*([a-z_]+)\s*,\s*version:\s*([\d.]+)\s*,\s*updated:\s*([\d-]+)\s*-->/,
  );

  const loaded: LoadedPrompt = {
    id,
    version: header?.[2] ?? "0.0.0",
    updated: header?.[3] ?? "unknown",
    text: raw.replace(/<!--[\s\S]*?-->\s*/, "").trim(),
  };

  cache.set(id, loaded);
  return loaded;
}

/** Renders a prompt template, replacing `{{placeholders}}`. */
export function renderPrompt(id: PromptId, vars: Record<string, string>): string {
  const template = loadPrompt(id).text;
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? "");
}
