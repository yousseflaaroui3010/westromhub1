import { GoogleGenAI } from '@google/genai';
import type { TextProvider, VisionProvider } from './types';

/**
 * Gemini text provider — handles recommendation generation.
 * Default model: gemini-2.5-flash (fast, generous free tier, strong reasoning).
 */
export function makeGeminiTextProvider(apiKey: string, model = 'gemini-3-flash-preview'): TextProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    name: `gemini:${model}`,
    async generate(systemPrompt, userPrompt) {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0,
        },
      });
      const text = response.text;
      if (!text) throw new Error('Gemini returned empty response');
      return text;
    },
  };
}

/**
 * Gemini vision provider — handles document image extraction.
 * Same model as text (Gemini 2.5 Flash is natively multimodal).
 * Uses JSON response mode so no markdown fence cleanup is needed.
 */
export function makeGeminiVisionProvider(apiKey: string, model = 'gemini-3-flash-preview'): VisionProvider {
  const ai = new GoogleGenAI({ apiKey });
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
