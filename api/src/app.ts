import { Hono } from 'hono';
import type { Context, MiddlewareHandler, Next } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { TextProvider, VisionProvider } from './providers/types';
import {
  TAX_EXTRACTION_PROMPT,
  INSURANCE_EXTRACTION_PROMPT,
  TAX_SYSTEM_INSTRUCTION,
  INSURANCE_SYSTEM_INSTRUCTION,
} from './prompts';
import { StopFallback, withFallback } from './providers';
import type { CadLookupFn } from './adapters/types';
import {
  COUNTY_PORTALS,
  ExtractBodySchema,
  PropertyLookupQuerySchema,
  RecommendInsuranceBodySchema,
  RecommendTaxBodySchema,
  parseInsuranceExtraction,
  parseTaxExtraction,
  sanitizeRecommendation,
} from './domain/schemas';
import {
  getInsuranceStatusExplanation,
  getStatusExplanation,
  runInsuranceRuleEngine,
  runRuleEngine,
} from './domain/ruleEngine';
import { apiError, logFailure, requestId } from './http/errors';
import { MemoryStore, type CounterStore } from './security/store';
import { ConcurrencyGate, DailyBudget, concurrencyLimit, rateLimit } from './security/limits';
import { SessionSigner, requireSession, sessionIdOf, type TurnstileVerifier } from './security/session';
import { getClientIp, requireInternalProxy } from './security/clientIp';
import { leadRoutes, type LeadGatewayConfig } from './routes/leads';

export interface AppOptions {
  textProviders: TextProvider[];
  visionProviders: VisionProvider[];
  /** Origins allowed to call the analysis API from a browser. */
  allowedOrigins?: string[];
  /** Origins allowed to call /api/leads/* (the embeddable form). */
  leadAllowedOrigins?: string[];
  cadLookupFn?: CadLookupFn;
  store?: CounterStore;
  /** Must match nginx's INTERNAL_PROXY_TOKEN. Unset = not enforced. */
  internalProxyToken?: string;
  /** Cloudflare Turnstile verifier. When set, paid routes require a session. */
  turnstile?: TurnstileVerifier | null;
  sessionSecret?: string;
  /** Max billable provider attempts per UTC day. 0 disables (tests only). */
  aiDailyCallCap?: number;
  aiMaxConcurrency?: number;
  leadGateway?: LeadGatewayConfig | null;
  exposeApiDocs?: boolean;
}

const DEFAULT_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim();
}

function requireJson(): MiddlewareHandler {
  return async (c, next) => {
    const ct = (c.req.header('content-type') ?? '').toLowerCase();
    if (!ct.startsWith('application/json')) {
      return apiError(c, 415, 'unsupported_media_type', 'Content-Type must be application/json.');
    }
    return next();
  };
}

async function readJson(c: Context): Promise<{ ok: true; body: unknown } | { ok: false }> {
  try {
    return { ok: true, body: await c.req.json() };
  } catch {
    return { ok: false };
  }
}

export function createApp(opts: AppOptions): Hono {
  const {
    textProviders,
    visionProviders,
    allowedOrigins = DEFAULT_ORIGINS,
    cadLookupFn,
    internalProxyToken,
    turnstile = null,
    exposeApiDocs = false,
  } = opts;
  const leadOrigins = Array.from(new Set([...(opts.leadAllowedOrigins ?? []), ...allowedOrigins]));
  const store = opts.store ?? new MemoryStore();
  const budget = new DailyBudget(store, opts.aiDailyCallCap ?? 400);
  const gate = new ConcurrencyGate(opts.aiMaxConcurrency ?? 4, 1);
  const signer = new SessionSigner(opts.sessionSecret);
  const sessionRequired = !!turnstile;

  const app = new Hono();

  app.use('*', requestId());

  // Last-resort handler: never leak an exception message or stack.
  app.onError((err, c) => {
    logFailure(c, 'unhandled', err);
    return apiError(c, 500, 'internal_error', 'Something went wrong. Please try again.');
  });
  app.notFound((c) => apiError(c, 404, 'not_found', 'Not found.'));

  // --- CORS ---------------------------------------------------------------
  // Same-origin browser requests from wgcassetguide.com carry an allowed
  // Origin (nginx no longer strips it). /api/leads/* additionally allows the
  // sites that embed the form. CORS is browser policy, not authentication;
  // the internal-proxy check and limits below are what stop scripts.
  app.use('*', async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');
    const list = c.req.path.startsWith('/api/leads/') ? leadOrigins : allowedOrigins;

    if (origin && !list.includes(origin)) {
      return apiError(c, 403, 'origin_not_allowed', 'Not allowed by CORS');
    }
    if (origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    }
    if (c.req.method === 'OPTIONS') {
      if (origin) {
        c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        c.header('Access-Control-Max-Age', '600');
      }
      return c.body(null, 204);
    }
    return next();
  });

  // Defensive response headers for the JSON API.
  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Cache-Control', c.res.headers.get('Cache-Control') ?? 'no-store');
  });

  app.get('/health', (c: Context) => c.json({ status: 'ok' }));

  // Everything under /api must have come through our nginx.
  app.use('/api/*', requireInternalProxy(internalProxyToken));

  // Coarse per-IP ceiling across all API routes (route limits are tighter).
  app.use('/api/*', rateLimit(store, { name: 'api', max: 120, windowMs: 15 * 60_000 }));

  // --- Session (bot challenge) ---------------------------------------------
  app.post(
    '/api/session',
    bodyLimit({ maxSize: 4 * 1024, onError: (c) => apiError(c, 413, 'payload_too_large', 'Request too large.') }),
    requireJson(),
    rateLimit(store, { name: 'session', max: 10, windowMs: 10 * 60_000 }),
    async (c) => {
      if (!turnstile) {
        // Challenge not configured: still issue sessions so per-session quotas
        // apply and the frontend flow is identical in every environment.
        const s = signer.issue();
        return c.json({ token: s.token, expiresAt: s.expiresAt, challenge: false });
      }
      const parsed = await readJson(c);
      const token = parsed.ok && parsed.body && typeof (parsed.body as { turnstileToken?: unknown }).turnstileToken === 'string'
        ? (parsed.body as { turnstileToken: string }).turnstileToken
        : '';
      if (!token || token.length > 2_048) {
        return apiError(c, 400, 'challenge_required', 'Please complete the verification and try again.');
      }
      const s = signer.issue();
      const v = await turnstile(token, getClientIp(c), s.sessionId);
      if (!v.ok) {
        console.warn(`[session] turnstile rejected codes=${(v.codes ?? []).join(',')}`);
        return apiError(c, 403, 'challenge_failed', 'Verification failed. Please refresh the page and try again.');
      }
      return c.json({ token: s.token, expiresAt: s.expiresAt, challenge: true });
    },
  );

  // --- Paid AI routes ------------------------------------------------------
  const sessionKey = (c: Context) => sessionIdOf(c);
  const paid = (perSessionMax: number, name: string): MiddlewareHandler[] => [
    bodyLimit({ maxSize: 10.5 * 1024 * 1024, onError: (c) => apiError(c, 413, 'payload_too_large', 'That file is too large. Please upload a file under 7 MB.') }),
    requireJson(),
    requireSession(signer, sessionRequired),
    rateLimit(store, { name: `${name}-ip`, max: 20, windowMs: 60 * 60_000 }),
    rateLimit(store, { name: `${name}-session`, max: perSessionMax, windowMs: 30 * 60_000, key: sessionKey }),
    concurrencyLimit(gate),
  ];

  // Each provider ATTEMPT spends budget, so fallbacks are metered too.
  const metered = <T>(fns: Array<() => Promise<T>>) =>
    fns.map((fn) => async () => {
      if (!(await budget.take())) throw new StopFallback('budget_exhausted');
      return fn();
    });

  function providerFailure(c: Context, label: string, err: unknown) {
    if (err instanceof StopFallback && err.code === 'budget_exhausted') {
      return apiError(c, 503, 'temporarily_unavailable', 'Document analysis is temporarily unavailable. Please try again later or enter your values manually.');
    }
    logFailure(c, label, err);
    const message = label.startsWith('extract')
      ? 'Our document reader is unavailable right now. Please try again shortly or enter your values manually.'
      : 'Personalized recommendations are unavailable right now. Your results above are still accurate.';
    return apiError(c, 503, 'ai_unavailable', message);
  }

  async function runExtraction(c: Context, label: string, prompt: string) {
    const body = await readJson(c);
    if (!body.ok) return apiError(c, 400, 'invalid_json', 'Invalid JSON body.');
    const parsed = ExtractBodySchema.safeParse(body.body);
    if (!parsed.success) {
      return apiError(c, 400, 'invalid_request', parsed.error.issues[0]?.message ?? 'Invalid request.');
    }
    const { base64, mimeType } = parsed.data;
    let content: string;
    try {
      content = await withFallback(
        metered(visionProviders.map((p) => () => p.extract(prompt, base64, mimeType))),
        label,
      );
    } catch (err) {
      return providerFailure(c, label, err);
    }
    try {
      return { raw: JSON.parse(cleanJsonResponse(content)) as unknown };
    } catch {
      return apiError(c, 422, 'unreadable_response', 'We could not read that document. Please try again or enter your values manually.');
    }
  }

  app.use('/api/extract-tax', ...paid(8, 'extract'));
  app.post('/api/extract-tax', async (c) => {
    const r = await runExtraction(c, 'extract-tax', TAX_EXTRACTION_PROMPT);
    if (r instanceof Response) return r;
    const out = parseTaxExtraction(r.raw);
    if (out.kind === 'wrong_document') {
      return apiError(c, 422, 'not_a_tax_document', 'That does not look like a property tax or appraisal notice. Please upload your county appraisal notice.');
    }
    if (out.kind === 'empty') {
      return apiError(c, 422, 'no_values_found', 'We could not find appraisal values in that document. Please enter them manually.');
    }
    return c.json(out.data);
  });

  app.use('/api/extract-insurance', ...paid(8, 'extract'));
  app.post('/api/extract-insurance', async (c) => {
    const r = await runExtraction(c, 'extract-insurance', INSURANCE_EXTRACTION_PROMPT);
    if (r instanceof Response) return r;
    const out = parseInsuranceExtraction(r.raw);
    if (out.kind === 'wrong_document') {
      return apiError(c, 422, 'not_an_insurance_document', 'That does not look like an insurance declarations page. Please upload your policy declarations.');
    }
    if (out.kind === 'empty') {
      return apiError(c, 422, 'no_values_found', 'We could not find policy details in that document. Please try a clearer copy.');
    }
    return c.json(out.data);
  });

  // Recommendations: the client sends typed values only. The status, its
  // explanation and the county portal are computed/looked up HERE, so nothing
  // client-authored reaches the prompt except numbers and short validated labels.
  app.use('/api/recommend-tax', ...paid(16, 'recommend'));
  app.post('/api/recommend-tax', async (c) => {
    const body = await readJson(c);
    if (!body.ok) return apiError(c, 400, 'invalid_json', 'Invalid JSON body.');
    const parsed = RecommendTaxBodySchema.safeParse(body.body);
    if (!parsed.success) return apiError(c, 400, 'invalid_request', 'Invalid analysis input.');
    const input = parsed.data;

    const result = runRuleEngine({ ...input });
    const analysis = {
      status: result.status,
      yoyIncreasePct: result.yoyIncreasePct,
      marketGapPct: result.marketGapPct,
      county: input.county,
      currentValue: input.currentValue ?? null,
      priorValue: input.priorValue ?? null,
      zillowValue: input.zillowValue ?? null,
      realtorValue: input.realtorValue ?? null,
    };
    const userPrompt = [
      'Generate a recommendation for this property owner.',
      '<DATA>',
      JSON.stringify(analysis),
      '</DATA>',
      `COUNTY PORTAL: ${COUNTY_PORTALS[input.county]}`,
      `STATUS CONTEXT: ${getStatusExplanation(result.status)}`,
    ].join('\n');

    try {
      const content = await withFallback(
        metered(textProviders.map((p) => () => p.generate(TAX_SYSTEM_INSTRUCTION, userPrompt))),
        'recommend-tax',
      );
      return c.json({ recommendation: sanitizeRecommendation(content), status: result.status });
    } catch (err) {
      return providerFailure(c, 'recommend-tax', err);
    }
  });

  app.use('/api/recommend-insurance', ...paid(16, 'recommend'));
  app.post('/api/recommend-insurance', async (c) => {
    const body = await readJson(c);
    if (!body.ok) return apiError(c, 400, 'invalid_json', 'Invalid JSON body.');
    const parsed = RecommendInsuranceBodySchema.safeParse(body.body);
    if (!parsed.success) return apiError(c, 400, 'invalid_request', 'Invalid analysis input.');

    const result = runInsuranceRuleEngine(parsed.data);
    const userPrompt = [
      'Generate a recommendation for this property owner.',
      '<DATA>',
      JSON.stringify(result),
      '</DATA>',
      `STATUS CONTEXT: ${getInsuranceStatusExplanation(result.status)}`,
    ].join('\n');

    try {
      const content = await withFallback(
        metered(textProviders.map((p) => () => p.generate(INSURANCE_SYSTEM_INSTRUCTION, userPrompt))),
        'recommend-insurance',
      );
      return c.json({ recommendation: sanitizeRecommendation(content), status: result.status });
    } catch (err) {
      return providerFailure(c, 'recommend-insurance', err);
    }
  });

  // --- Property lookup (free, but scrapes a county site per call) ----------
  app.get(
    '/api/property-lookup',
    rateLimit(store, { name: 'lookup', max: 15, windowMs: 15 * 60_000 }),
    async (c: Context) => {
      const parsed = PropertyLookupQuerySchema.safeParse({
        address: c.req.query('address') ?? '',
        county: c.req.query('county') ?? '',
      });
      if (!parsed.success) {
        return apiError(c, 400, 'invalid_request', 'address (min 5 chars) and county are required');
      }
      const { address, county } = parsed.data;
      const notFound = {
        currentYear: null, currentValue: null,
        priorYear: null, priorValue: null,
        source: 'not_found', county,
      };
      if (!cadLookupFn) return c.json(notFound);

      let cadResult;
      try {
        cadResult = await cadLookupFn(address, county);
      } catch (err) {
        logFailure(c, 'property-lookup', err);
        cadResult = null;
      }
      if (cadResult === null) return c.json(notFound);

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
    },
  );

  function detectSource(county: string): string {
    const lower = county.toLowerCase();
    if (lower.includes('tarrant')) return 'tad';
    if (lower.includes('dallas')) return 'dcad';
    return 'cad';
  }

  // --- Lead form gateway ----------------------------------------------------
  app.route('/api/leads', leadRoutes({
    store,
    allowedOrigins: leadOrigins,
    gateway: opts.leadGateway ?? null,
    turnstile,
  }));

  // --- API description (off in production unless EXPOSE_API_DOCS=true) -----
  if (exposeApiDocs) {
    app.get('/api/openapi.json', (c: Context) => c.json({
      openapi: '3.0.3',
      info: { title: 'Westrom Hub API', version: '2.0.0' },
      paths: {
        '/api/session': { post: { summary: 'Exchange a Turnstile token for a 30-minute session token' } },
        '/api/extract-tax': { post: { summary: 'Extract appraisal values from a notice image (session required)' } },
        '/api/extract-insurance': { post: { summary: 'Extract policy details from a declarations image (session required)' } },
        '/api/recommend-tax': { post: { summary: 'Tax recommendation from typed values (session required)' } },
        '/api/recommend-insurance': { post: { summary: 'Insurance recommendation from typed values (session required)' } },
        '/api/property-lookup': { get: { summary: 'Assessed values by address + county' } },
        '/api/leads/token': { get: { summary: 'Render token for the lead form' } },
        '/api/leads/lead': { post: { summary: 'Submit the lead form' } },
      },
    }));
  }

  return app;
}
