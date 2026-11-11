import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Extractor } from './extractor';
import { createApp, type AppOptions } from './app';
import { MemoryStore } from './security/store';
import { ConcurrencyGate, DailyBudget } from './security/limits';
import { SessionSigner } from './security/session';
import { redact } from './http/errors';

const reader = vi.fn<Extractor>();

function build(extra: Partial<AppOptions> = {}) {
  return createApp({
    extractor: reader,
    allowedOrigins: ['https://wgcassetguide.com'],
    extractDailyCap: 0,
    ...extra,
  });
}

function req(app: ReturnType<typeof build>, path: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  return app.fetch(new Request(`http://localhost${path}`, {
    method: init.method ?? 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    body: init.method === 'GET' ? undefined : JSON.stringify(init.body ?? {}),
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  reader.mockResolvedValue({ currentValue: 100000 });
});

describe('internal proxy token', () => {
  const app = () => build({ internalProxyToken: 'p'.repeat(40) });

  it('refuses /api requests that did not come through nginx', async () => {
    const res = await req(app(), '/api/recommend-tax', { body: { county: 'Ellis County' } });
    expect(res.status).toBe(403);
    const wrong = await req(app(), '/api/recommend-tax', { body: { county: 'Ellis County' }, headers: { 'X-Internal-Proxy-Token': 'nope' } });
    expect(wrong.status).toBe(403);
  });

  it('accepts requests carrying the token', async () => {
    const res = await req(app(), '/api/recommend-tax', { body: { county: 'Ellis County' }, headers: { 'X-Internal-Proxy-Token': 'p'.repeat(40) } });
    expect(res.status).toBe(200);
  });

  it('keeps /health open for the platform health check', async () => {
    expect((await app().fetch(new Request('http://localhost/health'))).status).toBe(200);
  });
});

describe('client identity for rate limiting', () => {
  it('ignores X-Forwarded-For: rotating it does not grant a fresh quota', async () => {
    const app = build();
    const statuses: number[] = [];
    for (let i = 0; i < 18; i++) {
      const res = await req(app, '/api/property-lookup?address=123+Main+St&county=Ellis', {
        method: 'GET',
        headers: { 'X-Real-IP': '203.0.113.7', 'X-Forwarded-For': `10.0.0.${i}, 203.0.113.7` },
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 15).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(15).every((s) => s === 429)).toBe(true);
  });

  it('limits are per client: another IP is unaffected', async () => {
    const app = build();
    for (let i = 0; i < 16; i++) {
      await req(app, '/api/property-lookup?address=123+Main+St&county=Ellis', { method: 'GET', headers: { 'X-Real-IP': '203.0.113.8' } });
    }
    const other = await req(app, '/api/property-lookup?address=123+Main+St&county=Ellis', { method: 'GET', headers: { 'X-Real-IP': '203.0.113.9' } });
    expect(other.status).toBe(200);
  });

  it('a 429 carries Retry-After and the standard error shape', async () => {
    const app = build();
    let last: Response | undefined;
    for (let i = 0; i < 16; i++) {
      last = await req(app, '/api/property-lookup?address=123+Main+St&county=Ellis', { method: 'GET', headers: { 'X-Real-IP': '203.0.113.10' } });
    }
    expect(last!.status).toBe(429);
    expect(Number(last!.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect((await last!.json() as Record<string, string>).code).toBe('rate_limited');
  });

  it('paid routes are limited per IP', async () => {
    const app = build();
    const codes: number[] = [];
    for (let i = 0; i < 21; i++) {
      codes.push((await req(app, '/api/extract-tax', { body: { base64: 'dGVzdA==' }, headers: { 'X-Real-IP': '203.0.113.11' } })).status);
    }
    expect(codes.filter((c) => c === 429).length).toBeGreaterThan(0);
  });
});

describe('MemoryStore', () => {
  it('evicts expired keys and never exceeds its key cap under a unique-key flood', async () => {
    let now = 0;
    const store = new MemoryStore(1_000, () => now);
    for (let i = 0; i < 10_000; i++) await store.hit(`k${i}`, 60_000);
    expect(store.size).toBeLessThanOrEqual(1_000);
    now = 120_000;
    await store.hit('fresh', 60_000);
    expect(store.size).toBe(1);
  });

  it('resets a window after it expires', async () => {
    let now = 0;
    const store = new MemoryStore(100, () => now);
    await store.hit('a', 1_000);
    expect((await store.hit('a', 1_000)).count).toBe(2);
    now = 1_001;
    expect((await store.hit('a', 1_000)).count).toBe(1);
  });

  it('setIfAbsent claims once per TTL', async () => {
    let now = 0;
    const store = new MemoryStore(100, () => now);
    expect(await store.setIfAbsent('x', 1_000)).toBe(true);
    expect(await store.setIfAbsent('x', 1_000)).toBe(false);
    now = 1_001;
    expect(await store.setIfAbsent('x', 1_000)).toBe(true);
  });
});

describe('daily document-read cap', () => {
  it('refuses paid calls with a generic 503 once the cap is spent', async () => {
    const app = build({ extractDailyCap: 2 });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const codes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await req(app, '/api/extract-tax', { body: { base64: 'dGVzdA==' }, headers: { 'X-Real-IP': `203.0.113.${20 + i}` } });
      codes.push(res.status);
      if (res.status === 503) expect((await res.json() as Record<string, string>).code).toBe('temporarily_unavailable');
    }
    expect(codes).toEqual([200, 200, 503]);
    expect(reader).toHaveBeenCalledTimes(2);
  });

  it('counts each fallback attempt', async () => {
    const store = new MemoryStore();
    const budget = new DailyBudget(store, 3);
    expect(await budget.take()).toBe(true);
    expect(await budget.take()).toBe(true);
    expect(await budget.take()).toBe(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await budget.take()).toBe(false);
  });
});

describe('concurrency gate', () => {
  it('caps in-flight work globally and per client, and releases', () => {
    const gate = new ConcurrencyGate(2, 1);
    const a = gate.tryAcquire('a');
    expect(a).not.toBeNull();
    expect(gate.tryAcquire('a')).toBeNull();
    const b = gate.tryAcquire('b');
    expect(b).not.toBeNull();
    expect(gate.tryAcquire('c')).toBeNull();
    a!();
    a!(); // double release is harmless
    expect(gate.inFlight).toBe(1);
    expect(gate.tryAcquire('c')).not.toBeNull();
  });

  it('rejects a second simultaneous paid request from the same client', async () => {
    let release!: () => void;
    reader.mockImplementation(() => new Promise((r) => { release = () => r({ currentValue: 100000 }); }));
    const app = build();
    const first = req(app, '/api/extract-tax', { body: { base64: 'dGVzdA==' }, headers: { 'X-Real-IP': '203.0.113.30' } });
    await new Promise((r) => setTimeout(r, 10));
    const second = await req(app, '/api/extract-tax', { body: { base64: 'dGVzdA==' }, headers: { 'X-Real-IP': '203.0.113.30' } });
    expect(second.status).toBe(429);
    expect((await second.json() as Record<string, string>).code).toBe('busy');
    release();
    expect((await first).status).toBe(200);
  });
});

describe('bot challenge sessions', () => {
  const okVerifier = vi.fn(async () => ({ ok: true }));
  const badVerifier = vi.fn(async () => ({ ok: false, codes: ['invalid-input-response'] }));

  it('paid routes require a session when Turnstile is configured', async () => {
    const app = build({ turnstile: okVerifier, sessionSecret: 's'.repeat(32) });
    const res = await req(app, '/api/extract-tax', { body: { base64: 'dGVzdA==' } });
    expect(res.status).toBe(401);
    expect((await res.json() as Record<string, string>).code).toBe('session_required');
    expect(reader).not.toHaveBeenCalled();
  });

  it('issues a session for a valid challenge and accepts it', async () => {
    const app = build({ turnstile: okVerifier, sessionSecret: 's'.repeat(32) });
    const s = await req(app, '/api/session', { body: { turnstileToken: 'tok' }, headers: { 'X-Real-IP': '203.0.113.40' } });
    expect(s.status).toBe(200);
    const { token, challenge } = await s.json() as { token: string; challenge: boolean };
    expect(challenge).toBe(true);
    expect(okVerifier).toHaveBeenCalledWith('tok', '203.0.113.40', expect.any(String));
    const res = await req(app, '/api/extract-tax', { body: { base64: 'dGVzdA==' }, headers: { Authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
  });

  it('refuses a session when the challenge fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const app = build({ turnstile: badVerifier });
    expect((await req(app, '/api/session', { body: { turnstileToken: 'tok' } })).status).toBe(403);
    expect((await req(app, '/api/session', { body: {} })).status).toBe(400);
  });

  it('meters quota per session even across IPs', async () => {
    const app = build({ turnstile: okVerifier });
    const { token } = await (await req(app, '/api/session', { body: { turnstileToken: 'tok' } })).json() as { token: string };
    const codes: number[] = [];
    for (let i = 0; i < 9; i++) {
      codes.push((await req(app, '/api/extract-tax', { body: { base64: 'dGVzdA==' }, headers: { Authorization: `Bearer ${token}`, 'X-Real-IP': `203.0.113.${50 + i}` } })).status);
    }
    expect(codes.slice(0, 8).every((c) => c === 200)).toBe(true);
    expect(codes[8]).toBe(429);
  });

  it('rejects tampered and expired session tokens', () => {
    let now = 0;
    const signer = new SessionSigner('k'.repeat(32), () => now);
    const { token } = signer.issue();
    expect(signer.verify(token)).not.toBeNull();
    expect(signer.verify(token.slice(0, -2) + 'AA')).toBeNull();
    expect(signer.verify(token + '.x')).toBeNull();
    expect(new SessionSigner('j'.repeat(32), () => now).verify(token)).toBeNull();
    now = 31 * 60_000;
    expect(signer.verify(token)).toBeNull();
  });

  it('refuses a short session secret', () => {
    expect(() => new SessionSigner('short')).toThrow();
  });
});

describe('redact', () => {
  it('removes keys, bearer tokens and URL credentials from log text', () => {
    const s = redact('<ak-f8d45du41r4i11auq8r1> key sk-or-v1-0123456789abcdef Bearer abc.def AIzaSyA1234567890123456789012 https://u:p@host/x?api_key=zzz');
    expect(s).not.toMatch(/0123456789abcdef|abc\.def|AIzaSy|u:p@|zzz|f8d45du41r/);
  });
});
