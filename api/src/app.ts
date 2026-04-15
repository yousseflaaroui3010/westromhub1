import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { z } from 'zod';
import type { TextProvider, VisionProvider } from './providers/types';
import {
  TAX_EXTRACTION_PROMPT,
  INSURANCE_EXTRACTION_PROMPT,
  TAX_SYSTEM_INSTRUCTION,
  INSURANCE_SYSTEM_INSTRUCTION,
} from './prompts';
import { withFallback } from './providers';

// --- Request schemas (SEC-3) ---

const ExtractBodySchema = z.object({
  base64: z.string().min(1).max(10_000_000, 'base64 payload exceeds 10 MB limit'),
  // mimeType forwarded by client — needed by OpenRouter vision fallback provider
  mimeType: z.string().min(1).max(100).optional().default('image/png'),
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

// --- Helpers ---

// BUG-3: Strip markdown code fences Ollama sometimes wraps JSON output in.
function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim();
}

// --- App factory ---
// Accepts providers as arguments so tests can inject mocks without env vars.

export function createApp(
  textProviders: TextProvider[],
  visionProviders: VisionProvider[],
  allowedOriginsList: string[] = ['http://localhost:3000', 'http://localhost:5173'],
  ollamaBaseUrl: string = 'http://localhost:11434',
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

      let ollamaData: unknown;
      try {
        ollamaData = JSON.parse(cleanJsonResponse(content));
      } catch {
        return c.json({ error: 'AI returned an unreadable response. Please try again.' }, 422);
      }

      return c.json(ollamaData);
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

      let ollamaData: unknown;
      try {
        ollamaData = JSON.parse(cleanJsonResponse(content));
      } catch {
        return c.json({ error: 'AI returned an unreadable response. Please try again.' }, 422);
      }

      return c.json(ollamaData);
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

  app.get('/api/tags', async (c: Context) => {
    try {
      const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        throw new Error('Failed to fetch from Ollama');
      }
      const data = await response.json();
      return c.json(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ollama unreachable';
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
                      mimeType: { type: 'string', default: 'image/png' },
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
                      mimeType: { type: 'string', default: 'image/png' },
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
        '/api/tags': {
          get: {
            summary: 'List available Ollama models',
            responses: {
              '200': { description: 'Ollama model list' },
              '503': { description: 'Ollama unreachable' },
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
