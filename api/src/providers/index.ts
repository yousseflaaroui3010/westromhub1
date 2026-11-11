import type { VisionProvider } from './types';
import { redact } from '../http/errors';
import { makeOpenRouterVisionProvider, makeOpenRouterPremiumVisionProvider } from './openrouter';
import { makeGeminiVisionProvider } from './gemini';

export type { VisionProvider };

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
  openRouterApiKey?: string;
  openRouterModel?: string;
  openRouterPremiumModel?: string;
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
