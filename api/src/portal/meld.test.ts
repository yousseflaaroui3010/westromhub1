import { describe, expect, it } from 'vitest';
import { propertyMeld } from './meld';

const CREDS = { clientId: 'id', clientSecret: 'secret', multitenantId: '77' };

function fakePm() {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const impl = (async (u: string, init?: RequestInit) => {
    const url = String(u);
    calls.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
    if (url.endsWith('oauth/token/')) return json({ access_token: 'tok', expires_in: 3600 });
    if (url.includes('property/')) {
      return url.includes('page=2')
        ? json({ results: [{ id: 9, line_1: '2207 Mesquite Trail' }], next: 'https://evil.example/steal' })
        : json({ results: [{ id: 5, line_1: '412 LARKSPUR BEND DRIVE' }], next: 'https://api.propertymeld.com/api/v2/property/?limit=100&page=2' });
    }
    if (url.includes('meld/') && url.includes('property=5')) {
      return json({ results: [
        { reference_id: 'M-3', brief_description: 'Leak under sink', status: 'PENDING_VENDOR', created: '2026-11-10T09:00:00Z' },
        { reference_id: 'M-2', brief_description: 'AC not cooling', status: 'COMPLETE', created: '2026-07-01T10:00:00Z', marked_complete: '2026-07-03T09:00:00Z', completion_date: '2026-07-01' },
        { reference_id: 'M-1', brief_description: 'Old', status: 'COMPLETE', created: '2024-01-01T10:00:00Z', marked_complete: '2024-01-02T10:00:00Z' },
        { reference_id: 'M-0', brief_description: 'Dup', status: 'MANAGER_CANCELED', created: '2026-08-01T10:00:00Z' },
      ], next: null });
    }
    return json({ results: [], next: null });
  }) as unknown as typeof fetch;
  return { calls, impl };
}

describe('PropertyMeld reader', () => {
  it('answers null when PropertyMeld is not set up', async () => {
    const pm = fakePm();
    expect(await propertyMeld(async () => null, pm.impl)('412 Larkspur Bend', 'Haslet')).toBeNull();
    expect(pm.calls).toEqual([]);
  });

  it("reads a home's requests of the last year, closed by marked_complete, cancelled ones left out", async () => {
    const pm = fakePm();
    const read = propertyMeld(async () => CREDS, pm.impl, () => Date.parse('2026-11-15T12:00:00Z'));
    const melds = await read('412 Larkspur Bend', 'Haslet');
    expect(melds).toEqual([
      { ref: 'M-3', title: 'Leak under sink', status: 'PENDING_VENDOR', priority: null, opened: '2026-11-10', closed: null, open: true },
      { ref: 'M-2', title: 'AC not cooling', status: 'COMPLETE', priority: null, opened: '2026-07-01', closed: '2026-07-03', open: false },
    ]);
    const data = pm.calls.filter((c) => !c.url.endsWith('oauth/token/'));
    expect(data.every((c) => c.headers.Authorization === 'Bearer tok' && c.headers['X-Multitenant-Id'] === '77')).toBe(true);
    expect(pm.calls.some((c) => c.url.startsWith('https://evil.example'))).toBe(false); // only PropertyMeld's own next links
    expect(await read('9 Nowhere Rd', 'Keller')).toEqual([]); // no matching property
    expect(pm.calls.filter((c) => c.url.endsWith('oauth/token/'))).toHaveLength(1); // the token is reused
  });
});
