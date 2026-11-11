import { describe, it, expect } from 'vitest';
import { buildVisionProviders } from './index';

describe('provider chains', () => {
  it('production config (OpenRouter only) yields the premium then free vision model', () => {
    expect(buildVisionProviders({ openRouterApiKey: 'o' }).map((p) => p.name)).toEqual([
      'openrouter:google/gemini-2.5-flash',
      'openrouter:google/gemma-4-31b-it:free',
    ]);
  });

  it('puts direct Gemini first when its key exists', () => {
    expect(buildVisionProviders({ geminiApiKey: 'g', openRouterApiKey: 'o' })[0].name).toMatch(/^gemini/);
  });
});
