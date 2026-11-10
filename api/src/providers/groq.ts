import type { TextProvider } from './types';

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

/**
 * Groq text provider — OpenAI-compatible API.
 * Used as fallback when Ollama is unavailable for text generation.
 * Default model: openai/gpt-oss-120b (override with GROQ_MODEL).
 */
// llama-3.3-70b-versatile was shut down by Groq on 2026-08-16 (404 model_not_found
// in production); openai/gpt-oss-120b is Groq's listed replacement.
export function makeGroqTextProvider(apiKey: string, model = 'openai/gpt-oss-120b'): TextProvider {
  return {
    name: `groq:${model}`,
    async generate(systemPrompt, userPrompt) {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
        const body = (await res.text().catch(() => '')).slice(0, 300);
        throw new Error(`Groq ${model} HTTP ${res.status}: ${body}`);
      }
      const data = (await res.json()) as GroqResponse;
      const content = data.choices[0]?.message.content;
      if (!content) throw new Error('Groq returned empty response');
      return content;
    },
  };
}
