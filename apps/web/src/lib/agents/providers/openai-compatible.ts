import Groq from "groq-sdk";
import type { ProviderAdapter, CompleteOptions, ProviderConfig } from "@/lib/agents/providers/types";
import { ProviderError } from "@/lib/agents/providers/types";

/**
 * OpenAI-compatible chat completion transport.
 *
 * OpenRouter and GitHub Models expose the same request/response shape, so a
 * single adapter covers both (docs/13-technology-framework-detail.md).
 */
export function createOpenAiCompatibleProvider(
  id: "openrouter-free" | "github-models-free",
  config: ProviderConfig,
): ProviderAdapter {
  const apiKey = process.env[config.envKey ?? ""] ?? "";

  return {
    id,
    isConfigured: () => apiKey.length > 0,
    async complete(prompt: string, options: CompleteOptions) {
      if (!apiKey) throw new ProviderError(`${config.envKey ?? "API key"} is not configured`, false);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            ...(id === "openrouter-free"
              ? { "HTTP-Referer": "https://careerpulse.local", "X-Title": "CareerPulse AI" }
              : {}),
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: prompt }],
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            ...(options.json ? { response_format: { type: "json_object" } } : {}),
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          const retryable = response.status === 429 || response.status >= 500;
          throw new ProviderError(
            `${id} responded ${response.status}: ${body.slice(0, 200)}`,
            retryable,
          );
        }

        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = data.choices?.[0]?.message?.content;
        if (!text) throw new ProviderError(`${id} returned an empty completion`, true);
        return text;
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        const message = error instanceof Error ? error.message : `${id} request failed`;
        throw new ProviderError(message, true);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

/** Groq — fast free tier fallback, uses the official SDK. */
export function createGroqProvider(id: "groq-free", config: ProviderConfig): ProviderAdapter {
  const apiKey = process.env[config.envKey ?? "GROQ_API_KEY"] ?? "";

  return {
    id,
    isConfigured: () => apiKey.length > 0,
    async complete(prompt: string, options: CompleteOptions) {
      if (!apiKey) throw new ProviderError("GROQ_API_KEY is not configured", false);
      try {
        const client = new Groq({ apiKey });
        const completion = await client.chat.completions.create(
          {
            model: config.model,
            messages: [{ role: "user", content: prompt }],
            temperature: options.temperature,
            max_tokens: options.maxTokens,
            ...(options.json ? { response_format: { type: "json_object" } } : {}),
          },
          { timeout: options.timeoutMs, maxRetries: 0 },
        );
        const text = completion.choices[0]?.message?.content;
        if (!text) throw new ProviderError("Groq returned an empty completion", true);
        return text;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Groq request failed";
        const retryable = /rate|429|503|timeout|overloaded/i.test(message);
        throw new ProviderError(message, retryable);
      }
    },
  };
}
