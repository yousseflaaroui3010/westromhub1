// Maintenance requests ("melds") from PropertyMeld, read only, for the owner's
// "Care" chapter. Ported from the deposit dashboard's client
// (backend/clients/propertymeld_client.py), keeping its hard-won rules:
// - OAuth2 client credentials (POST oauth/token/); every call carries the
//   Bearer token AND X-Multitenant-Id, or PropertyMeld answers 400.
// - `property=` filters /meld/; `order_by=-created` sorts; pages follow `next`.
// - `completion_date` is the FIRST VENDOR APPOINTMENT; `marked_complete` is the
//   real closing date, so "days to fix" uses marked_complete only.
// Only a short title, status, priority and dates leave this file: no tenant
// names, phones, emails or long descriptions.

export interface PmCreds { clientId: string; clientSecret: string; multitenantId: string }
export interface Meld { ref: string | null; title: string; status: string; priority: string | null; opened: string | null; closed: string | null; open: boolean }
export type MeldReader = (street: string, city: string) => Promise<Meld[] | null>;

const BASE = 'https://api.propertymeld.com/api/v2/';
const SUFFIX: Record<string, string> = {
  drive: 'dr', street: 'st', lane: 'ln', court: 'ct', road: 'rd', trail: 'trl', avenue: 'ave', boulevard: 'blvd', place: 'pl',
  circle: 'cir', parkway: 'pkwy', terrace: 'ter', highway: 'hwy', way: 'way', cove: 'cv', ridge: 'rdg', crossing: 'xing', point: 'pt',
  north: 'n', south: 's', east: 'e', west: 'w',
};
/** "412 Larkspur Bend Drive, Unit B" → "412 larkspur bend dr". */
export function streetKey(line: string): string {
  return line.toLowerCase().replace(/[,#].*$/, '').replace(/\b(apt|unit|suite|ste)\b.*$/, '').replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(Boolean).map((w) => SUFFIX[w] ?? w).join(' ');
}

const TYPES = new Set(['dr', 'st', 'ln', 'ct', 'rd', 'trl', 'ave', 'blvd', 'pl', 'cir', 'pkwy', 'ter', 'hwy', 'way', 'cv', 'rdg', 'xing', 'pt', 'bnd', 'bend', 'loop', 'run', 'path', 'row', 'sq']);
/** The street line without its street type ("412 larkspur bend dr" → "412 larkspur bend"), for lines saved without one. */
export function looseKey(key: string): string {
  const words = key.split(' ');
  return words.length > 2 && TYPES.has(words[words.length - 1]) ? words.slice(0, -1).join(' ') : key;
}

const CANCELLED = /cancel/i;
const DONE = /complete/i;
const short = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, n) : '');
const dayOf = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);

export function slimMeld(raw: Record<string, unknown>): Meld | null {
  const status = short(raw.status, 40);
  if (!status || CANCELLED.test(status)) return null;
  const closed = dayOf(raw.marked_complete);
  return {
    ref: short(raw.reference_id, 20) || null,
    title: short(raw.brief_description, 90) || 'Maintenance request',
    status, priority: short(raw.priority, 20) || null,
    opened: dayOf(raw.created), closed,
    open: !closed && !DONE.test(status),
  };
}

export function propertyMeld(creds: () => Promise<PmCreds | null>, fetchImpl: typeof fetch = fetch, now = () => Date.now()): MeldReader {
  let token: { value: string; until: number; for: string } | null = null;
  let props: { at: number; byStreet: Map<string, string[]> } | null = null;

  async function auth(c: PmCreds): Promise<string> {
    if (token && token.for === c.clientId && token.until > now()) return token.value;
    const res = await fetchImpl(`${BASE}oauth/token/`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: c.clientId, client_secret: c.clientSecret }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`PropertyMeld sign-in HTTP ${res.status}`);
    const body = await res.json() as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new Error('PropertyMeld gave no token');
    token = { value: body.access_token, until: now() + Math.max(60, (body.expires_in ?? 3600) - 120) * 1000, for: c.clientId };
    return token.value;
  }

  async function all(c: PmCreds, path: string, params: Record<string, string>, maxPages: number): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = [];
    let url: string | null = `${BASE}${path}?${new URLSearchParams(params)}`;
    for (let i = 0; url && i < maxPages; i++) {
      if (!url.startsWith(BASE)) break; // only follow PropertyMeld's own next links
      const res: Response = await fetchImpl(url, { headers: { Authorization: `Bearer ${await auth(c)}`, Accept: 'application/json', 'X-Multitenant-Id': c.multitenantId }, signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`PropertyMeld HTTP ${res.status}`);
      const page = await res.json() as { results?: Record<string, unknown>[]; next?: string | null };
      out.push(...(page.results ?? []));
      url = page.next ?? null;
    }
    return out;
  }

  return async (street, city) => {
    const c = await creds();
    if (!c) return null;
    if (!props || now() - props.at > 24 * 3600_000) {
      const byStreet = new Map<string, string[]>();
      for (const p of await all(c, 'property/', { limit: '100' }, 40)) {
        const key = streetKey(short(p.line_1, 120));
        if (!key || p.id == null) continue;
        for (const k of new Set([key, looseKey(key)])) byStreet.set(k, [...(byStreet.get(k) ?? []), String(p.id)]);
      }
      props = { at: now(), byStreet };
    }
    const key = streetKey(street);
    const ids = props.byStreet.get(key) ?? props.byStreet.get(looseKey(key)) ?? [];
    void city; // several PropertyMeld properties on one street line are all read (rare)
    const yearAgo = new Date(now() - 366 * 24 * 3600_000).toISOString().slice(0, 10);
    const melds: Meld[] = [];
    for (const id of ids.slice(0, 3)) {
      for (const raw of await all(c, 'meld/', { property: id, order_by: '-created', limit: '100' }, 5)) {
        const m = slimMeld(raw);
        if (m && (!m.opened || m.opened >= yearAgo)) melds.push(m);
      }
    }
    return melds.sort((a, b) => (b.opened ?? '').localeCompare(a.opened ?? '')).slice(0, 40);
  };
}
