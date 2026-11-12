// The estimator's lease index, read from the private database (written by the
// worker's Rentvine sync) and cached in memory for REFRESH_MS, so a visitor's
// estimate never waits on the database and the table is read at most every
// few minutes per API instance.

import type { Sql } from '../db';
import { estimateRent, loadIndex, type Estimate, type Lease } from './estimate';

const REFRESH_MS = 10 * 60_000;

export interface EstimateSource { estimate(q: { zip: string; sqft: number; beds?: string | null }): Promise<Estimate | null> }

export function dbEstimator(sql: Sql, now: () => number = Date.now): EstimateSource {
  let leases: Lease[] = [];
  let loadedAt = 0;
  let loading: Promise<void> | null = null;
  const refresh = async () => {
    try {
      const rows = await sql<{ records: unknown[] }[]>`SELECT records FROM segment_index WHERE id = 1`;
      leases = rows[0] ? loadIndex(rows[0].records as never[]) : [];
      loadedAt = now();
    } catch (err) {
      console.warn(`[estimator] could not load the index: ${err instanceof Error ? err.name : 'error'}`);
      loadedAt = now() - REFRESH_MS + 30_000; // retry in 30 s, keep serving the old copy
    }
  };
  return {
    async estimate(q) {
      if (now() - loadedAt > REFRESH_MS) {
        loading ??= refresh().finally(() => { loading = null; });
        if (!leases.length) await loading; // first use: wait; later: serve the cached copy
      }
      return estimateRent({ zip: q.zip, sqft: q.sqft, beds: q.beds ?? '' }, leases);
    },
  };
}
