import type { TextProvider } from './types';

interface MoonShotResponse {
  choices: Array<{ message: { content: string } }>;
}

/**
 * MoonShot (Kimi) text provider — OpenAI-compatible API.
 * Docs: https://platform.moonshot.cn/docs
 * Default model: moonshot-v1-8k (fast, 8k context).
 * Upgrade to moonshot-v1-32k or moonshot-v1-128k for longer documents.
 */
export function makeMoonShotTextProvider(apiKey: string, model = 'moonshot-v1-8k'): TextProvider {
  return {
    name: `moonshot:${model}`,
    async generate(systemPrompt, userPrompt) {
      const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`MoonShot ${model} HTTP ${res.status}: ${body}`);
      }
      const data = (await res.json()) as MoonShotResponse;
      const content = data.choices[0]?.message.content;
      if (!content) throw new Error('MoonShot returned empty response');
      return content;
    },
  };
}
