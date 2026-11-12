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

export interface ExtractorOptions {
  timeoutMs?: number;
  /** How long to keep retrying while the (serverless) service wakes up. */
  wakeWindowMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * `token` is a fixed string (tests, local dev), a SecretSource that loads it
 * from the private database, or undefined (no auth; local dev only). When a
 * SecretSource cannot load the token we refuse to call rather than call
 * unauthenticated: the extractor would reject the request anyway.
 */
export function httpExtractor(
  baseUrl: string,
  token: string | (() => Promise<string | undefined>) | undefined,
  opts: ExtractorOptions = {},
): Extractor {
  const base = baseUrl.replace(/\/+$/, '');
  const timeoutMs = opts.timeoutMs ?? 100_000;
  const wakeWindowMs = opts.wakeWindowMs ?? 60_000;
  const sleep = opts.sleep ?? wait;

  return async (kind, bytes) => {
    const secret = typeof token === 'function' ? await token() : token;
    if (typeof token === 'function' && !secret) throw new ExtractorError(503, 'secret_unavailable');
    const body = new Blob([new Uint8Array(bytes)]);
    const started = Date.now();
    let delay = 1_000;
    for (;;) {
      let res: Response;
      try {
        res = await fetch(`${base}/extract/${kind}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            ...(secret ? { 'X-Extractor-Token': secret } : {}),
          },
          body,
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
        if (timedOut) throw new ExtractorError(504, 'timeout');
        // Connection refused/reset: the service is asleep and waking up
        // (Railway serverless). Retry with backoff inside the wake window.
        if (Date.now() - started + delay > wakeWindowMs) throw new ExtractorError(502, 'unreachable');
        await sleep(delay);
        delay = Math.min(delay * 2, 8_000);
        continue;
      }
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      // 200 bodies may carry { error: 'not_a_tax_document' }: that is an
      // answer, not a failure, and the caller classifies it.
      if (res.ok) return json;
      throw new ExtractorError(res.status, typeof json.error === 'string' ? json.error : `http_${res.status}`);
    }
  };
}
