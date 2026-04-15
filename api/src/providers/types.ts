// Provider interfaces for the AI fallback chain.
// Text: Ollama → Groq.  Vision: Ollama → OpenRouter.

export interface TextProvider {
  readonly name: string;
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

export interface VisionProvider {
  readonly name: string;
  /** Returns raw JSON string. Caller is responsible for parsing + cleaning. */
  extract(prompt: string, base64: string, mimeType: string): Promise<string>;
}
