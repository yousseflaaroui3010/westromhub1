import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { serve } from '@hono/node-server';
import type { AddressInfo } from 'net';
import { buildTextProviders, buildVisionProviders } from './providers';
import { createApp } from './app';
import { createLookupFn } from './adapters/index';
import { createStore } from './security/store';
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
  // AI-1: Build provider chains once at startup.
  const providerConfig = {
    geminiApiKey: env.GEMINI_API_KEY,
    geminiModel: env.GEMINI_MODEL,
    groqApiKey: env.GROQ_API_KEY,
    groqModel: env.GROQ_MODEL,
    openRouterApiKey: env.OPENROUTER_API_KEY,
    openRouterModel: env.OPENROUTER_MODEL,
    openRouterPremiumModel: env.OPENROUTER_PREMIUM_MODEL,
    openRouterTextModel: env.OPENROUTER_TEXT_MODEL,
    moonShotApiKey: env.MOONSHOT_API_KEY,
    moonShotModel: env.MOONSHOT_MODEL,
  };
  const textProviders = buildTextProviders(providerConfig);
  const visionProviders = buildVisionProviders(providerConfig);

  if (visionProviders.length === 0) {
    console.error('FATAL: No vision AI providers configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.');
    process.exit(1);
  }
  console.log(`AI text chain: ${textProviders.map((p) => p.name).join(' -> ') || 'none'}`);
  console.log(`AI vision chain: ${visionProviders.map((p) => p.name).join(' -> ')}`);
  if (textProviders.length === 0) {
    console.warn('WARNING: No text AI providers configured. Recommendation endpoints will fail.');
  }

  const allowedOrigins = list(env.ALLOWED_ORIGINS, 'http://localhost:3000,http://localhost:5173');
  const leadAllowedOrigins = list(
    env.LEAD_ALLOWED_ORIGINS,
    'https://wgcassetguide.com,https://westromgroup.com,https://www.westromgroup.com',
  );

  // Fail loudly on half-configured security, quietly on fully-unconfigured
  // (local dev). Every disabled control is named at boot so it is never silent.
  if (env.TURNSTILE_SECRET_KEY && !env.SESSION_SECRET) {
    console.warn('WARNING: SESSION_SECRET unset; sessions use a per-boot random key and expire on restart.');
  }
  if (!env.INTERNAL_PROXY_TOKEN) console.warn('SECURITY: INTERNAL_PROXY_TOKEN unset; /api is reachable without going through nginx.');
  if (!env.TURNSTILE_SECRET_KEY) console.warn('SECURITY: TURNSTILE_SECRET_KEY unset; no bot challenge on paid AI routes or the lead form.');
  if (!env.REDIS_URL) console.warn('NOTICE: REDIS_URL unset; rate limits and the daily AI budget are per-process and reset on restart.');

  const leadGateway = env.N8N_LEAD_WEBHOOK_BASE && env.N8N_GATEWAY_SECRET
    ? {
        baseUrl: env.N8N_LEAD_WEBHOOK_BASE.replace(/\/+$/, ''),
        secret: env.N8N_GATEWAY_SECRET,
        dailySubmitCap: int(env.LEAD_DAILY_SUBMIT_CAP, 300),
        dailyGuideEmailCap: int(env.LEAD_DAILY_GUIDE_EMAIL_CAP, 150),
      }
    : null;
  if (!leadGateway) console.warn('NOTICE: N8N_LEAD_WEBHOOK_BASE / N8N_GATEWAY_SECRET unset; /api/leads/* returns 503.');

  const store = await createStore(env.REDIS_URL);

  const app = createApp({
    textProviders,
    visionProviders,
    allowedOrigins,
    leadAllowedOrigins,
    cadLookupFn: createLookupFn(env.ATTOM_API_KEY),
    store,
    internalProxyToken: env.INTERNAL_PROXY_TOKEN || undefined,
    turnstile: env.TURNSTILE_SECRET_KEY ? cloudflareTurnstileVerifier(env.TURNSTILE_SECRET_KEY) : null,
    // Only after the widget build that sends Turnstile tokens is live everywhere.
    leadTurnstile: env.TURNSTILE_SECRET_KEY && env.LEAD_REQUIRE_TURNSTILE === 'true'
      ? cloudflareTurnstileVerifier(env.TURNSTILE_SECRET_KEY)
      : null,
    sessionSecret: env.SESSION_SECRET || undefined,
    aiDailyCallCap: int(env.AI_DAILY_CALL_CAP, 400),
    aiMaxConcurrency: int(env.AI_MAX_CONCURRENCY, 4),
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
