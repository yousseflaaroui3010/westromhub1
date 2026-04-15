import type { TextProvider, VisionProvider } from './types';
import { makeOllamaTextProvider, makeOllamaVisionProvider } from './ollama';
import { makeGroqTextProvider } from './groq';
import { makeOpenRouterVisionProvider } from './openrouter';

export type { TextProvider, VisionProvider };

/**
 * Try each provider in order, returning the first success.
 * Logs each failure to console.error for observability.
 */
export async function withFallback<T>(
  providers: Array<() => Promise<T>>,
  label: string,
): Promise<T> {
  const errors: string[] = [];
  for (const run of providers) {
    try {
      return await run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.error(`[${label}] provider failed: ${msg}`);
    }
  }
  throw new Error(`All providers failed for ${label}: ${errors.join(' | ')}`);
}

export interface ProviderConfig {
  ollamaBaseUrl: string;
  visionModel: string;
  textModel: string;
  groqApiKey?: string;
  openRouterApiKey?: string;
  groqModel?: string;
  openRouterModel?: string;
  // Set OLLAMA_ENABLED=true to include Ollama in the provider chain.
  // Defaults to false so Railway/cloud deployments go straight to Groq/OpenRouter.
  ollamaEnabled?: boolean;
}

export function buildTextProviders(cfg: ProviderConfig): TextProvider[] {
  const providers: TextProvider[] = [];
  if (cfg.groqApiKey) {
    providers.push(makeGroqTextProvider(cfg.groqApiKey, cfg.groqModel));
  }
  if (cfg.ollamaEnabled) {
    providers.push(makeOllamaTextProvider(cfg.ollamaBaseUrl, cfg.textModel));
  }
  return providers;
}

export function buildVisionProviders(cfg: ProviderConfig): VisionProvider[] {
  const providers: VisionProvider[] = [];
  if (cfg.openRouterApiKey) {
    providers.push(makeOpenRouterVisionProvider(cfg.openRouterApiKey, cfg.openRouterModel));
  }
  if (cfg.ollamaEnabled) {
    providers.push(makeOllamaVisionProvider(cfg.ollamaBaseUrl, cfg.visionModel));
  }
  return providers;
}
