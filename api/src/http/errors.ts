import type { Context, MiddlewareHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { randomUUID } from 'node:crypto';

/**
 * Public error contract: { error, code, requestId }.
 *
 * `error` is always a fixed, human-written sentence chosen by this codebase,
 * never text from an upstream provider, a stack trace or an exception message.
 * Upstream detail goes to the server log (redacted), keyed by requestId, so a
 * user can quote the ID and we can find the cause.
 */
export function apiError(
  c: Context,
  status: ContentfulStatusCode,
  code: string,
  message: string,
) {
  return c.json({ error: message, code, requestId: requestIdOf(c) }, status);
}

export function requestIdOf(c: Context): string {
  return (c.get('requestId' as never) as string | undefined) ?? 'unknown';
}

export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    const id = randomUUID();
    c.set('requestId' as never, id as never);
    c.header('X-Request-Id', id);
    await next();
  };
}

// Patterns that must never reach a log line: provider keys, bearer tokens,
// credentials in URLs, and long opaque tokens.
const REDACTIONS: Array<[RegExp, string]> = [
  [/(sk|gsk|pk|rk)[-_][A-Za-z0-9_-]{8,}/g, '[redacted-key]'],
  [/AIza[0-9A-Za-z_-]{20,}/g, '[redacted-key]'],
  [/(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, '$1 [redacted]'],
  [/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[redacted]@'],
  [/([?&](?:key|api_key|apikey|token|access_token)=)[^&\s]+/gi, '$1[redacted]'],
  [/[A-Za-z0-9_-]{40,}/g, '[redacted-token]'],
];

export function redact(text: string, max = 600): string {
  let out = String(text);
  for (const [re, rep] of REDACTIONS) out = out.replace(re, rep);
  return out.length > max ? out.slice(0, max) + '…' : out;
}

/** Log an internal failure with redaction; returns nothing to the client. */
export function logFailure(c: Context, label: string, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[${label}] request=${requestIdOf(c)} ${redact(msg)}`);
}
