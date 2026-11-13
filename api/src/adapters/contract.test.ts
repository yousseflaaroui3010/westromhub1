/**
 * CAD adapter contract tests — live HTTP smoke tests.
 *
 * These tests hit real county websites to verify the scraper endpoints
 * and HTML structure haven't changed (CAD portals upgrade ~twice/year).
 *
 * SKIPPED in normal test runs. Run manually before every deploy or after
 * a reported lookup failure:
 *
 *   INTEGRATION=true npx vitest run api/src/adapters/contract.test.ts
 *
 * A failure here means a CAD portal changed its URL or form structure.
 * Update the relevant adapter file and log in buglog.md.
 */

import { describe, it, expect } from 'vitest';
import { lookupTad } from './tad';

const RUN = process.env.INTEGRATION === 'true';
const TIMEOUT = 15_000;

// ─── TAD (Tarrant Appraisal District — tad.org) ──────────────────────────────
// No live contract: tad.org sits behind a Cloudflare bot challenge (403 to any
// server), so the TAD adapter is disabled on purpose and Tarrant owners upload
// their notice instead (read by the extractor; see extractor/tests/
// test_real_notices.py). This guards that the adapter stays off rather than
// half-working against a page it cannot reach.

describe('TAD adapter (disabled by design)', () => {
  it('returns null so the lookup falls back to ATTOM / the notice upload', async () => {
    expect(await lookupTad('1234 Main Blvd, Fort Worth, TX 76118')).toBeNull();
  });
});

// ─── DCAD (Dallas Central Appraisal District — dallascad.org) ────────────────

describe.skipIf(!RUN)('DCAD contract — dallascad.org', () => {
  it('search page returns 200', async () => {
    const res = await fetch('https://www.dallascad.org/SearchAddr.aspx', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    expect(res.status).toBe(200);
  }, TIMEOUT);

  it('search page contains ASP.NET ViewState', async () => {
    const res = await fetch('https://www.dallascad.org/SearchAddr.aspx', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const html = await res.text();
    expect(html).toContain('__VIEWSTATE');
  }, TIMEOUT);

  it('search page contains expected address field names (txtAddrNum + txtStName)', async () => {
    const res = await fetch('https://www.dallascad.org/SearchAddr.aspx', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const html = await res.text();
    // These are the field names the dcad.ts adapter POSTs.
    // MAINTENANCE: if this test fails, inspect the live form, update dcad.ts field names.
    expect(html).toContain('txtAddrNum');
    expect(html).toContain('txtStName');
  }, TIMEOUT);
});
