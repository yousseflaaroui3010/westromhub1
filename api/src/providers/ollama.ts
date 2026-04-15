import type { TextProvider, VisionProvider } from './types';

interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

interface OllamaResponse {
  message: { content: string };
}

async function callOllama(
  baseUrl: string,
  model: string,
  messages: OllamaMessage[],
  format?: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, format, stream: false, options: { temperature: 0 } }),
    // BUG-4: 90s allows for cold-start of 7B model
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Ollama ${model} error: ${res.statusText}`);
  const data = (await res.json()) as OllamaResponse;
  return data.message.content;
}

export function makeOllamaTextProvider(baseUrl: string, model: string): TextProvider {
  return {
    name: `ollama:${model}`,
    async generate(systemPrompt, userPrompt) {
      return callOllama(baseUrl, model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);
    },
  };
}

export function makeOllamaVisionProvider(baseUrl: string, model: string): VisionProvider {
  return {
    name: `ollama:${model}`,
    async extract(prompt, base64) {
      return callOllama(baseUrl, model, [{ role: 'user', content: prompt, images: [base64] }], 'json');
    },
  };
}
