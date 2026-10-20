import type { ProviderAdapter, CompleteOptions, ProviderConfig } from "@/lib/agents/providers/types";
import { ProviderError } from "@/lib/agents/providers/types";

/** Self-hosted Ollama — the truly unlimited fallback rung. */
export function createOllamaProvider(id: "ollama-local", config: ProviderConfig): ProviderAdapter {
  const baseUrl = (config.baseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434").replace(
    /\/$/,
    "",
  );

  return {
    id,
    // Ollama is "configured" when it is explicitly enabled, otherwise the
    // router would spend a timeout on a server that is not running.
    isConfigured: () => process.env.OLLAMA_BASE_URL !== undefined || process.env.OLLAMA_MODEL !== undefined,
    async complete(prompt: string, options: CompleteOptions) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await fetch(`${baseUrl}/api/chat`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: prompt }],
            stream: false,
            ...(options.json ? { format: "json" } : {}),
            options: { temperature: options.temperature, num_predict: options.maxTokens },
          }),
        });
        if (!response.ok) {
          throw new ProviderError(`Ollama responded ${response.status}`, response.status >= 500);
        }
        const data = (await response.json()) as { message?: { content?: string } };
        const text = data.message?.content;
        if (!text) throw new ProviderError("Ollama returned an empty completion", true);
        return text;
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        const message = error instanceof Error ? error.message : "Ollama request failed";
        throw new ProviderError(message, true);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
