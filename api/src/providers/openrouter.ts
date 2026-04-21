import type { VisionProvider } from './types';

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callOpenRouterVision(
  apiKey: string,
  model: string,
  prompt: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const imageUrl = `data:${mimeType};base64,${base64}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://westromhub.com',
      'X-Title': 'Westrom Hub',
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${model} HTTP ${res.status}: ${body}`);
  }
  const data = (await res.json()) as OpenRouterResponse;
  const content = data.choices[0]?.message.content;
  if (!content) throw new Error('OpenRouter returned empty response');
  return content;
}

export function makeOpenRouterVisionProvider(
  apiKey: string,
  model = 'google/gemma-4-31b-it:free',
): VisionProvider {
  return {
    name: `openrouter:${model}`,
    async extract(prompt, base64, mimeType) {
      return callOpenRouterVision(apiKey, model, prompt, base64, mimeType);
    },
  };
}

export function makeOpenRouterPremiumVisionProvider(
  apiKey: string,
  model = 'google/gemini-2.5-flash',
): VisionProvider {
  return {
    name: `openrouter:${model}`,
    async extract(prompt, base64, mimeType) {
      return callOpenRouterVision(apiKey, model, prompt, base64, mimeType);
    },
  };
}
