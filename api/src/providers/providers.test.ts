import { describe, it, expect } from 'vitest';
import { buildTextProviders, buildVisionProviders } from './index';

describe('provider chains', () => {
  it('text chain falls back to OpenRouter whenever its key exists', () => {
    const names = buildTextProviders({ groqApiKey: 'g', openRouterApiKey: 'o', moonShotApiKey: 'm' }).map((p) => p.name);
    expect(names).toEqual(['groq:openai/gpt-oss-120b', 'openrouter:google/gemini-2.5-flash', 'moonshot:moonshot-v1-8k']);
  });

  it('production config (OpenRouter only for vision) still yields a text provider', () => {
    expect(buildTextProviders({ openRouterApiKey: 'o' })).toHaveLength(1);
    expect(buildVisionProviders({ openRouterApiKey: 'o' }).map((p) => p.name)).toEqual([
      'openrouter:google/gemini-2.5-flash',
      'openrouter:google/gemma-4-31b-it:free',
    ]);
  });

  it('honours model overrides', () => {
    const [p] = buildTextProviders({ openRouterApiKey: 'o', openRouterTextModel: 'x/y' });
    expect(p.name).toBe('openrouter:x/y');
  });
});
