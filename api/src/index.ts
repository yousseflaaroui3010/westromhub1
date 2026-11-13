import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { serve } from '@hono/node-server';
import type { AddressInfo } from 'net';
import { httpExtractor } from './extractor';
import { cachedSecret, getOrCreateSecret } from './security/secretStore';
import { connect, migrate, readSecretStrict, withRetry } from './db';
import { pgLeadStore, leadHealth } from './leads/store';
import { dbEstimator } from './estimator/indexCache';
import { createApp } from './app';
import { createLookupFn } from './adapters/index';
import { createStore, PgStore } from './security/store';
import { cloudflareTurnstileVerifier } from './security/session';

const env = process.env;
const PORT = Number(env.PORT) || 3001;

function list(v: string | undefined, fallback: string): string[] {
  return (v ?? fallback).split(',').map((o) => o.trim()).filter(Boolean);
}

function int(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? Math.floor(n) : fallback;
}

async function main() {
  // Document reading: the private Docling service (no AI). Its shared token
  // lives in the project's private Postgres, not in a variable; it is created
  // on first use and loaded lazily (the database may be asleep at boot).
  const extractorToken = env.DATABASE_URL
    ? cachedSecret(() => getOrCreateSecret(env.DATABASE_URL as string, 'extractor_token'), 'extractor_token')
    : env.EXTRACTOR_TOKEN || undefined;
  const extractor = env.EXTRACTOR_URL ? httpExtractor(env.EXTRACTOR_URL, extractorToken) : null;
  if (extractor) {
    console.log(`Document reader: extractor at ${new URL(env.EXTRACTOR_URL as string).host} (no AI)`);
    if (!extractorToken) console.warn('WARNING: no DATABASE_URL (or EXTRACTOR_TOKEN); extractor calls are unauthenticated.');
    // Warm the token so the first upload does not wait for it.
    if (typeof extractorToken === 'function') void extractorToken();
  } else {
    console.warn('WARNING: EXTRACTOR_URL unset; /api/extract-* return 503 (owners can still type values in).');
  }

  const allowedOrigins = list(env.ALLOWED_ORIGINS, 'http://localhost:3000,http://localhost:5173');
  const leadAllowedOrigins = list(
    env.LEAD_ALLOWED_ORIGINS,
    'https://wgcassetguide.com,https://westromgroup.com,https://www.westromgroup.com',
  );

  // Fail loudly on half-configured security, quietly on fully-unconfigured
  // (local dev). Every disabled control is named at boot so it is never silent.
  if (!env.INTERNAL_PROXY_TOKEN) console.warn('SECURITY: INTERNAL_PROXY_TOKEN unset; /api is reachable without going through nginx.');
  if (!env.REDIS_URL && !env.DATABASE_URL) {
    console.warn('NOTICE: no REDIS_URL or DATABASE_URL; rate limits and the daily document-read cap are per-process and reset on restart.');
  }

  // Lead gateway. With DATABASE_URL, leads are stored first and delivered by
  // the worker if n8n is unavailable; the gateway secret and the token key
  // live in the private database (the secret is seeded once from
  // N8N_GATEWAY_SECRET if that is still set, so n8n keeps matching).
  const sql = env.DATABASE_URL ? connect(env.DATABASE_URL) : null;
  const migrated = sql ? withRetry(() => migrate(sql), 'migrate', 10) : null;
  migrated?.catch((e) => console.error(`[db] migration failed: ${e instanceof Error ? e.name : 'error'}`));

  // Bot check (Cloudflare Turnstile) and the session-signing key come from the
  // private database (app_secret), never from variables:
  //  - 'turnstile_secret_key': put there by a person; absent = no challenge.
  //  - 'session_secret': generated on first use and shared by every API copy
  //    (a per-copy key would reject sessions issued by the other copy).
  // The *_KEY / SESSION_SECRET variables remain only for local development.
  let turnstileSecret = env.TURNSTILE_SECRET_KEY || null;
  let sessionSecret = env.SESSION_SECRET || undefined;
  if (sql && migrated) {
    try {
      await migrated;
      turnstileSecret = (await withRetry(() => readSecretStrict(sql, 'turnstile_secret_key'), 'turnstile key')) ?? turnstileSecret;
      sessionSecret = await withRetry(() => getOrCreateSecret(env.DATABASE_URL as string, 'session_secret', env.SESSION_SECRET), 'session key');
    } catch {
      console.error('SECURITY: could not read secrets from the database at boot; running without the bot challenge until restart.');
    }
  }
  if (turnstileSecret) console.log(`Bot challenge: Turnstile on (documents${env.LEAD_REQUIRE_TURNSTILE === 'true' ? ' + lead form' : ''})`);
  else console.warn('SECURITY: no Turnstile secret (app_secret turnstile_secret_key); no bot challenge on document uploads or the lead form.');
  if (turnstileSecret && !sessionSecret) {
    console.warn('WARNING: no shared session key; sessions use a per-boot random key and only work on this copy.');
  }
  const dbSecret = (name: string, initial?: string) =>
    cachedSecret(() => getOrCreateSecret(env.DATABASE_URL as string, name, initial), name);
  const gatewaySecret = env.DATABASE_URL ? dbSecret('n8n_gateway_secret', env.N8N_GATEWAY_SECRET) : env.N8N_GATEWAY_SECRET;
  const leadGateway = env.N8N_LEAD_WEBHOOK_BASE && gatewaySecret
    ? {
        baseUrl: env.N8N_LEAD_WEBHOOK_BASE.replace(/\/+$/, ''),
        secret: gatewaySecret,
        dailySubmitCap: int(env.LEAD_DAILY_SUBMIT_CAP, 300),
        dailyGuideEmailCap: int(env.LEAD_DAILY_GUIDE_EMAIL_CAP, 150),
        store: sql ? pgLeadStore(sql) : null,
        tokenKey: env.DATABASE_URL ? dbSecret('lead_token_key') : null,
        // 'api' only once n8n WF-1 trusts gateway-verified tokens.
        tokenIssuer: env.LEAD_TOKEN_ISSUER === 'api' ? ('api' as const) : ('n8n' as const),
        estimator: sql ? dbEstimator(sql) : null,
        health: sql ? () => leadHealth(sql) : null,
      }
    : null;
  if (leadGateway) {
    console.log(`Lead gateway: store=${leadGateway.store ? 'postgres' : 'none (direct)'} tokens=${leadGateway.tokenIssuer}`);
  }
  if (!leadGateway) console.warn('NOTICE: N8N_LEAD_WEBHOOK_BASE / N8N_GATEWAY_SECRET unset; /api/leads/* returns 503.');

  // Rate-limit counters must be shared when more than one API copy runs:
  // Redis if configured, else the private Postgres, else per-process memory.
  const store = env.REDIS_URL ? await createStore(env.REDIS_URL) : sql ? new PgStore(sql) : await createStore(undefined);

  const app = createApp({
    extractor,
    allowedOrigins,
    leadAllowedOrigins,
    cadLookupFn: createLookupFn(env.ATTOM_API_KEY),
    store,
    internalProxyToken: env.INTERNAL_PROXY_TOKEN || undefined,
    turnstile: turnstileSecret ? cloudflareTurnstileVerifier(turnstileSecret) : null,
    // Only after the widget build that sends Turnstile tokens is live everywhere.
    leadTurnstile: turnstileSecret && env.LEAD_REQUIRE_TURNSTILE === 'true'
      ? cloudflareTurnstileVerifier(turnstileSecret)
      : null,
    sessionSecret,
    extractDailyCap: int(env.EXTRACT_DAILY_CAP, 400),
    extractMaxConcurrency: int(env.EXTRACT_MAX_CONCURRENCY, 4),
    leadGateway,
    exposeApiDocs: env.EXPOSE_API_DOCS === 'true',
  });

  // No hostname: Node binds dual-stack (::) when IPv6 exists, else 0.0.0.0.
  // Forcing '::' crashes on IPv4-only hosts.
  serve({ fetch: app.fetch, port: PORT }, (info: AddressInfo) => {
    console.log(`Server running on port ${info.port} (store=${store.kind})`);
    console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  });
}

main().catch((err) => {
  console.error('FATAL: startup failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
