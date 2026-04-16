import type { VisionProvider } from './types';

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

/**
 * OpenRouter vision provider — OpenAI-compatible multimodal API.
 * Used as the vision fallback when Gemini is unavailable.
 * Default model: mistralai/pixtral-large-2411 — Mistral's flagship vision model,
 * purpose-built for structured document understanding (forms, tables, OCR).
 * Override via OPENROUTER_MODEL env var (see .env.example for alternatives).
 */
export function makeOpenRouterVisionProvider(
  apiKey: string,
  model = 'mistralai/pixtral-large-2411',
): VisionProvider {
  return {
    name: `openrouter:${model}`,
    async extract(prompt, base64, mimeType) {
      const imageUrl = `data:${mimeType};base64,${base64}`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          // Required by OpenRouter to identify the calling application
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
        signal: AbortSignal.timeout(30_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`OpenRouter ${model} HTTP ${res.status}: ${body}`);
      }
      const data = (await res.json()) as OpenRouterResponse;
      const content = data.choices[0]?.message.content;
      if (!content) throw new Error('OpenRouter returned empty response');
      return content;
    },
  };
}
