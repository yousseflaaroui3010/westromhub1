import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TextProvider, VisionProvider } from './providers/types';
import { createApp } from './app';

// --- Mock providers ---

const mockTextProvider: TextProvider = {
  name: 'mock-text',
  generate: vi.fn(),
};

const mockVisionProvider: VisionProvider = {
  name: 'mock-vision',
  extract: vi.fn(),
};

// Build app once — tests manipulate mock return values per test
const app = createApp(
  [mockTextProvider],
  [mockVisionProvider],
  ['http://localhost:5173'],
);

// Helper: make a JSON POST request to the app
function post(path: string, body: unknown) {
  return app.fetch(
    new Request(`http://localhost${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------

describe('GET /health', () => {
  it('returns 200 with { status: ok }', async () => {
    const res = await app.fetch(new Request('http://localhost/health'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });
});

// ---------------------------------------------------------------------------

describe('POST /api/extract-tax', () => {
  it('returns 400 when base64 field is missing', async () => {
    const res = await post('/api/extract-tax', {});
    expect(res.status).toBe(400);
  });

  it('returns 400 when base64 is empty string', async () => {
    const res = await post('/api/extract-tax', { base64: '' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for non-JSON body', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/extract-tax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
    );
    expect(res.status).toBe(400);
  });

  it('returns 200 with extracted JSON on provider success', async () => {
    vi.mocked(mockVisionProvider.extract).mockResolvedValue(
      '{"address": "123 Main St", "currentValue": 100000, "priorValue": 90000}',
    );
    const res = await post('/api/extract-tax', { base64: 'dGVzdA==', mimeType: 'image/png' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ address: '123 Main St', currentValue: 100000 });
  });

  it('strips markdown fences and returns 200 (BUG-3 regression)', async () => {
    vi.mocked(mockVisionProvider.extract).mockResolvedValue(
      '```json\n{"address": "456 Oak Ave", "currentValue": 200000}\n```',
    );
    const res = await post('/api/extract-tax', { base64: 'dGVzdA==' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ address: '456 Oak Ave', currentValue: 200000 });
  });

  it('returns 422 when provider returns unparseable text', async () => {
    vi.mocked(mockVisionProvider.extract).mockResolvedValue('This is not JSON at all!');
    const res = await post('/api/extract-tax', { base64: 'dGVzdA==' });
    expect(res.status).toBe(422);
  });

  it('returns 503 when all providers fail', async () => {
    vi.mocked(mockVisionProvider.extract).mockRejectedValue(new Error('Ollama timeout'));
    const res = await post('/api/extract-tax', { base64: 'dGVzdA==' });
    expect(res.status).toBe(503);
  });

  it('defaults mimeType to image/png when not supplied', async () => {
    vi.mocked(mockVisionProvider.extract).mockResolvedValue('{"address": "789 Pine Rd"}');
    await post('/api/extract-tax', { base64: 'dGVzdA==' }); // no mimeType
    expect(mockVisionProvider.extract).toHaveBeenCalledWith(
      expect.any(String),
      'dGVzdA==',
      'image/png',
    );
  });

  it('returns 400 for unsupported mimeType (SEC-3 / Bug-1b regression)', async () => {
    const res = await post('/api/extract-tax', { base64: 'dGVzdA==', mimeType: 'text/csv' });
    expect(res.status).toBe(400);
    // Provider must NOT be called — rejected at the schema layer
    expect(mockVisionProvider.extract).not.toHaveBeenCalled();
  });

  it('returns 400 for video mimeType', async () => {
    const res = await post('/api/extract-tax', { base64: 'dGVzdA==', mimeType: 'video/mp4' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------

describe('POST /api/extract-insurance', () => {
  it('returns 400 when base64 is missing', async () => {
    const res = await post('/api/extract-insurance', {});
    expect(res.status).toBe(400);
  });

  it('returns 200 with extracted insurance data', async () => {
    vi.mocked(mockVisionProvider.extract).mockResolvedValue(
      '{"policyType": "DP-3", "annualPremium": 1500, "hasLossOfRent": true}',
    );
    const res = await post('/api/extract-insurance', { base64: 'dGVzdA==' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ policyType: 'DP-3', annualPremium: 1500 });
  });

  it('returns 503 when all providers fail', async () => {
    vi.mocked(mockVisionProvider.extract).mockRejectedValue(new Error('timeout'));
    const res = await post('/api/extract-insurance', { base64: 'dGVzdA==' });
    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------

describe('POST /api/recommend-tax', () => {
  const validBody = {
    analysisJson: '{"currentValue": 100000, "priorValue": 80000}',
    statusContext: 'PROTEST_RECOMMENDED',
    countyUrl: 'https://county.gov/portal',
  };

  it('returns 400 when statusContext is missing', async () => {
    const res = await post('/api/recommend-tax', {
      analysisJson: validBody.analysisJson,
      countyUrl: validBody.countyUrl,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when countyUrl is missing', async () => {
    const res = await post('/api/recommend-tax', {
      analysisJson: validBody.analysisJson,
      statusContext: validBody.statusContext,
    });
    expect(res.status).toBe(400);
  });

  it('returns 200 with recommendation string on success', async () => {
    vi.mocked(mockTextProvider.generate).mockResolvedValue('<p>Recommend protest filing.</p>');
    const res = await post('/api/recommend-tax', validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('recommendation', '<p>Recommend protest filing.</p>');
  });

  it('wraps analysisJson in DATA tags to prevent prompt injection (SEC-2)', async () => {
    vi.mocked(mockTextProvider.generate).mockResolvedValue('ok');
    await post('/api/recommend-tax', validBody);
    const [, userPrompt] = vi.mocked(mockTextProvider.generate).mock.calls[0]!;
    expect(userPrompt).toContain('<DATA>');
    expect(userPrompt).toContain('</DATA>');
  });

  it('returns 503 when all providers fail', async () => {
    vi.mocked(mockTextProvider.generate).mockRejectedValue(new Error('Groq down'));
    const res = await post('/api/recommend-tax', validBody);
    expect(res.status).toBe(503);
  });
});

// ---------------------------------------------------------------------------

describe('POST /api/recommend-insurance', () => {
  const validBody = {
    analysisJson: '{"policyType": "DP-3", "hasLossOfRent": true}',
    statusContext: 'GOOD_STANDING',
  };

  it('returns 400 when analysisJson is missing', async () => {
    const res = await post('/api/recommend-insurance', { statusContext: 'GOOD_STANDING' });
    expect(res.status).toBe(400);
  });

  it('returns 200 with recommendation on success', async () => {
    vi.mocked(mockTextProvider.generate).mockResolvedValue('<p>Policy looks solid.</p>');
    const res = await post('/api/recommend-insurance', validBody);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('recommendation');
  });
});

// ---------------------------------------------------------------------------

describe('CORS middleware', () => {
  it('returns 403 for unknown origin', async () => {
    const res = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'https://evil.example.com' },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('allows requests from a known origin', async () => {
    const res = await app.fetch(
      new Request('http://localhost/health', {
        headers: { Origin: 'http://localhost:5173' },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
  });

  it('handles OPTIONS preflight and returns 204', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/extract-tax', {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:5173' },
      }),
    );
    expect(res.status).toBe(204);
  });
});
