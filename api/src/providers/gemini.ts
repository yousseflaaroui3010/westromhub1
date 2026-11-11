import { GoogleGenAI } from '@google/genai';
import type { VisionProvider } from './types';

/**
 * Gemini vision provider — handles document image extraction.
 * Same model as text (Gemini 2.5 Flash is natively multimodal).
 * Uses JSON response mode so no markdown fence cleanup is needed.
 */
export function makeGeminiVisionProvider(apiKey: string, model = 'gemini-2.5-flash'): VisionProvider {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 45_000 } });
  return {
    name: `gemini:${model}`,
    async extract(prompt, base64, mimeType) {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
          temperature: 0,
        },
      });
      const text = response.text;
      if (!text) throw new Error('Gemini returned empty response');
      return text;
    },
  };
}
