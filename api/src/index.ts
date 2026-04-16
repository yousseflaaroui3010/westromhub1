import dotenv from 'dotenv';
dotenv.config();

import { serve } from '@hono/node-server';
import type { AddressInfo } from 'net';
import { buildTextProviders, buildVisionProviders } from './providers';
import { createApp } from './app';

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
  moonShotApiKey: process.env.MOONSHOT_API_KEY,
  moonShotModel: process.env.MOONSHOT_MODEL,
};

const textProviders = buildTextProviders(providerConfig);
const visionProviders = buildVisionProviders(providerConfig);

if (textProviders.length === 0 || visionProviders.length === 0) {
  console.error(
    'FATAL: No AI providers configured. ' +
    'Set GEMINI_API_KEY (covers both text + vision), or ' +
    'GROQ_API_KEY (text) + OPENROUTER_API_KEY (vision). ' +
    'See .env.example for all options.',
  );
  process.exit(1);
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = createApp(textProviders, visionProviders, allowedOrigins);

serve({ fetch: app.fetch, port: PORT }, (info: AddressInfo) => {
  console.log(`Server running on port ${info.port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
