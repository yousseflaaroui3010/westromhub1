import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { z } from 'zod';
import type { TextProvider, VisionProvider } from './providers/types';
import {
  TAX_EXTRACTION_PROMPT,
  TAX_VERIFICATION_PROMPT,
  INSURANCE_EXTRACTION_PROMPT,
  INSURANCE_VERIFICATION_PROMPT,
  TAX_SYSTEM_INSTRUCTION,
  INSURANCE_SYSTEM_INSTRUCTION,
} from './prompts';
import { withFallback } from './providers';
import type { CadLookupFn } from './adapters/types';

// --- Request schemas (SEC-3) ---

// PDFs are converted to image/png on the client before reaching this API,
// so application/pdf is intentionally absent from this server-side allowlist.
const EXTRACT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const ExtractBodySchema = z.object({
  base64: z.string().min(1).max(10_000_000, 'base64 payload exceeds 10 MB limit'),
  mimeType: z.enum(EXTRACT_ALLOWED_MIME_TYPES).default('image/png'),
});

const RecommendTaxBodySchema = z.object({
  analysisJson: z.string().min(1).max(50_000),
  statusContext: z.string().min(1).max(2_000),
  countyUrl: z.string().min(1).max(500), // .url() deprecated in Zod 4, validated client-side
});

const RecommendInsuranceBodySchema = z.object({
  analysisJson: z.string().min(1).max(50_000),
  statusContext: z.string().min(1).max(2_000),
});

const PropertyLookupQuerySchema = z.object({
  address: z.string().min(5).max(500),
  county: z.string().min(1).max(100),
});

// Minimal shape of the ATTOM assessment/detail response — only the fields we need.
const AttomResponseSchema = z.object({
  property: z.array(z.object({
    assessment: z.object({
      assessed: z.object({
        assdttlvalue: z.number().nullable().optional(),
      }).optional(),
      tax: z.object({
        taxyear: z.number().nullable().optional(),
      }).optional(),
    }).optional(),
  })).optional(),
}).passthrough();

// --- Helpers ---

// BUG-3: Strip markdown code fences Ollama sometimes wraps JSON output in.
function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim();
}

// Split "123 Main St, Fort Worth, TX 76102" → address1 + address2 for ATTOM.
function splitAddress(combined: string): { address1: string; address2: string } {
  const commaIdx = combined.indexOf(',');
  if (commaIdx === -1) return { address1: combined.trim(), address2: '' };
  return {
    address1: combined.substring(0, commaIdx).trim(),
    address2: combined.substring(commaIdx + 1).trim(),
  };
}

// --- ATTOM property lookup helper ---
// Calls the ATTOM assessment/detail endpoint and returns the most recent assessed
// total value, or null on any failure. All failure modes (quota exhausted, address
// not found, network error, bad key) return null so the frontend falls back to
// manual entry without blocking the user.
async function fetchAttomPriorValue(
  address: string,
  apiKey: string,
): Promise<{ priorValue: number; taxYear: number | null } | null> {
  const { address1, address2 } = splitAddress(address);
  if (!address1) return null;

  const url = new URL('https://api.gateway.attomdata.com/propertyapi/v1.0.0/assessment/detail');
  url.searchParams.set('address1', address1);
  if (address2) url.searchParams.set('address2', address2);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { apikey: apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    return null; // Network error or timeout
  }

  // 429/402/403 = quota exhausted or bad key — graceful degradation, not an error
  if (!res.ok) return null;

  let json: unknown;
  try { json = await res.json(); } catch { return null; }

  const parsed = AttomResponseSchema.safeParse(json);
  if (!parsed.success) return null;

  const prop = parsed.data.property?.[0];
  const priorValue = prop?.assessment?.assessed?.assdttlvalue ?? null;
  const taxYear = prop?.assessment?.tax?.taxyear ?? null;
  if (priorValue === null) return null;
  return { priorValue, taxYear };
}

// --- App factory ---
// Accepts providers as arguments so tests can inject mocks without env vars.
// cadLookupFn: injected in production; leave undefined in tests to use the
// legacy ATTOM-only path (existing tests continue to work unchanged).

export function createApp(
  textProviders: TextProvider[],
  visionProviders: VisionProvider[],
  allowedOriginsList: string[] = ['http://localhost:3000', 'http://localhost:5173'],
  attomApiKey?: string,
  cadLookupFn?: CadLookupFn,
): Hono {
  const app = new Hono();

  // SEC-1: CORS — allow only explicitly configured origins, never wildcard
  app.use('*', async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');

    if (origin && !allowedOriginsList.includes(origin)) {
      return c.json({ error: 'Not allowed by CORS' }, 403);
    }

    if (c.req.method === 'OPTIONS') {
      if (origin) {
        c.header('Access-Control-Allow-Origin', origin);
        c.header('Vary', 'Origin');
        c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        c.header('Access-Control-Allow-Headers', 'Content-Type');
      }
      return c.body(null, 204);
    }

    if (origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    }

    return next();
  });

  // Simple in-memory rate limiter — 100 req per 15 min per IP (resets on restart).
  const ipHits = new Map<string, { count: number; resetAt: number }>();
  const RATE_MAX = 100;
  const RATE_WINDOW_MS = 15 * 60 * 1000;

  app.use('/api/*', async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const now = Date.now();
    const rec = ipHits.get(ip);

    if (!rec || rec.resetAt < now) {
      ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else if (rec.count >= RATE_MAX) {
      return c.json({ error: 'Too many requests, please try again later.' }, 429);
    } else {
      rec.count++;
    }

    return next();
  });

  // --- Endpoints ---

  app.get('/health', (c: Context) => c.json({ status: 'ok' }));

  // --- Property lookup ---
  // Returns both current-year and prior-year assessed values for a property.
  //
  // Response shape (all fields always present):
  //   { currentYear, currentValue, priorYear, priorValue, source, county }
  //   currentValue / currentYear are null when only ATTOM data is available.
  //
  // Priority: CAD scraper (via cadLookupFn) → ATTOM legacy path → not_found.
  app.get('/api/property-lookup', async (c: Context) => {
    const query = {
      address: c.req.query('address') ?? '',
      county: c.req.query('county') ?? '',
    };
    const parsed = PropertyLookupQuerySchema.safeParse(query);
    if (!parsed.success) {
      return c.json({ error: 'address (min 5 chars) and county are required' }, 400);
    }

    const { address, county } = parsed.data;
    const notFound = {
      currentYear: null, currentValue: null,
      priorYear: null, priorValue: null,
      source: 'not_found', county,
    };

    // Production path: full CAD → ATTOM dispatcher
    if (cadLookupFn) {
      let cadResult;
      try {
        cadResult = await cadLookupFn(address, county);
      } catch (err) {
        console.error('[property-lookup] cadLookupFn threw:', err);
        cadResult = null;
      }

      if (cadResult === null) {
        return c.json(notFound);
      }

      // currentValue === 0 is the sentinel from attom.ts meaning "prior year only"
      const isAttomPartial = cadResult.currentValue === 0;
      return c.json({
        currentYear: isAttomPartial ? null : cadResult.currentYear,
        currentValue: isAttomPartial ? null : cadResult.currentValue,
        priorYear: cadResult.priorYear,
        priorValue: cadResult.priorValue,
        source: isAttomPartial ? 'attom' : detectSource(county),
        county,
      });
    }

    // Legacy test path: ATTOM only (cadLookupFn not injected)
    if (!attomApiKey) {
      return c.json(notFound);
    }

    let attomResult: { priorValue: number; taxYear: number | null } | null;
    try {
      attomResult = await fetchAttomPriorValue(address, attomApiKey);
    } catch (err) {
      console.error('[property-lookup] ATTOM error:', err);
      return c.json(notFound);
    }

    if (attomResult === null) {
      return c.json(notFound);
    }

    return c.json({
      currentYear: null,
      currentValue: null,
      priorYear: attomResult.taxYear,
      priorValue: attomResult.priorValue,
      source: 'attom',
      county,
    });
  });

  function detectSource(county: string): string {
    const lower = county.toLowerCase();
    if (lower.includes('tarrant')) return 'tad';
    if (lower.includes('dallas')) return 'dcad';
    return 'cad';
  }

  app.post('/api/extract-tax', async (c: Context) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = ExtractBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
    }
    const { base64, mimeType } = parsed.data;

    try {
      const content = await withFallback(
        visionProviders.map((p) => () => p.extract(TAX_EXTRACTION_PROMPT, base64, mimeType)),
        'extract-tax',
      );

      let extractedData: Record<string, unknown>;
      try {
        extractedData = JSON.parse(cleanJsonResponse(content));
      } catch {
        return c.json({ error: 'AI returned an unreadable response. Please try again.' }, 422);
      }

      if (extractedData.error) {
        return c.json(extractedData);
      }

      try {
        const verificationPrompt = TAX_VERIFICATION_PROMPT.replace(
          '{extractedJson}',
          JSON.stringify(extractedData, null, 2),
        );
        const verifiedContent = await withFallback(
          visionProviders.map((p) => () => p.extract(verificationPrompt, base64, mimeType)),
          'verify-tax',
        );

        let verifiedData: unknown;
        try {
          verifiedData = JSON.parse(cleanJsonResponse(verifiedContent));
        } catch {
          return c.json(extractedData);
        }

        const verified = verifiedData as Record<string, unknown>;
        if (verified.error) {
          return c.json(verified);
        }

        return c.json(verified);
      } catch {
        return c.json(extractedData);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      return c.json({ error: message }, 503);
    }
  });

  app.post('/api/extract-insurance', async (c: Context) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = ExtractBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
    }
    const { base64, mimeType } = parsed.data;

    try {
      const content = await withFallback(
        visionProviders.map((p) => () => p.extract(INSURANCE_EXTRACTION_PROMPT, base64, mimeType)),
        'extract-insurance',
      );

      let extractedData: Record<string, unknown>;
      try {
        extractedData = JSON.parse(cleanJsonResponse(content));
      } catch {
        return c.json({ error: 'AI returned an unreadable response. Please try again.' }, 422);
      }

      if (extractedData.error) {
        return c.json(extractedData);
      }

      try {
        const verificationPrompt = INSURANCE_VERIFICATION_PROMPT.replace(
          '{extractedJson}',
          JSON.stringify(extractedData, null, 2),
        );
        const verifiedContent = await withFallback(
          visionProviders.map((p) => () => p.extract(verificationPrompt, base64, mimeType)),
          'verify-insurance',
        );

        let verifiedData: unknown;
        try {
          verifiedData = JSON.parse(cleanJsonResponse(verifiedContent));
        } catch {
          return c.json(extractedData);
        }

        const verified = verifiedData as Record<string, unknown>;
        if (verified.error) {
          return c.json(verified);
        }

        return c.json(verified);
      } catch {
        return c.json(extractedData);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Extraction failed';
      return c.json({ error: message }, 503);
    }
  });

  app.post('/api/recommend-tax', async (c: Context) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = RecommendTaxBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
    }
    const { analysisJson, statusContext, countyUrl } = parsed.data;

    try {
      // SEC-2: Wrap untrusted client data in XML delimiters (prompt injection guard).
      const userPrompt = `Generate a recommendation for this property owner.\n<DATA>\n${analysisJson}\n</DATA>\nCOUNTY PORTAL: ${countyUrl}\nSTATUS CONTEXT: ${statusContext}`;

      const content = await withFallback(
        textProviders.map((p) => () => p.generate(TAX_SYSTEM_INSTRUCTION, userPrompt)),
        'recommend-tax',
      );

      return c.json({ recommendation: content });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Recommendation failed';
      return c.json({ error: message }, 503);
    }
  });

  app.post('/api/recommend-insurance', async (c: Context) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const parsed = RecommendInsuranceBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, 400);
    }
    const { analysisJson, statusContext } = parsed.data;

    try {
      // SEC-2: Wrap untrusted client data in XML delimiters (prompt injection guard).
      const userPrompt = `Generate a recommendation for this property owner.\n<DATA>\n${analysisJson}\n</DATA>\nSTATUS CONTEXT: ${statusContext}`;

      const content = await withFallback(
        textProviders.map((p) => () => p.generate(INSURANCE_SYSTEM_INSTRUCTION, userPrompt)),
        'recommend-insurance',
      );

      return c.json({ recommendation: content });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Recommendation failed';
      return c.json({ error: message }, 503);
    }
  });

  // Sprint 6b: OpenAPI spec and Swagger UI
  app.get('/api/openapi.json', (c: Context) => {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'Westrom Hub API',
        version: '1.0.0',
        description: 'AI-powered property tax and insurance analysis API',
      },
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            responses: { '200': { description: 'Server is healthy' } },
          },
        },
        '/api/extract-tax': {
          post: {
            summary: 'Extract property tax data from a document image',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['base64'],
                    properties: {
                      base64: { type: 'string', description: 'Base64-encoded document image' },
                      mimeType: { type: 'string', enum: [...EXTRACT_ALLOWED_MIME_TYPES], default: 'image/png' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Extracted tax data as JSON' },
              '400': { description: 'Invalid request body' },
              '422': { description: 'AI returned unparseable response' },
              '503': { description: 'All AI providers unavailable' },
            },
          },
        },
        '/api/extract-insurance': {
          post: {
            summary: 'Extract insurance policy data from a declaration page image',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['base64'],
                    properties: {
                      base64: { type: 'string', description: 'Base64-encoded document image' },
                      mimeType: { type: 'string', enum: [...EXTRACT_ALLOWED_MIME_TYPES], default: 'image/png' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: 'Extracted insurance data as JSON' },
              '400': { description: 'Invalid request body' },
              '422': { description: 'AI returned unparseable response' },
              '503': { description: 'All AI providers unavailable' },
            },
          },
        },
        '/api/recommend-tax': {
          post: {
            summary: 'Generate a natural-language tax recommendation',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['analysisJson', 'statusContext', 'countyUrl'],
                    properties: {
                      analysisJson: { type: 'string' },
                      statusContext: { type: 'string' },
                      countyUrl: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: '{ recommendation: string }' },
              '400': { description: 'Invalid request body' },
              '503': { description: 'All AI providers unavailable' },
            },
          },
        },
        '/api/recommend-insurance': {
          post: {
            summary: 'Generate a natural-language insurance recommendation',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['analysisJson', 'statusContext'],
                    properties: {
                      analysisJson: { type: 'string' },
                      statusContext: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              '200': { description: '{ recommendation: string }' },
              '400': { description: 'Invalid request body' },
              '503': { description: 'All AI providers unavailable' },
            },
          },
        },
      },
    };
    return c.json(spec);
  });

  // Sprint 6b: Swagger UI served from CDN (no extra dependency)
  app.get('/api/docs', (c: Context) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Westrom Hub API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api/openapi.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset] });
  </script>
</body>
</html>`;
    return c.html(html);
  });

  return app;
}
