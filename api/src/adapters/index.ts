import type { CadLookupFn, CadLookupResult } from './types';
import { normalizeAddress } from './normalizeAddress';
import { lookupTad } from './tad';
import { lookupDcad } from './dcad';
import { lookupAttom } from './attom';

export type { CadLookupResult, CadLookupFn };

/** Maps county name (any casing) to the right CAD scraper. */
function resolveScraper(
  county: string,
): ((address: string) => Promise<CadLookupResult | null>) | null {
  const lower = county.toLowerCase();
  if (lower.includes('tarrant')) return lookupTad;
  if (lower.includes('dallas')) return lookupDcad;
  return null;
}

/**
 * Factory: returns a CadLookupFn bound to the given ATTOM key.
 * Inject this into createApp in production; inject a mock in tests.
 *
 * Lookup priority:
 *   1. County CAD scraper — freshest, no API key
 *   2. ATTOM — secondary fallback, prior year only, lags 6-18 months
 *   3. null — frontend shows manual entry
 */
export function createLookupFn(attomApiKey?: string): CadLookupFn {
  return async (rawAddress: string, county: string): Promise<CadLookupResult | null> => {
    const address = normalizeAddress(rawAddress);
    console.log(`[lookup] county="${county}" normalized="${address}"`);

    const scraper = resolveScraper(county);
    if (scraper) {
      const cadResult = await scraper(address);
      if (cadResult !== null) {
        console.log(`[lookup] CAD hit — current=${cadResult.currentValue} prior=${cadResult.priorValue}`);
        return cadResult;
      }
      console.log('[lookup] CAD miss — trying ATTOM');
    }

    if (!attomApiKey) return null;

    const attomResult = await lookupAttom(address, attomApiKey);
    if (attomResult) {
      console.log(`[lookup] ATTOM hit — prior=${attomResult.priorValue} year=${attomResult.priorYear}`);
      // Mark currentValue as unavailable from ATTOM source
      return { ...attomResult, currentValue: 0 };
    }

    return null;
  };
}
