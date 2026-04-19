import type { CadLookupResult } from './types';

/**
 * Tarrant Appraisal District (tad.org) adapter.
 *
 * Direct requests to TAD.org are blocked by Cloudflare's Turnstile (JS Challenge).
 * Since a free, serverless workaround is structurally impossible without a
 * heavy managed-browser proxy, this adapter intentionally returns null.
 * 
 * The frontend will gracefully fallback to requesting a manual document upload.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function lookupTad(_address: string): Promise<CadLookupResult | null> {
  console.log('[tad] Auto-lookup for TAD is disabled due to Cloudflare JS Challenge requirements.');
  return null;
}
