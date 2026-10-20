import { afterEach, describe, expect, it } from "vitest";
import { callModel } from "@/lib/agents/model-router";

const previousDemoMode = process.env.DEMO_MODE;

afterEach(() => {
  if (previousDemoMode === undefined) delete process.env.DEMO_MODE;
  else process.env.DEMO_MODE = previousDemoMode;
});

describe("model router", () => {
  it("uses the offline provider when demo mode is on", async () => {
    process.env.DEMO_MODE = "1";

    const response = await callModel({ prompt: "ping", json: true });
    expect(response.provider).toBe("demo-local");
    expect(response.model).toBe("deterministic-offline");
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("falls back to the offline provider when no hosted provider is configured", async () => {
    delete process.env.DEMO_MODE;

    const response = await callModel({ prompt: "ping", json: true });
    expect(response.provider).toBe("demo-local");
    expect(response.attempts.length).toBeGreaterThan(0);
  });

  it("skips providers that are not configured", async () => {
    delete process.env.DEMO_MODE;

    const response = await callModel({ prompt: "ping", json: true });
    const skipped = response.attempts.filter((attempt) => attempt.retryable === false);
    expect(skipped.every((attempt) => attempt.error.includes("not configured"))).toBe(true);
  });
});
