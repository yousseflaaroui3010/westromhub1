import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';

// Tokens (sessions): 32 random bytes; only their SHA-256 is stored, so a
// database leak gives no usable session. Sign-in codes: 6 random digits,
// stored as an HMAC-SHA256 keyed by the email, so a copied row works only for
// that email and only until it expires (10 minutes, 5 tries).

export const newToken = () => randomBytes(32).toString('base64url');
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const sixDigitCode = () => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const codeHash = (email: string, code: string) => createHmac('sha256', `portal-code:${email}`).update(code).digest('hex');

export function normEmail(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const e = v.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}
