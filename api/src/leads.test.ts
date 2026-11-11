import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp, type AppOptions } from './app';

const SECRET = 'g'.repeat(40);
const ORIGIN = 'https://westromgroup.com';

type Call = { url: string; init: RequestInit };
let calls: Call[] = [];
let upstream: (url: string, init: RequestInit) => Promise<Response>;

const fakeFetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
  const u = String(url);
  calls.push({ url: u, init: init ?? {} });
  return upstream(u, init ?? {});
}) as unknown as typeof fetch;

function build(extra: Partial<AppOptions> = {}) {
  return createApp({
    textProviders: [],
    extractor: null,
    allowedOrigins: ['https://wgcassetguide.com'],
    leadAllowedOrigins: [ORIGIN],
    extractDailyCap: 0,
    leadGateway: { baseUrl: 'https://n8n.example/webhook/hook', secret: SECRET, fetchImpl: fakeFetch, dailySubmitCap: 5, dailyGuideEmailCap: 2 },
    ...extra,
  });
}

let n = 0;
function lead(over: Record<string, unknown> = {}) {
  n += 1;
  return {
    submission_id: `0f8fad5b-d9cb-469f-a165-70867728${String(1000 + n).padStart(4, '0')}`,
    name: '', email: '', phone: '', zip: '76102', sqft: 1800, bedrooms: '3',
    ebook_opt_in: false, consent: null, token: `dG9rZW4tdG9rZW4tdG9rZW4t${n}`, fax: '', fill_ms: 9000,
    ...over,
  };
}

function submit(app: ReturnType<typeof build>, body: unknown, headers: Record<string, string> = {}) {
  return app.fetch(new Request('http://localhost/api/leads/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN, 'X-Real-IP': '203.0.113.5', 'User-Agent': 'Mozilla/5.0', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }));
}

beforeEach(() => {
  calls = [];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  upstream = async (url) => url.endsWith('/token')
    ? new Response('MTczMTI3NDQ0NDQ0NC5hYmNkZWYuMTIzNDU2Nzg5MA==')
    : Response.json({ ok: true, estimate: { low: 1800, high: 2000, comps: [], meta: { source: 'own-lease-history' } } });
});

describe('GET /api/leads/token', () => {
  it('proxies the render token with the gateway secret and the trusted client IP', async () => {
    const res = await build().fetch(new Request('http://localhost/api/leads/token', { headers: { Origin: ORIGIN, 'X-Real-IP': '203.0.113.5', 'X-Forwarded-For': '6.6.6.6' } }));
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(calls[0].url).toBe('https://n8n.example/webhook/hook/token');
    const h = calls[0].init.headers as Record<string, string>;
    expect(h['X-WGC-Gateway']).toBe(SECRET);
    expect(h['X-WGC-Client-IP']).toBe('203.0.113.5');
  });

  it('returns 503 (not the upstream detail) when n8n is down', async () => {
    upstream = async () => new Response('n8n internal: stack trace here', { status: 500 });
    const res = await build().fetch(new Request('http://localhost/api/leads/token', { headers: { 'X-Real-IP': '203.0.113.5' } }));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain('stack');
  });

  it('rate limits token issuance per IP', async () => {
    const app = build();
    let last = 0;
    for (let i = 0; i < 21; i++) {
      last = (await app.fetch(new Request('http://localhost/api/leads/token', { headers: { 'X-Real-IP': '203.0.113.6' } }))).status;
    }
    expect(last).toBe(429);
  });

  it('is 503 when the gateway is not configured', async () => {
    const res = await build({ leadGateway: null }).fetch(new Request('http://localhost/api/leads/token', { headers: { 'X-Real-IP': '203.0.113.5' } }));
    expect(res.status).toBe(503);
  });
});

describe('POST /api/leads/lead', () => {
  it('forwards a valid lead (allowlisted fields only) and relays the estimate', async () => {
    const res = await submit(build(), { ...lead(), evil: 'x', source: 'Injected Source' });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, estimate: { low: 1800, high: 2000 } });
    const sent = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
    expect(sent).not.toHaveProperty('evil');
    expect(sent).not.toHaveProperty('source');
    expect(sent.sqft).toBe(1800);
    const h = calls[0].init.headers as Record<string, string>;
    expect(h['X-WGC-Gateway']).toBe(SECRET);
  });

  it.each([
    ['honeypot filled', { fax: 'bot' }],
    ['submitted too fast', { fill_ms: 400 }],
    ['bad zip', { zip: '7610' }],
    ['sqft out of range', { sqft: 50 }],
    ['ebook without a valid email', { ebook_opt_in: true, email: 'nope' }],
  ])('silently drops a submission with %s (success-shaped, not forwarded)', async (_label, over) => {
    const res = await submit(build(), lead(over));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });

  it('silently drops a submission from a non-allowlisted or missing Origin', async () => {
    const app = build();
    expect(await (await submit(app, lead(), { Origin: '' })).json()).toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });

  it('caps one render token at 3 submissions', async () => {
    const app = build();
    const token = 'c2FtZS10b2tlbi1zYW1lLXRva2Vu';
    for (let i = 0; i < 4; i++) await submit(app, lead({ token }), { 'X-Real-IP': `203.0.113.${60 + i}` });
    expect(calls).toHaveLength(3);
  });

  it('rate limits submissions per IP', async () => {
    const app = build({ leadGateway: { baseUrl: 'https://n8n.example/webhook/hook', secret: SECRET, fetchImpl: fakeFetch, dailySubmitCap: 100 } });
    for (let i = 0; i < 7; i++) await submit(app, lead(), { 'X-Real-IP': '203.0.113.70' });
    expect(calls).toHaveLength(6);
  });

  it('enforces the global daily submission cap', async () => {
    const app = build();
    for (let i = 0; i < 7; i++) await submit(app, lead(), { 'X-Real-IP': `203.0.113.${80 + i}` });
    expect(calls).toHaveLength(5);
  });

  it('sends the guide to an address at most once per day, but still serves the estimate', async () => {
    const app = build();
    const consent = { explicit: true, text_version: 'v3', ts: '2026-11-10T00:00:00Z' };
    await submit(app, lead({ ebook_opt_in: true, email: 'Owner@Example.com', consent }), { 'X-Real-IP': '203.0.113.90' });
    const second = await submit(app, lead({ ebook_opt_in: true, email: 'owner@example.com', consent }), { 'X-Real-IP': '203.0.113.91' });
    expect((await second.json() as Record<string, unknown>).estimate).toBeDefined();
    const [a, b] = calls.map((c) => JSON.parse(String(c.init.body)) as Record<string, unknown>);
    expect(a.ebook_opt_in).toBe(true);
    expect(a.email).toBe('Owner@Example.com');
    expect(b.ebook_opt_in).toBe(false);
    expect(b.email).toBe('');
    expect(b.consent).toBeNull();
  });

  it('enforces the global daily guide-email cap', async () => {
    const app = build({ leadGateway: { baseUrl: 'https://n8n.example/webhook/hook', secret: SECRET, fetchImpl: fakeFetch, dailySubmitCap: 100, dailyGuideEmailCap: 2 } });
    for (let i = 0; i < 3; i++) {
      await submit(app, lead({ ebook_opt_in: true, email: `p${i}@example.com`, consent: { explicit: true, text_version: 'v3', ts: 'x' } }), { 'X-Real-IP': `203.0.113.${100 + i}` });
    }
    const sent = calls.map((c) => (JSON.parse(String(c.init.body)) as Record<string, unknown>).ebook_opt_in);
    expect(sent).toEqual([true, true, false]);
  });

  it('requires a passing Turnstile check when configured', async () => {
    const turnstile = vi.fn(async (t: string) => ({ ok: t === 'good' }));
    const app = build({ leadTurnstile: turnstile });
    await submit(app, lead(), { 'X-Real-IP': '203.0.113.110' });
    await submit(app, lead({ turnstile: 'bad' }), { 'X-Real-IP': '203.0.113.111' });
    expect(calls).toHaveLength(0);
    await submit(app, lead({ turnstile: 'good' }), { 'X-Real-IP': '203.0.113.112' });
    expect(calls).toHaveLength(1);
    expect(turnstile).toHaveBeenLastCalledWith('good', '203.0.113.112', expect.any(String));
  });

  it('paid-route Turnstile alone does not gate the lead form', async () => {
    const app = build({ turnstile: vi.fn(async () => ({ ok: false })) });
    await submit(app, lead(), { 'X-Real-IP': '203.0.113.113' });
    expect(calls).toHaveLength(1);
  });

  it('returns 503 so the widget can retry when n8n fails', async () => {
    upstream = async () => new Response('boom', { status: 502 });
    const res = await submit(build(), lead());
    expect(res.status).toBe(503);
  });

  it('does not relay unexpected upstream payloads', async () => {
    upstream = async () => Response.json({ ok: true, estimate: { low: 'x' }, debug: 'secret' });
    const res = await submit(build(), lead());
    expect(await res.json()).toEqual({ ok: true });
  });

  it('drops oversized bodies silently', async () => {
    const res = await submit(build(), JSON.stringify({ ...lead(), pad: 'x'.repeat(10_000) }));
    expect(await res.json()).toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });

  it('refuses a weak gateway secret at startup', () => {
    expect(() => build({ leadGateway: { baseUrl: 'https://x', secret: 'short' } })).toThrow();
  });
});
