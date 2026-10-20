/**
 * Extracts a JSON object from a model response.
 *
 * Models occasionally wrap JSON in prose or code fences even when asked for
 * strict JSON, so the parser is tolerant before the schema validation runs.
 */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Model response did not contain a JSON object.");
  }

  const candidate = withoutFence.slice(start, end + 1);
  return JSON.parse(candidate);
}
