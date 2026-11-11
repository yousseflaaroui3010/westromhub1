// Client for the private document reader (../extractor: Docling + rules, no
// AI). It runs on Railway's private network with no public domain; the
// shared token is defence in depth. Bytes go in, structured fields come out.

export type ExtractKind = 'tax' | 'insurance';

export class ExtractorError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(`extractor ${status} ${code}`);
    this.name = 'ExtractorError';
  }
}

export type Extractor = (kind: ExtractKind, bytes: Buffer) => Promise<unknown>;

export function httpExtractor(baseUrl: string, token: string | undefined, timeoutMs = 100_000): Extractor {
  const base = baseUrl.replace(/\/+$/, '');
  return async (kind, bytes) => {
    let res: Response;
    try {
      res = await fetch(`${base}/extract/${kind}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...(token ? { 'X-Extractor-Token': token } : {}),
        },
        body: new Blob([new Uint8Array(bytes)]),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      throw new ExtractorError(timedOut ? 504 : 502, timedOut ? 'timeout' : 'unreachable');
    }
    const body = (await res.json().catch(() => ({}))) as { error?: unknown };
    // 200 bodies may carry { error: 'not_a_tax_document' }: that is an answer,
    // not a failure, and the caller classifies it.
    if (res.ok) return body;
    throw new ExtractorError(res.status, typeof body.error === 'string' ? body.error : `http_${res.status}`);
  };
}
