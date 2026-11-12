// Render tokens for the lead form, minted and checked by the API itself.
// Same wire format as n8n WF-0 (base64("ts.nonce.hex(hmac)")) so the widget is
// unchanged. The key lives in the private database (app_secret
// 'lead_token_key'), never in a variable. Because the API verifies the token
// when the lead is RECEIVED, a lead that waits in the queue for hours is still
// delivered: n8n is told the token was verified by the gateway.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export const TOKEN_MIN_AGE_MS = 2_000;
export const TOKEN_MAX_AGE_MS = 2 * 3600_000;

export function issueToken(key: string, nowMs = Date.now()): string {
  const ts = String(nowMs);
  const nonce = randomBytes(12).toString('hex');
  const mac = createHmac('sha256', key).update(`${ts}.${nonce}`).digest('hex');
  return Buffer.from(`${ts}.${nonce}.${mac}`, 'utf8').toString('base64');
}

/** True only for a token this API minted, between 2 s and 2 h old. */
export function verifyToken(key: string, token: string, nowMs = Date.now()): boolean {
  try {
    const [ts, nonce, mac = ''] = Buffer.from(token, 'base64').toString('utf8').split('.');
    if (!ts || !nonce || !/^\d{10,16}$/.test(ts)) return false;
    const expect = createHmac('sha256', key).update(`${ts}.${nonce}`).digest('hex');
    const a = Buffer.from(mac, 'utf8');
    const b = Buffer.from(expect, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const age = nowMs - Number(ts);
    return age >= TOKEN_MIN_AGE_MS && age <= TOKEN_MAX_AGE_MS;
  } catch {
    return false;
  }
}
