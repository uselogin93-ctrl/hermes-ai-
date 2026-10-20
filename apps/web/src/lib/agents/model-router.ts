import type { ModelProviderId, ModelRequest, ModelResponse } from "@careerpulse/shared-types";
import { getProviderAdapters, providersConfig } from "@/lib/agents/providers";
import { ProviderError } from "@/lib/agents/providers/types";

/**
 * Provider-agnostic model router.
 *
 * Every agent call goes through this function. Providers are tried in the
 * order defined in `providers.config.json`; a quota error, a rate limit or a
 * timeout moves the call to the next rung of the chain instead of failing the
 * daily cycle (docs/11-ai-model-fallback.md).
 */
export async function callModel(request: ModelRequest): Promise<ModelResponse> {
  const startedAt = Date.now();
  const adapters = getProviderAdapters();
  const attempts: ModelResponse["attempts"] = [];

  const chain = buildChain(request.preferredProvider);
  const options = {
    json: request.json ?? false,
    temperature: request.temperature ?? 0.6,
    maxTokens: request.maxTokens ?? 2048,
  };

  for (const providerId of chain) {
    const adapter = adapters.get(providerId);
    if (!adapter) continue;

    if (!adapter.isConfigured()) {
      attempts.push({
        provider: providerId,
        error: "Provider is not configured (missing credentials).",
        retryable: false,
      });
      continue;
    }

    try {
      const text = await adapter.complete(request.prompt, {
        ...options,
        timeoutMs: 45000,
        context: request.context,
      });

      return {
        text,
        provider: providerId,
        model: providersConfig.providers[providerId]?.model ?? "unknown",
        attempts,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      const providerError =
        error instanceof ProviderError
          ? error
          : new ProviderError(error instanceof Error ? error.message : "Unknown provider failure");

      attempts.push({
        provider: providerId,
        error: providerError.message,
        retryable: providerError.retryable,
      });
    }
  }

  const detail = attempts.map((attempt) => `${attempt.provider}: ${attempt.error}`).join(" | ");
  throw new ProviderError(`All model providers are unavailable. ${detail}`, false);
}

function isDemoMode(): boolean {
  const raw = process.env.DEMO_MODE;
  return raw === "1" || raw?.toLowerCase() === "true";
}

function buildChain(preferred?: ModelProviderId): ModelProviderId[] {
  const configured = providersConfig.chain.filter((id) => id !== "demo-local");

  // The offline provider is only used when explicitly requested, or when no
  // hosted provider is usable.
  const anyConfigured = configured.some((id) => {
    const adapter = getProviderAdapters().get(id);
    return adapter ? adapter.isConfigured() : false;
  });

  if (isDemoMode()) return ["demo-local"];
  if (!anyConfigured) return [...configured, "demo-local"];
  if (preferred) return [preferred, ...configured.filter((id) => id !== preferred)];
  return configured;
}
