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
        const result = await model.generateContent(prompt);
        return result.response.text();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gemini request failed";
        const retryable = /quota|rate|429|503|overloaded|timeout/i.test(message);
        throw new ProviderError(message, retryable);
      }
    },
  };
}
