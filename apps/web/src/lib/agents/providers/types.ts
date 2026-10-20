import type { ModelProviderId } from "@careerpulse/shared-types";

export type ProviderType = "gemini" | "openai-compatible" | "ollama" | "demo";

export type ProviderConfig = {
  type: ProviderType;
  model: string;
  envKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
};

export type CompleteOptions = {
  json: boolean;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
  /** Structured payload that accompanies the prompt (used by the offline provider). */
  context?: Record<string, unknown>;
};

export type ProviderAdapter = {
  id: ModelProviderId;
  /** Whether the provider has everything it needs to run right now. */
  isConfigured: () => boolean;
  /** Returns the raw completion text. */
  complete: (prompt: string, options: CompleteOptions) => Promise<string>;
};

export class ProviderError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = true) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}
