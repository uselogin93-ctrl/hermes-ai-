import type { ModelProviderId } from "@careerpulse/shared-types";
import type { ProviderAdapter, ProviderConfig } from "@/lib/agents/providers/types";
import { createGeminiProvider } from "@/lib/agents/providers/gemini";
import {
  createGroqProvider,
  createOpenAiCompatibleProvider,
} from "@/lib/agents/providers/openai-compatible";
import { createOllamaProvider } from "@/lib/agents/providers/ollama";
import { createDemoProvider } from "@/lib/agents/providers/demo";
import rawConfig from "@/lib/agents/providers.config.json";

type ProvidersConfigFile = {
  chain: ModelProviderId[];
  providers: Record<string, ProviderConfig>;
};

export const providersConfig = rawConfig as ProvidersConfigFile;

export function getProviderAdapters(): Map<ModelProviderId, ProviderAdapter> {
  const adapters = new Map<ModelProviderId, ProviderAdapter>();

  for (const [id, config] of Object.entries(providersConfig.providers)) {
    switch (config.type) {
      case "gemini":
        adapters.set(id as ModelProviderId, createGeminiProvider("gemini-free", config));
        break;
      case "openai-compatible":
        if (id === "groq-free") {
          adapters.set(id as ModelProviderId, createGroqProvider("groq-free", config));
        } else {
          adapters.set(
            id as ModelProviderId,
            createOpenAiCompatibleProvider(id as "openrouter-free" | "github-models-free", config),
          );
        }
        break;
      case "ollama":
        adapters.set(id as ModelProviderId, createOllamaProvider("ollama-local", config));
        break;
      case "demo":
        adapters.set(id as ModelProviderId, createDemoProvider("demo-local"));
        break;
    }
  }

  return adapters;
}
