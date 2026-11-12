import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadIndex, estimateRent } from './estimate';

// Golden answers produced by the ORIGINAL wgc-lead-pipeline estimator/src/estimate.js
// (600 leases across 15 ZIPs, 300 queries incl. unknown ZIPs, ZIP3 fallbacks,
// all bed options and missing sqft). The TypeScript port must match exactly.
const golden = JSON.parse(readFileSync(resolve(__dirname, 'estimator.golden.json'), 'utf8')) as {
  now: number; records: unknown[]; cases: Array<{ q: unknown; out: unknown }>;
};

describe('estimator port parity', () => {
  it('reproduces the original estimator on 300 queries', () => {
    const leases = loadIndex(golden.records as never[]);
    for (const c of golden.cases) {
      expect(JSON.parse(JSON.stringify(estimateRent(c.q, leases, { now: golden.now })))).toEqual(c.out);
    }
  });

  it('returns null without data or ZIP', () => {
    expect(estimateRent({ zip: '76109' }, [])).toBeNull();
    expect(estimateRent({ zip: 'abc' }, loadIndex(golden.records as never[]))).toBeNull();
  });
});
