import type { Context, MiddlewareHandler } from 'hono';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { apiError } from '../http/errors';

/**
 * Anonymous, short-lived sessions backed by a server-verified bot challenge.
 *
 * Flow: the browser solves Cloudflare Turnstile -> POST /api/session with the
 * Turnstile token -> we verify it server-side with Cloudflare (siteverify) ->
 * we return an HMAC-signed session token (30 min). Paid routes require that
 * token and meter quotas per session ID as well as per IP.
 *
 * Why not just verify Turnstile on every paid call: a Turnstile token is
 * single-use and costs the user a challenge each time; one session covers an
 * upload + recommendation flow.
 */

export const SESSION_TTL_MS = 30 * 60 * 1000;

export interface TurnstileVerifier {
  (token: string, remoteIp: string, idempotencyKey: string): Promise<{ ok: boolean; hostname?: string; codes?: string[] }>;
}

export function cloudflareTurnstileVerifier(secret: string): TurnstileVerifier {
  return async (token, remoteIp, idempotencyKey) => {
    const form = new URLSearchParams({ secret, response: token, idempotency_key: idempotencyKey });
    if (remoteIp !== 'unknown') form.set('remoteip', remoteIp);
    try {
      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) return { ok: false, codes: [`http_${res.status}`] };
      const data = (await res.json()) as { success?: boolean; hostname?: string; 'error-codes'?: string[] };
      return { ok: data.success === true, hostname: data.hostname, codes: data['error-codes'] };
    } catch {
      return { ok: false, codes: ['network'] };
    }
  };
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

export class SessionSigner {
  private readonly key: Buffer;

  constructor(secret: string | undefined, private readonly now: () => number = Date.now) {
    if (secret && secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
    this.key = secret ? Buffer.from(secret) : randomBytes(32);
  }

  issue(): { token: string; sessionId: string; expiresAt: number } {
    const sessionId = randomUUID();
    const expiresAt = this.now() + SESSION_TTL_MS;
    const body = b64url(JSON.stringify({ v: 1, sid: sessionId, exp: expiresAt }));
    const mac = b64url(createHmac('sha256', this.key).update(body).digest());
    return { token: `${body}.${mac}`, sessionId, expiresAt };
  }

  verify(token: string): string | null {
    const [body, mac, extra] = token.split('.');
    if (!body || !mac || extra !== undefined || token.length > 512) return null;
    const expect = createHmac('sha256', this.key).update(body).digest();
    const got = Buffer.from(mac, 'base64url');
    if (got.length !== expect.length || !timingSafeEqual(got, expect)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { v?: number; sid?: string; exp?: number };
      if (p.v !== 1 || typeof p.sid !== 'string' || typeof p.exp !== 'number') return null;
      if (p.exp <= this.now()) return null;
      return p.sid;
    } catch {
      return null;
    }
  }
}

export function sessionIdOf(c: Context): string | null {
  return (c.get('sessionId' as never) as string | undefined) ?? null;
}

/**
 * When `required` (Turnstile configured), paid routes need a valid session.
 * When not required (local dev, or before the Turnstile keys exist), any
 * valid session is still recognized so per-session quotas apply.
 */
export function requireSession(signer: SessionSigner, required: boolean): MiddlewareHandler {
  return async (c, next) => {
    const auth = c.req.header('authorization') ?? '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const sid = token ? signer.verify(token) : null;
    if (sid) {
      c.set('sessionId' as never, sid as never);
      return next();
    }
    if (!required) return next();
    return apiError(c, 401, 'session_required', 'Your session expired. Please try again.');
  };
}
