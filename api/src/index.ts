import dotenv from 'dotenv';
dotenv.config();

import { serve } from '@hono/node-server';
import type { AddressInfo } from 'net';
import { buildTextProviders, buildVisionProviders } from './providers';
import { createApp } from './app';

const PORT = Number(process.env.PORT) || 3001;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const VISION_MODEL = process.env.VISION_MODEL || 'qwen2-vl:7b';
const TEXT_MODEL = process.env.TEXT_MODEL || 'qwen2.5:7b';

// AI-1: Build provider chains once at startup.
// Cloud-first: Groq (text) + OpenRouter (vision) are primary.
// Set OLLAMA_ENABLED=true to append Ollama as a local fallback.
const ollamaEnabled = process.env.OLLAMA_ENABLED === 'true';

const providerConfig = {
  ollamaBaseUrl: OLLAMA_BASE_URL,
  textModel: TEXT_MODEL,
  visionModel: VISION_MODEL,
  groqApiKey: process.env.GROQ_API_KEY,
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  groqModel: process.env.GROQ_MODEL,
  openRouterModel: process.env.OPENROUTER_MODEL,
  ollamaEnabled,
};

const textProviders = buildTextProviders(providerConfig);
const visionProviders = buildVisionProviders(providerConfig);

if (textProviders.length === 0 || visionProviders.length === 0) {
  console.error(
    'FATAL: No AI providers configured. Set GROQ_API_KEY + OPENROUTER_API_KEY, or set OLLAMA_ENABLED=true.',
  );
  process.exit(1);
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const app = createApp(textProviders, visionProviders, allowedOrigins, OLLAMA_BASE_URL);

serve({ fetch: app.fetch, port: PORT }, (info: AddressInfo) => {
  console.log(`Server running on port ${info.port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
});
