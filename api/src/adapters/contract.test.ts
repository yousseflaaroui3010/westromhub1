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

const RUN = process.env.INTEGRATION === 'true';
const TIMEOUT = 15_000;

// ─── TAD (Tarrant Appraisal District — tad.org) ──────────────────────────────

describe.skipIf(!RUN)('TAD contract — tad.org', () => {
  it('search page returns 200', async () => {
    const res = await fetch('https://www.tad.org/Property/PropertySearch', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    expect(res.status).toBe(200);
  }, TIMEOUT);

  it('search page contains ASP.NET ViewState (PACS requires it for POST)', async () => {
    const res = await fetch('https://www.tad.org/Property/PropertySearch', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const html = await res.text();
    expect(html).toContain('__VIEWSTATE');
  }, TIMEOUT);

  it('search page contains expected address field names (StreetNumber + StreetName)', async () => {
    const res = await fetch('https://www.tad.org/Property/PropertySearch', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    const html = await res.text();
    // These are the field names the tad.ts adapter POSTs — if these change, update tad.ts
    expect(html).toContain('StreetNumber');
    expect(html).toContain('StreetName');
  }, TIMEOUT);
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
