import type { TextProvider, VisionProvider } from './types';
import { makeGroqTextProvider } from './groq';
import { makeOpenRouterVisionProvider } from './openrouter';
import { makeGeminiTextProvider, makeGeminiVisionProvider } from './gemini';
import { makeMoonShotTextProvider } from './moonshot';

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
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  moonShotApiKey?: string;
  moonShotModel?: string;
}

/**
 * Text provider priority:
 *   1. Gemini 2.5 Flash  — primary (multimodal, fast, generous free tier)
 *   2. Groq              — fallback (llama-3.3-70b-versatile, very fast inference)
 *   3. MoonShot (Kimi)   — fallback (moonshot-v1-8k)
 */
export function buildTextProviders(cfg: ProviderConfig): TextProvider[] {
  const providers: TextProvider[] = [];
  if (cfg.geminiApiKey) {
    providers.push(makeGeminiTextProvider(cfg.geminiApiKey, cfg.geminiModel));
  }
  if (cfg.groqApiKey) {
    providers.push(makeGroqTextProvider(cfg.groqApiKey, cfg.groqModel));
  }
  if (cfg.moonShotApiKey) {
    providers.push(makeMoonShotTextProvider(cfg.moonShotApiKey, cfg.moonShotModel));
  }
  return providers;
}

/**
 * Vision provider priority:
 *   1. Gemini 2.5 Flash      — primary (native multimodal, JSON mode)
 *   2. OpenRouter / Pixtral  — fallback (mistralai/pixtral-large-2411, purpose-built document OCR)
 */
export function buildVisionProviders(cfg: ProviderConfig): VisionProvider[] {
  const providers: VisionProvider[] = [];
  if (cfg.geminiApiKey) {
    providers.push(makeGeminiVisionProvider(cfg.geminiApiKey, cfg.geminiModel));
  }
  if (cfg.openRouterApiKey) {
    providers.push(makeOpenRouterVisionProvider(cfg.openRouterApiKey, cfg.openRouterModel));
  }
  return providers;
}
