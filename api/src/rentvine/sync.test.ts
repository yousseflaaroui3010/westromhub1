import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { connect, migrate, readSecret, type Sql } from '../db';
import { accept, digest, syncOnce, toRecord, rentvineClient, indexIsStale } from './sync';
import { dbEstimator } from '../estimator/indexCache';
import { createApp } from '../app';
import { pgLeadStore } from '../leads/store';

const row = (i: number, rent = 1700 + i, zip = '76109') => ({
  lease: { leaseID: i, unitID: i, rent: String(rent), startDate: '2026-02-01 00:00:00', tenants: [{ name: 'Tenant Name' }] },
  unit: { unitID: i, beds: 3, fullBaths: 2, halfBaths: 0, size: 1400 + (i % 5) * 20, address: `${i} Private St`, postalCode: zip },
  property: { postalCode: zip },
});

describe('record mapping', () => {
  it('keeps only estimator fields: no address, no tenant', () => {
    const r = toRecord(row(7));
    expect(r).toEqual({ zip: '76109', beds: 3, baths: 2, sqft: 1440, rent: 1707, date: '2026-02-01', uid: 'rv7' });
    expect(JSON.stringify(r)).not.toMatch(/Private|Tenant/);
  });
  it('rejects unpriceable rows and implausible values', () => {
    expect(toRecord({ lease: { rent: 0 }, unit: { postalCode: '76109' } })).toBeNull();
    expect(toRecord({ lease: { rent: 50_000 }, unit: { postalCode: '76109' } })).toBeNull();
    expect(toRecord({ lease: { rent: 1500 }, unit: { address: 'x', postalCode: 'none' } })).toBeNull();
  });
  it('digest is order-independent; accept guards against partial reads', () => {
    const a = [row(1), row(2)].map(toRecord).filter(Boolean) as never[];
    expect(digest(a)).toBe(digest([...a].reverse()));
    expect(accept(500, 100).ok).toBe(false);
    expect(accept(null, 5).ok).toBe(false);
    expect(accept(500, 480).ok).toBe(true);
  });
  it('rejects a corporation id that could point elsewhere', () => {
    expect(() => rentvineClient({ apiKey: 'k', apiSecret: 's', corporationId: 'evil.com/x' })).toThrow();
  });
});

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('Rentvine sync (real Postgres, fake Rentvine)', () => {
  let sql: Sql;
  let pages: unknown[][] = [];
  let statusCode = 200;
  const seen: string[] = [];
  const fakeFetch = vi.fn(async (u: string | URL | Request, init?: RequestInit) => {
    const s = String(u);
    seen.push(s);
    expect((init?.headers as Record<string, string>).Authorization).toBe('Basic ' + Buffer.from('KEY:SECRET').toString('base64'));
    expect(s.startsWith('https://westromgroup.rentvine.com/api/manager/')).toBe(true);
    if (statusCode !== 200) return new Response('{}', { status: statusCode });
    const page = Number(new URL(s).searchParams.get('page'));
    return Response.json(page === 1 ? { data: pages[0] ?? [] } : (pages[page - 1] ?? []));
  }) as unknown as typeof fetch;
  const creds = async () => {
    const [apiKey, apiSecret] = [await readSecret(sql, 'rentvine_api_key'), await readSecret(sql, 'rentvine_api_secret')];
    return apiKey && apiSecret ? { apiKey, apiSecret, corporationId: 'westromgroup' } : null;
  };
  const quiet = { info: () => {}, warn: () => {}, error: () => {} };
  const lastStatus = async () => (await sql`SELECT * FROM rentvine_status WHERE id = 1`)[0];

  beforeAll(async () => {
    sql = connect(url as string);
    await sql`DROP TABLE IF EXISTS segment_index, rentvine_status, lead`;
    await sql`DELETE FROM app_secret WHERE name LIKE 'rentvine_%'`.catch(() => {});
    await migrate(sql);
  });
  afterAll(async () => { await sql.end(); });
  beforeEach(() => { seen.length = 0; statusCode = 200; });

  it('without a key in the database: records it and calls nothing', async () => {
    expect(await syncOnce(sql, creds, fakeFetch, 0, quiet)).toBe('no-key');
    expect(seen).toHaveLength(0);
    expect((await lastStatus()).last_result).toMatch(/no Rentvine key/);
    expect(await indexIsStale(sql)).toBe(true);
  });

  it('with the key: pages through active leases and stores the anonymized index', async () => {
    await sql`INSERT INTO app_secret (name, value) VALUES ('rentvine_api_key', 'KEY'), ('rentvine_api_secret', 'SECRET')`;
    pages = [Array.from({ length: 100 }, (_, i) => row(i)), Array.from({ length: 40 }, (_, i) => row(100 + i, 1900, '76110'))];
    expect(await syncOnce(sql, creds, fakeFetch, 0, quiet)).toBe('updated');
    expect(seen).toHaveLength(2);
    expect(seen[0]).toContain('primaryLeaseStatusIDs%5B%5D=2');
    const idx = (await sql`SELECT * FROM segment_index WHERE id = 1`)[0];
    expect(idx.record_count).toBe(140);
    expect(JSON.stringify(idx.records)).not.toMatch(/Private|Tenant/);
    expect(await indexIsStale(sql)).toBe(false);
  });

  it('unchanged data is not rewritten', async () => {
    const before = (await sql`SELECT generated_at FROM segment_index WHERE id = 1`)[0].generated_at;
    expect(await syncOnce(sql, creds, fakeFetch, 0, quiet)).toBe('unchanged');
    expect((await sql`SELECT generated_at FROM segment_index WHERE id = 1`)[0].generated_at).toEqual(before);
  });

  it('a wrong key stops at once and is recorded; the old index stays', async () => {
    statusCode = 401;
    expect(await syncOnce(sql, creds, fakeFetch, 0, quiet)).toBe('failed');
    expect(seen).toHaveLength(1);
    const st = await lastStatus();
    expect(st.http_status).toBe(401);
    expect(st.last_result).toMatch(/rejected the API key/);
    expect((await sql`SELECT record_count FROM segment_index WHERE id = 1`)[0].record_count).toBe(140);
  });

  it('a partial read never replaces a good index', async () => {
    pages = [Array.from({ length: 30 }, (_, i) => row(i))];
    expect(await syncOnce(sql, creds, fakeFetch, 0, quiet)).toBe('rejected');
    expect((await sql`SELECT record_count FROM segment_index WHERE id = 1`)[0].record_count).toBe(140);
  });

  it('end to end: n8n down, the visitor still gets an estimate from the Rentvine index', async () => {
    const est = dbEstimator(sql);
    const app = createApp({
      extractor: null, allowedOrigins: ['https://wgcassetguide.com'], leadAllowedOrigins: ['https://westromgroup.com'], extractDailyCap: 0,
      leadGateway: {
        baseUrl: 'https://n8n.example/webhook/x', secret: 's'.repeat(40), store: pgLeadStore(sql), estimator: est,
        fetchImpl: (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch,
      },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await app.fetch(new Request('http://localhost/api/leads/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://westromgroup.com', 'X-Real-IP': '203.0.113.77', 'User-Agent': 'UA' },
      body: JSON.stringify({ submission_id: '2f8fad5b-d9cb-469f-a165-708677280001', zip: '76109', sqft: 1440, bedrooms: '3',
        ebook_opt_in: false, consent: null, token: 'legacy-token-xxxx', fax: '', fill_ms: 9000 }),
    }));
    const body = await res.json() as { ok: boolean; estimate?: { low: number; high: number; meta: { source: string } } };
    expect(body.ok).toBe(true);
    expect(body.estimate?.meta.source).toBe('own-lease-history');
    expect(body.estimate!.low).toBeGreaterThan(1500);
    const stored = (await sql`SELECT status, estimate FROM lead WHERE submission_id = '2f8fad5b-d9cb-469f-a165-708677280001'`)[0];
    expect(stored.status).toBe('pending');
    expect(stored.estimate.low).toBe(body.estimate!.low);
  });
});
