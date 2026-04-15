import type { TextProvider, VisionProvider } from './types';
import { makeOllamaTextProvider, makeOllamaVisionProvider } from './ollama';
import { makeGroqTextProvider } from './groq';
import { makeOpenRouterVisionProvider } from './openrouter';
import { makeGeminiTextProvider, makeGeminiVisionProvider } from './gemini';

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
  // Cloud providers (used on Railway — no GPU required)
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  // Local provider — set OLLAMA_ENABLED=true to include in the chain.
  // Enabled automatically by docker-compose for local development.
  ollamaEnabled?: boolean;
}

/**
 * Provider priority (text):
 *   1. Gemini 2.5 Flash  — primary (multimodal, fast, generous free tier)
 *   2. Groq              — text fallback (llama-3.3-70b-versatile)
 *   3. Ollama/Gemma 4    — local fallback (OLLAMA_ENABLED=true only)
 */
export function buildTextProviders(cfg: ProviderConfig): TextProvider[] {
  const providers: TextProvider[] = [];
  if (cfg.geminiApiKey) {
    providers.push(makeGeminiTextProvider(cfg.geminiApiKey, cfg.geminiModel));
  }
  if (cfg.groqApiKey) {
    providers.push(makeGroqTextProvider(cfg.groqApiKey, cfg.groqModel));
  }
  if (cfg.ollamaEnabled) {
    providers.push(makeOllamaTextProvider(cfg.ollamaBaseUrl, cfg.textModel));
  }
  return providers;
}

/**
 * Provider priority (vision):
 *   1. Gemini 2.5 Flash  — primary (native multimodal, JSON mode)
 *   2. OpenRouter        — vision fallback (configurable model)
 *   3. Ollama/Gemma 4    — local fallback (OLLAMA_ENABLED=true only)
 */
export function buildVisionProviders(cfg: ProviderConfig): VisionProvider[] {
  const providers: VisionProvider[] = [];
  if (cfg.geminiApiKey) {
    providers.push(makeGeminiVisionProvider(cfg.geminiApiKey, cfg.geminiModel));
  }
  if (cfg.openRouterApiKey) {
    providers.push(makeOpenRouterVisionProvider(cfg.openRouterApiKey, cfg.openRouterModel));
  }
  if (cfg.ollamaEnabled) {
    providers.push(makeOllamaVisionProvider(cfg.ollamaBaseUrl, cfg.visionModel));
  }
  return providers;
}
