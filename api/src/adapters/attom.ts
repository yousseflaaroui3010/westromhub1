import { z } from 'zod';
import type { CadLookupResult } from './types';

const TIMEOUT_MS = 8_000;

const AttomResponseSchema = z.object({
  property: z.array(z.object({
    assessment: z.object({
      assessed: z.object({
        assdttlvalue: z.number().nullable().optional(),
      }).optional(),
      tax: z.object({
        taxyear: z.number().nullable().optional(),
      }).optional(),
    }).optional(),
  })).optional(),
}).passthrough();

function splitAddress(combined: string): { address1: string; address2: string } {
  const commaIdx = combined.indexOf(',');
  if (commaIdx === -1) return { address1: combined.trim(), address2: '' };
  return {
    address1: combined.substring(0, commaIdx).trim(),
    address2: combined.substring(commaIdx + 1).trim(),
  };
}

/**
 * ATTOM secondary fallback — returns prior-year assessed value only.
 * currentValue is always null since ATTOM's free data lags 6-18 months.
 */
export async function lookupAttom(
  address: string,
  apiKey: string,
): Promise<CadLookupResult | null> {
  const { address1, address2 } = splitAddress(address);
  if (!address1) return null;

  const url = new URL('https://api.gateway.attomdata.com/propertyapi/v1.0.0/assessment/detail');
  url.searchParams.set('address1', address1);
  if (address2) url.searchParams.set('address2', address2);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { apikey: apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let json: unknown;
  try { json = await res.json(); } catch { return null; }

  const parsed = AttomResponseSchema.safeParse(json);
  if (!parsed.success) return null;

  const prop = parsed.data.property?.[0];
  const priorValue = prop?.assessment?.assessed?.assdttlvalue ?? null;
  const taxYear = prop?.assessment?.tax?.taxyear ?? null;
  if (priorValue === null || taxYear === null) return null;

  const currentYear = new Date().getFullYear();
  return {
    currentYear,
    currentValue: 0,     // ATTOM lags — mark as unavailable via null in caller
    priorYear: taxYear,
    priorValue,
  };
}
