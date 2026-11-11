import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApp } from './app';
import { ExtractorError, httpExtractor, type Extractor } from './extractor';
import type { VisionProvider } from './providers/types';

const vision: VisionProvider = { name: 'v', extract: vi.fn() };
let ip = 0;

function app(extractor: Extractor) {
  return createApp({ visionProviders: [vision], extractor, allowedOrigins: ['http://localhost:5173'], aiDailyCallCap: 0 });
}

function post(a: ReturnType<typeof app>, path: string, body: unknown) {
  ip += 1;
  return a.fetch(new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Real-IP': `192.0.2.${ip % 250}` },
    body: JSON.stringify(body),
  }));
}

const PDF_B64 = Buffer.from('%PDF-1.4 test').toString('base64');

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('document reading through the extractor (no AI)', () => {
  it('sends the original bytes and returns validated fields; never calls AI', async () => {
    const ex = vi.fn<Extractor>(async () => ({ currentValue: 300000, priorValue: '240,000', county: 'Tarrant County', taxYear: 2026, junk: '<b>' }));
    const res = await post(app(ex), '/api/extract-tax', { base64: PDF_B64, mimeType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ currentValue: 300000, priorValue: 240000, county: 'Tarrant County' });
    expect(ex).toHaveBeenCalledWith('tax', expect.any(Buffer));
    expect(Buffer.from(ex.mock.calls[0][1]).toString()).toBe('%PDF-1.4 test');
    expect(vision.extract).not.toHaveBeenCalled();
  });

  it('maps a not-a-document answer to the fixed wrong-document message', async () => {
    const res = await post(app(async () => ({ error: 'not_an_insurance_document' })), '/api/extract-insurance', { base64: PDF_B64, mimeType: 'application/pdf' });
    expect(res.status).toBe(422);
    expect((await res.json() as Record<string, string>).code).toBe('not_an_insurance_document');
  });

  it('turns reader failures into friendly codes without leaking detail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const cases: Array<[number, number, string]> = [[504, 503, 'reader_unavailable'], [415, 415, 'unsupported_media_type'], [422, 422, 'unreadable_document'], [502, 503, 'reader_unavailable']];
    for (const [upstream, status, code] of cases) {
      const res = await post(app(async () => { throw new ExtractorError(upstream, 'x'); }), '/api/extract-tax', { base64: PDF_B64, mimeType: 'application/pdf' });
      expect(res.status).toBe(status);
      const body = await res.json() as Record<string, string>;
      expect(body.code).toBe(code);
      expect(JSON.stringify(body)).not.toMatch(/extractor|x"/);
    }
  });
});

describe('httpExtractor', () => {
  it('posts raw bytes with the token to /extract/<kind>', async () => {
    const fetchMock = vi.fn(async () => Response.json({ annualPremium: 1200 }));
    vi.stubGlobal('fetch', fetchMock);
    const out = await httpExtractor('http://extractor.railway.internal:8080/', 'tok')('insurance', Buffer.from('abc'));
    expect(out).toEqual({ annualPremium: 1200 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://extractor.railway.internal:8080/extract/insurance');
    expect((init.headers as Record<string, string>)['X-Extractor-Token']).toBe('tok');
  });

  it('raises ExtractorError with the upstream status and code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: 'busy' }, { status: 503 })));
    await expect(httpExtractor('http://x', undefined)('tax', Buffer.from('a'))).rejects.toMatchObject({ status: 503, code: 'busy' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await expect(httpExtractor('http://x', undefined)('tax', Buffer.from('a'))).rejects.toMatchObject({ status: 502, code: 'unreachable' });
  });
});
