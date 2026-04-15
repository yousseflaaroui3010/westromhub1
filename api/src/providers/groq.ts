import type { TextProvider } from './types';

interface GroqResponse {
  choices: Array<{ message: { content: string } }>;
}

/**
 * Groq text provider — OpenAI-compatible API.
 * Used as fallback when Ollama is unavailable for text generation.
 * Default model: llama-3.3-70b-versatile (fast, free tier available).
 */
export function makeGroqTextProvider(apiKey: string, model = 'llama-3.3-70b-versatile'): TextProvider {
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

      if (!res.ok) throw new Error(`Groq ${model} error: ${res.statusText}`);
      const data = (await res.json()) as GroqResponse;
      const content = data.choices[0]?.message.content;
      if (!content) throw new Error('Groq returned empty response');
      return content;
    },
  };
}
