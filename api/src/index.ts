import dotenv from 'dotenv';
dotenv.config();

import { serve } from '@hono/node-server';
import type { AddressInfo } from 'net';
import { buildTextProviders, buildVisionProviders } from './providers';
import { createApp } from './app';
import { createLookupFn } from './adapters/index';

const PORT = Number(process.env.PORT) || 3001;

// AI-1: Build provider chains once at startup.
// All providers are cloud APIs — no local model dependencies.
const providerConfig = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL,
  openRouterPremiumModel: process.env.OPENROUTER_PREMIUM_MODEL,
  moonShotApiKey: process.env.MOONSHOT_API_KEY,
  moonShotModel: process.env.MOONSHOT_MODEL,
};

const textProviders = buildTextProviders(providerConfig);
const visionProviders = buildVisionProviders(providerConfig);

if (visionProviders.length === 0) {
  console.error(
    'FATAL: No vision AI providers configured. ' +
    'Set GEMINI_API_KEY or OPENROUTER_API_KEY. ' +
    'See .env.example for all options.',
  );
  process.exit(1);
}
if (textProviders.length === 0) {
  console.warn(
    'WARNING: No text AI providers configured. ' +
    'Recommendation endpoints will fail. Set GEMINI_API_KEY or GROQ_API_KEY.',
  );
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = createApp(
  textProviders,
  visionProviders,
  allowedOrigins,
  undefined,                                      // attomApiKey: managed inside cadLookupFn
  createLookupFn(process.env.ATTOM_API_KEY),      // full CAD → ATTOM dispatcher
);

serve({ fetch: app.fetch, port: PORT }, (info: AddressInfo) => {
  console.log(`Server running on port ${info.port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
