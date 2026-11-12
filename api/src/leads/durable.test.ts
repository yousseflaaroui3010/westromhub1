// Accept-then-deliver, against a real Postgres (TEST_DATABASE_URL; CI runs one).
import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import { createApp } from '../app';
import { connect, migrate, type Sql } from '../db';
import { pgLeadStore, backoffMs, MAX_ATTEMPTS } from './store';
import { issueToken, verifyToken, TOKEN_MAX_AGE_MS } from './tokens';
import { deliverDue } from '../worker';

const url = process.env.TEST_DATABASE_URL;
const SECRET = 's'.repeat(40);
const KEY = 'k'.repeat(64);
const ORIGIN = 'https://westromgroup.com';

describe('render tokens', () => {
  it('verifies its own tokens inside the 2 s .. 2 h window only', () => {
    const t0 = 1_800_000_000_000;
    const tok = issueToken(KEY, t0);
    expect(verifyToken(KEY, tok, t0 + 1_000)).toBe(false); // too fast
    expect(verifyToken(KEY, tok, t0 + 60_000)).toBe(true);
    expect(verifyToken(KEY, tok, t0 + TOKEN_MAX_AGE_MS + 1)).toBe(false); // expired
    expect(verifyToken('x'.repeat(64), tok, t0 + 60_000)).toBe(false); // other key
    expect(verifyToken(KEY, 'not-a-token', t0)).toBe(false);
  });

  it('backoff grows then caps at an hour', () => {
    expect([1, 2, 3].map(backoffMs)).toEqual([30_000, 60_000, 120_000]);
    expect(backoffMs(20)).toBe(3_600_000);
  });
});

describe.skipIf(!url)('durable leads (real Postgres)', () => {
  let sql: Sql;
  let n8nUp = true;
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fakeFetch = vi.fn(async (u: string | URL | Request, init?: RequestInit) => {
    const s = String(u);
    if (!n8nUp) throw new TypeError('fetch failed');
    if (s.endsWith('/token')) return new Response('MTczMTI3NDQ0NDQ0NC5hYmNkZWYuMTIzNDU2Nzg5MA==');
    calls.push({ url: s, body: JSON.parse(String(init?.body)) });
    return Response.json({ ok: true, estimate: { low: 1800, high: 2000, comps: [] } });
  }) as unknown as typeof fetch;

  const up = { baseUrl: 'https://n8n.example/webhook/hook', secret: SECRET, fetchImpl: fakeFetch };
  const app = (issuer: 'n8n' | 'api' = 'n8n') => createApp({
    extractor: null, allowedOrigins: ['https://wgcassetguide.com'], leadAllowedOrigins: [ORIGIN], extractDailyCap: 0,
    leadGateway: { ...up, store: pgLeadStore(sql), tokenKey: KEY, tokenIssuer: issuer, dailySubmitCap: 1000 },
  });
  let n = 0;
  const lead = (token: string) => {
    n += 1;
    return { submission_id: `1f8fad5b-d9cb-469f-a165-70867728${String(1000 + n).padStart(4, '0')}`, zip: '76102', sqft: 1800,
      bedrooms: '3', ebook_opt_in: false, consent: null, token, fax: '', fill_ms: 9000 };
  };
  const submit = (a: ReturnType<typeof app>, body: unknown, ip = `203.0.113.${(n % 200) + 1}`) => a.fetch(new Request('http://localhost/api/leads/lead', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'X-Real-IP': ip, 'User-Agent': 'Mozilla/5.0' }, body: JSON.stringify(body),
  }));
  const row = async (id: string) => (await sql`SELECT * FROM lead WHERE submission_id = ${id}`)[0];

  beforeAll(async () => {
    sql = connect(url as string);
    await sql`DROP TABLE IF EXISTS lead`;
    await migrate(sql);
    await migrate(sql); // idempotent
  });
  afterAll(async () => { await sql.end(); });
  beforeEach(() => {
    n8nUp = true; calls.length = 0;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  it('n8n up: stored, delivered at once, visitor gets the estimate', async () => {
    const l = lead('legacy-n8n-token-aaaa');
    const res = await submit(app(), l);
    expect(await res.json()).toMatchObject({ ok: true, estimate: { low: 1800 } });
    const r = await row(l.submission_id);
    expect(r.status).toBe('delivered');
    expect(r.payload.zip).toBe('76102');
    expect(calls[0].body.gateway_verified).toBeUndefined(); // n8n token: n8n checks it
  });

  it('n8n down: stored and queued, visitor still gets success; the worker delivers later', async () => {
    n8nUp = false;
    const l = lead('legacy-n8n-token-bbbb');
    const res = await submit(app(), l);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    let r = await row(l.submission_id);
    expect(r.status).toBe('pending');
    expect(r.attempts).toBe(1);
    // Not due yet (backoff) -> the worker leaves it alone.
    expect((await deliverDue(pgLeadStore(sql), up)).delivered).toBe(0);
    await sql`UPDATE lead SET next_attempt_at = now() WHERE submission_id = ${l.submission_id}`;
    n8nUp = true;
    const pass = await deliverDue(pgLeadStore(sql), up);
    expect(pass.delivered).toBe(1);
    r = await row(l.submission_id);
    expect(r.status).toBe('delivered');
    expect(calls.filter((c) => c.body.submission_id === l.submission_id)).toHaveLength(1);
  });

  it('a retried submission is answered from the store, not sent twice', async () => {
    const l = lead('legacy-n8n-token-cccc');
    await submit(app(), l);
    const again = await submit(app(), l);
    expect(await again.json()).toMatchObject({ ok: true, estimate: { low: 1800 } });
    expect(calls.filter((c) => c.body.submission_id === l.submission_id)).toHaveLength(1);
  });

  it('API-issued tokens: minted by /token, verified on receipt, flagged for n8n', async () => {
    const a = app('api');
    const tokRes = await a.fetch(new Request('http://localhost/api/leads/token', { headers: { Origin: ORIGIN, 'X-Real-IP': '198.51.100.9' } }));
    const tok = await tokRes.text();
    expect(calls.some((c) => c.url.endsWith('/token'))).toBe(false); // n8n not asked
    const old = issueToken(KEY, Date.now() - 60_000); // a token that is old enough
    const l = lead(old);
    await submit(a, l);
    expect((await row(l.submission_id)).token_verified).toBe(true);
    expect(calls.at(-1)!.body.gateway_verified).toBe(true);
    expect(verifyToken(KEY, tok, Date.now() + 10_000)).toBe(true);
  });

  it('parallel workers never deliver the same lead twice', async () => {
    n8nUp = false;
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) { const l = lead('legacy-n8n-token-dddd'); ids.push(l.submission_id); await submit(app(), l); }
    await sql`UPDATE lead SET next_attempt_at = now() WHERE status = 'pending'`;
    n8nUp = true;
    calls.length = 0;
    const [a, b] = await Promise.all([deliverDue(pgLeadStore(sql), up), deliverDue(pgLeadStore(sql), up)]);
    expect(a.delivered + b.delivered).toBe(6);
    const sent = calls.map((c) => c.body.submission_id);
    expect(new Set(sent).size).toBe(sent.length);
    for (const id of ids) expect((await row(id)).status).toBe('delivered');
  });

  it('after MAX_ATTEMPTS a lead is marked dead and alerted, never deleted', async () => {
    n8nUp = false;
    const l = lead('legacy-n8n-token-eeee');
    await submit(app(), l);
    await sql`UPDATE lead SET attempts = ${MAX_ATTEMPTS - 1}, next_attempt_at = now() WHERE submission_id = ${l.submission_id}`;
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const pass = await deliverDue(pgLeadStore(sql), up);
    expect(pass.dead).toBe(1);
    expect((await row(l.submission_id)).status).toBe('dead');
    expect(err.mock.calls.flat().join(' ')).toContain('LEAD UNDELIVERED');
  });

  it('database down: falls back to direct delivery instead of failing the visitor', async () => {
    const broken = connect('postgresql://app@127.0.0.1:1/none');
    const a = createApp({
      extractor: null, allowedOrigins: ['https://wgcassetguide.com'], leadAllowedOrigins: [ORIGIN], extractDailyCap: 0,
      leadGateway: { ...up, store: pgLeadStore(broken), tokenKey: KEY, dailySubmitCap: 1000 },
    });
    const res = await submit(a, lead('legacy-n8n-token-ffff'));
    expect(await res.json()).toMatchObject({ ok: true, estimate: { low: 1800 } });
    await broken.end({ timeout: 1 }).catch(() => {});
  });
});
