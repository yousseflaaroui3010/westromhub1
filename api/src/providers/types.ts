// Vision provider interface for the document-reading fallback chain.

export interface VisionProvider {
  readonly name: string;
  /** Returns raw JSON string. Caller is responsible for parsing + cleaning. */
  extract(prompt: string, base64: string, mimeType: string): Promise<string>;
}
