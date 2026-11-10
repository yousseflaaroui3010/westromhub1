import type { Context, MiddlewareHandler } from 'hono';
import { timingSafeEqual } from 'node:crypto';
import { apiError } from '../http/errors';

/**
 * The trusted client identity.
 *
 * In production every /api request arrives via the frontend's nginx, which
 * derives the real visitor IP (Cloudflare-aware, see nginx.conf.template) and
 * OVERWRITES X-Real-IP with it. X-Forwarded-For is never read: it is an
 * append-only chain whose leading entries are whatever the client sent.
 *
 * Direct hits on the API's own public domain (if it still has one) get
 * X-Real-IP from Railway's edge, which overwrites it too. Those requests are
 * refused outright once INTERNAL_PROXY_TOKEN is configured.
 */
export function getClientIp(c: Context): string {
  const raw = (c.req.header('x-real-ip') ?? '').trim();
  // Keep keys bounded and boring: an IPv4/IPv6 literal or 'unknown'.
  return /^[0-9A-Fa-f:.]{3,45}$/.test(raw) ? raw : 'unknown';
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Rejects /api/* requests that did not come through our nginx. The API should
 * also have no public domain at all; this is the backstop if one is re-added.
 * No token configured = not enforced (local development).
 */
export function requireInternalProxy(token: string | undefined): MiddlewareHandler {
  return async (c, next) => {
    if (!token) return next();
    const presented = c.req.header('x-internal-proxy-token') ?? '';
    if (!safeEqual(presented, token)) {
      return apiError(c, 403, 'forbidden', 'Forbidden');
    }
    return next();
  };
}
