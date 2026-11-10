/**
 * Lead-form gateway: the only public entry point to the n8n lead pipeline.
 *
 *   widget -> https://wgcassetguide.com/api/leads/{token,lead} -> (nginx) -> here
 *          -> n8n WF-0 / WF-1 webhooks, with X-WGC-Gateway: <secret>
 *
 * Before this, the widget talked to n8n directly. n8n's "allowed origins" is a
 * CORS header, not access control, so any script could GET a render token and
 * replay it for two hours with fresh submission IDs: unlimited LeadSimple
 * deals, unlimited "new lead" emails to staff, and, worst, unlimited guide
 * emails sent from Westrom's Brevo account to any address on the internet.
 *
 * Controls here (all keyed on the nginx-derived client IP):
 *  - per-IP rate limits on token issue and on submit
 *  - each render token may back at most 3 submissions
 *  - the guide email goes to a given address at most once per 24h
 *  - global daily caps on submissions and on guide emails (alerts, not silence)
 *  - optional Cloudflare Turnstile verification
 *  - strict payload allowlist; unknown fields are never forwarded
 *
 * No-oracle rule (G-3, wgc-lead-pipeline): every bot-signal rejection on the
 * submit route returns the same {ok:true} body a real submission gets.
 * Infrastructure failures return 503 so the widget offers a retry; retries
 * reuse the same submission_id, which WF-1 dedupes.
 */
import { Hono } from 'hono';
import type { Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { CounterStore } from '../security/store';
import { rateLimit } from '../security/limits';
import { getClientIp } from '../security/clientIp';
import type { TurnstileVerifier } from '../security/session';
import { apiError, logFailure } from '../http/errors';

export interface LeadGatewayConfig {
  /** n8n webhook base, e.g. https://<n8n-host>/webhook/<hook-id> (no trailing slash). */
  baseUrl: string;
  /** Shared secret n8n checks on WF-0 and WF-1 (env WGC_GATEWAY_SECRET there). */
  secret: string;
  fetchImpl?: typeof fetch;
  dailySubmitCap?: number;
  dailyGuideEmailCap?: number;
}

const SILENT_OK = { ok: true } as const;

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

// Mirrors widget/src/validate.js + WF-1. Coercions match the widget's output.
const LeadSchema = z.object({
  submission_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3,4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  name: z.string().max(120).optional(),
  email: z.string().max(254).optional(),
  phone: z.string().max(40).optional(),
  zip: z.string().regex(/^\d{5}$/),
  sqft: z.union([z.number(), z.string()]).transform((v) => Number(v)).pipe(z.number().int().min(300).max(10_000)),
  bedrooms: z.enum(['2', '3', '4', '5+']).nullable().optional(),
  ebook_opt_in: z.boolean().optional().default(false),
  consent: z.object({
    explicit: z.boolean(),
    text_version: z.string().max(64),
    ts: z.string().max(40),
  }).strict().nullable().optional(),
  token: z.string().min(1).max(512),
  fax: z.string().max(200).optional(),
  fill_ms: z.number().finite().optional(),
  turnstile: z.string().max(2_048).optional(),
}).passthrough();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// What we accept back from n8n and relay to the browser (estimate card).
const UpstreamReply = z.object({
  ok: z.literal(true),
  estimate: z.object({
    low: z.number(),
    high: z.number(),
    comps: z.array(z.object({
      zip: z.string().max(10),
      beds: z.union([z.string(), z.number()]).optional(),
      sqft: z.union([z.string(), z.number()]).optional(),
      ago_days: z.number().nullable().optional(),
      rent: z.number(),
    }).passthrough()).max(10).default([]),
    meta: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
}).passthrough();

function originAllowed(c: Context, allowed: string[]): boolean {
  const origin = c.req.header('origin');
  return !!origin && allowed.includes(origin);
}

export function leadRoutes(opts: {
  store: CounterStore;
  allowedOrigins: string[];
  gateway: LeadGatewayConfig | null;
  turnstile: TurnstileVerifier | null;
}): Hono {
  const { store, allowedOrigins, gateway, turnstile } = opts;
  const r = new Hono();
  const doFetch = gateway?.fetchImpl ?? fetch;
  const submitCap = gateway?.dailySubmitCap ?? 300;
  const guideCap = gateway?.dailyGuideEmailCap ?? 150;

  // Sanity: a gateway with a short secret is a misconfiguration, not a feature.
  if (gateway && gateway.secret.length < 32) {
    throw new Error('N8N_GATEWAY_SECRET must be at least 32 characters');
  }

  const upstreamHeaders = (c: Context): Record<string, string> => ({
    'X-WGC-Gateway': gateway!.secret,
    'X-WGC-Client-IP': getClientIp(c),
    'X-WGC-Client-UA': (c.req.header('user-agent') ?? '').slice(0, 400),
  });

  r.get(
    '/token',
    rateLimit(store, { name: 'lead-token', max: 20, windowMs: 10 * 60_000 }),
    async (c) => {
      if (!gateway) return apiError(c, 503, 'unavailable', 'The form is temporarily unavailable.');
      try {
        const res = await doFetch(`${gateway.baseUrl}/token`, {
          method: 'GET',
          headers: upstreamHeaders(c),
          signal: AbortSignal.timeout(6_000),
        });
        const text = (await res.text()).trim();
        if (!res.ok || !/^[A-Za-z0-9+/=]{16,512}$/.test(text)) throw new Error(`token upstream HTTP ${res.status}`);
        c.header('Cache-Control', 'no-store');
        return c.text(text);
      } catch (err) {
        logFailure(c, 'leads/token', err);
        return apiError(c, 503, 'unavailable', 'The form is temporarily unavailable.');
      }
    },
  );

  r.post(
    '/lead',
    bodyLimit({ maxSize: 8 * 1024, onError: (c) => c.json(SILENT_OK) }),
    rateLimit(store, { name: 'lead-submit', max: 6, windowMs: 60 * 60_000 }),
    async (c) => {
      if (!gateway) return apiError(c, 503, 'unavailable', 'The form is temporarily unavailable.');
      const ip = getClientIp(c);
      const reject = (reason: string) => {
        console.warn(`[leads] silent reject reason=${reason}`);
        return c.json(SILENT_OK);
      };

      // Browsers always send Origin on a cross-origin or same-origin POST.
      if (!originAllowed(c, allowedOrigins)) return reject('origin');
      if (!(c.req.header('content-type') ?? '').toLowerCase().startsWith('application/json')) return reject('content-type');

      let raw: unknown;
      try { raw = await c.req.json(); } catch { return reject('json'); }
      const parsed = LeadSchema.safeParse(raw);
      if (!parsed.success) return reject('schema');
      const lead = parsed.data;

      if (lead.fax && lead.fax.trim() !== '') return reject('honeypot');
      if (typeof lead.fill_ms === 'number' && lead.fill_ms < 2_000) return reject('too-fast');

      const ebook = lead.ebook_opt_in === true;
      const email = (lead.email ?? '').trim();
      if (ebook && !EMAIL_RE.test(email)) return reject('email');

      if (turnstile) {
        if (!lead.turnstile) return reject('turnstile-missing');
        const v = await turnstile(lead.turnstile, ip, lead.submission_id);
        if (!v.ok) return reject('turnstile');
      }

      // A render token may back at most 3 submissions (re-tries reuse the
      // submission_id and are deduped downstream, so 3 is generous).
      const tokenUse = await store.hit('lead-tok:' + sha(lead.token), 2 * 3600_000);
      if (tokenUse.count > 3) return reject('token-reuse');

      const daily = await store.hit('lead-day:' + new Date().toISOString().slice(0, 10), 26 * 3600_000);
      if (daily.count === Math.floor(submitCap * 0.8)) console.warn(`[leads] 80% of daily submission cap (${submitCap})`);
      if (daily.count > submitCap) {
        if (daily.count === submitCap + 1) console.error(`[leads] daily submission cap ${submitCap} reached; further submissions dropped today`);
        return reject('daily-cap');
      }

      // Guide email: one per address per 24h, and a global daily ceiling so a
      // list of victim addresses cannot be mailed through our Brevo account.
      let sendGuide = ebook;
      if (ebook) {
        // A repeat within 24h still gets their estimate on screen, but the
        // lead is forwarded without contact details, so no second email and
        // no duplicate CRM deal. (Canonical schema unchanged: WF-1 only keeps
        // email when ebook_opt_in is true.)
        const firstForAddress = await store.setIfAbsent('guide:' + sha(email.toLowerCase()), 24 * 3600_000);
        if (!firstForAddress) {
          console.warn('[leads] guide already sent to this address in the last 24h; forwarding without contact');
          sendGuide = false;
        }
      }
      if (sendGuide) {
        const guides = await store.hit('guide-day:' + new Date().toISOString().slice(0, 10), 26 * 3600_000);
        if (guides.count > guideCap) {
          if (guides.count === guideCap + 1) console.error(`[leads] daily guide-email cap ${guideCap} reached`);
          sendGuide = false;
        }
      }

      // Forward ONLY known fields. Contact fields travel only with consent.
      const forward = {
        submission_id: lead.submission_id,
        name: '',
        email: sendGuide ? email : '',
        phone: '',
        zip: lead.zip,
        sqft: lead.sqft,
        bedrooms: lead.bedrooms ?? null,
        ebook_opt_in: sendGuide,
        consent: sendGuide && lead.consent ? lead.consent : null,
        token: lead.token,
        fax: '',
        fill_ms: lead.fill_ms ?? null,
      };

      try {
        const res = await doFetch(`${gateway.baseUrl}/lead`, {
          method: 'POST',
          headers: { ...upstreamHeaders(c), 'Content-Type': 'application/json' },
          body: JSON.stringify(forward),
          signal: AbortSignal.timeout(9_000),
        });
        if (!res.ok) throw new Error(`lead upstream HTTP ${res.status}`);
        const reply = UpstreamReply.safeParse(await res.json().catch(() => null));
        return c.json(reply.success ? reply.data : SILENT_OK);
      } catch (err) {
        logFailure(c, 'leads/lead', err);
        return apiError(c, 503, 'unavailable', 'We could not send your request. Please try again.');
      }
    },
  );

  return r;
}
