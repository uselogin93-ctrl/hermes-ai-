import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProviderAdapter, CompleteOptions, ProviderConfig } from "@/lib/agents/providers/types";
import { ProviderError } from "@/lib/agents/providers/types";

/** Google Gemini — primary provider, generous free tier. */
export function createGeminiProvider(id: "gemini-free", config: ProviderConfig): ProviderAdapter {
  const apiKey = process.env[config.envKey ?? "GEMINI_API_KEY"] ?? "";

  return {
    id,
    isConfigured: () => apiKey.length > 0,
    async complete(prompt: string, options: CompleteOptions) {
      if (!apiKey) throw new ProviderError("GEMINI_API_KEY is not configured", false);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const client = new GoogleGenerativeAI(apiKey);
        const model = client.getGenerativeModel({
          model: config.model,
          generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxTokens,
            responseMimeType: options.json ? "application/json" : "text/plain",
          },
        });
        // Without the abort signal a hung/slow request would block forever
        // instead of honouring options.timeoutMs, which breaks the
        // fallback-on-timeout contract (docs/11-ai-model-fallback.md) since
        // callModel never gets the chance to move on to the next provider.
        const result = await model.generateContent(prompt, { signal: controller.signal });
        return result.response.text();
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new ProviderError("Gemini request timed out", true);
        }
        const message = error instanceof Error ? error.message : "Gemini request failed";
        const retryable = /quota|rate|429|503|overloaded|timeout/i.test(message);
        throw new ProviderError(message, retryable);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
