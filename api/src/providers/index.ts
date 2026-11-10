import type { TextProvider, VisionProvider } from './types';
import { redact } from '../http/errors';
import { makeGroqTextProvider } from './groq';
import { makeOpenRouterVisionProvider, makeOpenRouterPremiumVisionProvider } from './openrouter';
import { makeGeminiTextProvider, makeGeminiVisionProvider } from './gemini';
import { makeMoonShotTextProvider } from './moonshot';

export type { TextProvider, VisionProvider };

/** Thrown by a guard to stop the fallback chain immediately (e.g. budget spent). */
export class StopFallback extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'StopFallback';
  }
}

/**
 * Try each provider in order, returning the first success.
 *
 * Failure detail (which may include upstream response bodies) is logged with
 * redaction and NEVER put on the thrown error, because callers must not be able
 * to leak it to clients. The thrown error carries only the label.
 */
export async function withFallback<T>(
  providers: Array<() => Promise<T>>,
  label: string,
): Promise<T> {
  for (const run of providers) {
    try {
      return await run();
    } catch (err) {
      if (err instanceof StopFallback) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${label}] provider failed: ${redact(msg)}`);
    }
  }
  throw new Error(`All providers failed for ${label}`);
}

export interface ProviderConfig {
  geminiApiKey?: string;
  geminiModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  openRouterPremiumModel?: string;
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
 *   1. Gemini 2.5 Flash (direct API)           — primary (native multimodal, JSON mode)
 *   2. OpenRouter / Gemini 2.5 Flash (premium)  — fallback (same model via OpenRouter, $0.15/M)
 *   3. OpenRouter / Gemma 4 31B (free)          — last resort (free but smaller model)
 */
export function buildVisionProviders(cfg: ProviderConfig): VisionProvider[] {
  const providers: VisionProvider[] = [];
  if (cfg.geminiApiKey) {
    providers.push(makeGeminiVisionProvider(cfg.geminiApiKey, cfg.geminiModel));
  }
  if (cfg.openRouterApiKey) {
    providers.push(makeOpenRouterPremiumVisionProvider(cfg.openRouterApiKey, cfg.openRouterPremiumModel));
    providers.push(makeOpenRouterVisionProvider(cfg.openRouterApiKey, cfg.openRouterModel));
  }
  return providers;
}
