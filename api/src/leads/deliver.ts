// Hand one stored lead to n8n WF-1. Used by the request (fast path, so the
// visitor still sees the estimate) and by the worker (retries).

import { z } from 'zod';
import type { LeadRow } from './store';

export type SecretValue = string | (() => Promise<string | undefined>);

export interface Upstream {
  /** n8n webhook base, e.g. https://<n8n-host>/webhook/<hook-id> (no trailing slash). */
  baseUrl: string;
  /** Shared secret n8n checks (X-WGC-Gateway). */
  secret: SecretValue;
  fetchImpl?: typeof fetch;
}

// What we accept back from n8n and relay to the browser (estimate card).
export const UpstreamReply = z.object({
  ok: z.literal(true),
  estimate: z.object({
    low: z.number(),
    high: z.number(),
    comps: z.array(z.object({
      zip: z.string().max(10),
      beds: z.union([z.string(), z.number()]).optional(),
      sqft: z.union([z.string(), z.number()]).optional(),
      ago_days: z.number().nullable().optional(),
      rent: z.number(),
    }).passthrough()).max(10).default([]),
    meta: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
}).passthrough();

export type Reply = z.infer<typeof UpstreamReply>;

export async function resolveSecret(s: SecretValue): Promise<string | undefined> {
  return typeof s === 'function' ? s() : s;
}

/** POST the lead to WF-1. Resolves with n8n's (validated) reply; throws on any failure. */
export async function deliverLead(up: Upstream, row: LeadRow, timeoutMs: number): Promise<Reply> {
  const secret = await resolveSecret(up.secret);
  if (!secret || secret.length < 32) throw new Error('gateway secret unavailable');
  const body = { ...row.payload, ...(row.token_verified ? { gateway_verified: true } : {}) };
  const res = await (up.fetchImpl ?? fetch)(`${up.baseUrl}/lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WGC-Gateway': secret,
      'X-WGC-Client-IP': row.client_ip ?? '',
      'X-WGC-Client-UA': row.user_agent ?? '',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`lead upstream HTTP ${res.status}`);
  const reply = UpstreamReply.safeParse(await res.json().catch(() => null));
  // n8n answered 200; a body we cannot read is still a delivery.
  return reply.success ? reply.data : { ok: true };
}
