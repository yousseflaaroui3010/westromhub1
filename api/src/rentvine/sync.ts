// Rentvine -> estimator index, run by the worker (nightly + when stale).
//
// This project's OWN Rentvine client: no connection to any other app. The API
// key and secret live in this project's private Postgres (app_secret rows
// 'rentvine_api_key' / 'rentvine_api_secret'), never in a variable or git.
// Read-only; one request every PACE_MS (Rentvine allows 100/min per account),
// at most MAX_PAGES pages; 429/5xx back off, 401/403 stop at once.
//
// The index keeps only what the estimator needs (zip, beds, baths, sqft, rent,
// lease start date, opaque unit id): no address, tenant or owner. It is stored
// in the `segment_index` table and rewritten only when the data changed.

import type { Sql } from '../db';

export const PACE_MS = 3_000;
export const MAX_PAGES = 40;
const PAGE_SIZE = 100;
export const FRESH_MS = 20 * 3600_000;
const MIN_RECORDS = 20;
const MIN_KEEP_RATIO = 0.6;

export interface IndexRecord {
  zip: string; beds: number | null; baths: number | null; sqft: number | null;
  rent: number; date: string | null; uid?: string;
}

const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const zip5 = (v: unknown): string | null => String(v ?? '').match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null;
const day = (v: unknown): string | null => String(v ?? '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;

type Obj = Record<string, unknown>;

/** One leases/export row -> one index record, or null if it cannot price a segment. */
export function toRecord(row: Obj): IndexRecord | null {
  const lease = (row.lease ?? {}) as Obj;
  const unit = (row.unit ?? {}) as Obj;
  const prop = (row.property ?? {}) as Obj;
  const place = unit.address ? unit : prop;
  const zip = zip5(place.postalCode) ?? zip5(prop.postalCode) ?? zip5(unit.postalCode);
  let rent = num(lease.rent);
  if (!(rent && rent > 0)) rent = num(unit.rent);
  if (!zip || rent == null || rent < 300 || rent > 20_000) return null;
  const sqftRaw = num(unit.size ?? unit.squareFeet ?? unit.sqft);
  const bedsRaw = num(unit.beds);
  const full = num(unit.fullBaths);
  const half = num(unit.halfBaths);
  const unitId = unit.unitID ?? lease.unitID;
  return {
    zip,
    beds: bedsRaw != null && bedsRaw >= 0 && bedsRaw <= 20 ? bedsRaw : null,
    baths: full != null ? full + (half ?? 0) / 2 : null,
    sqft: sqftRaw != null && sqftRaw >= 200 && sqftRaw <= 20_000 ? Math.round(sqftRaw) : null,
    rent: Math.round(rent),
    date: day(lease.startDate),
    ...(unitId != null ? { uid: 'rv' + String(unitId) } : {}),
  };
}

/** Order-independent fingerprint (FNV-1a) of the records. */
export function digest(records: IndexRecord[]): string {
  const s = records.map((r) => [r.uid ?? '', r.zip, r.beds, r.baths, r.sqft, r.rent, r.date].join('|')).sort().join('\n');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `${h.toString(16).padStart(8, '0')}:${records.length}`;
}

export function accept(prevCount: number | null, nextCount: number): { ok: boolean; why?: string } {
  if (nextCount < MIN_RECORDS) return { ok: false, why: `too few records (${nextCount})` };
  if (prevCount && nextCount < prevCount * MIN_KEEP_RATIO) return { ok: false, why: `shrank from ${prevCount} to ${nextCount}` };
  return { ok: true };
}

export class RentvineError extends Error {
  constructor(public readonly status: number, message: string) { super(message); this.name = 'RentvineError'; }
}

export interface RentvineCreds { apiKey: string; apiSecret: string; corporationId: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Paced, read-only client. One request at a time, PACE_MS apart. */
export function rentvineClient(creds: RentvineCreds, fetchImpl: typeof fetch = fetch, pace = PACE_MS) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(creds.corporationId)) throw new Error('invalid Rentvine corporation id');
  const base = `https://${creds.corporationId}.rentvine.com/api/manager/`;
  const auth = 'Basic ' + Buffer.from(`${creds.apiKey}:${creds.apiSecret}`).toString('base64');
  let last = 0;
  async function get(path: string, params: Record<string, string>): Promise<unknown> {
    for (let attempt = 1; ; attempt++) {
      const wait = last + pace - Date.now();
      if (wait > 0) await sleep(wait);
      last = Date.now();
      const res = await fetchImpl(base + path + '?' + new URLSearchParams(params), {
        headers: { Authorization: auth, Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.ok) return res.json();
      if (res.status === 401 || res.status === 403) throw new RentvineError(res.status, 'Rentvine rejected the API key');
      if ((res.status === 429 || res.status >= 500) && attempt < 4) { await sleep(pace * 5 * attempt); continue; }
      throw new RentvineError(res.status, `Rentvine HTTP ${res.status}`);
    }
  }
  const rows = (answer: unknown): Obj[] =>
    Array.isArray(answer) ? answer as Obj[] : (answer && Array.isArray((answer as Obj).data) ? (answer as Obj).data as Obj[] : []);
  return {
    async ping(): Promise<void> { await get('properties', { page: '1', pageSize: '1' }); },
    async activeLeases(): Promise<Obj[]> {
      const out: Obj[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const batch = rows(await get('leases/export', { 'primaryLeaseStatusIDs[]': '2', page: String(page), pageSize: String(PAGE_SIZE) }));
        out.push(...batch);
        if (batch.length < PAGE_SIZE) return out;
      }
      throw new Error(`more than ${MAX_PAGES * PAGE_SIZE} active leases; stopped to be safe`);
    },
  };
}

export const INDEX_SCHEMA = `
CREATE TABLE IF NOT EXISTS segment_index (
  id            smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  source        text NOT NULL,
  generated_at  timestamptz NOT NULL,
  checked_at    timestamptz NOT NULL,
  digest        text NOT NULL,
  record_count  integer NOT NULL,
  records       jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS rentvine_status (
  id              smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_attempt_at timestamptz,
  last_ok_at      timestamptz,
  last_result     text,
  http_status     integer
);
`;

async function status(sql: Sql, ok: boolean, result: string, httpStatus: number | null) {
  await sql`INSERT INTO rentvine_status (id, last_attempt_at, last_ok_at, last_result, http_status)
            VALUES (1, now(), ${ok ? sql`now()` : null}, ${result.slice(0, 300)}, ${httpStatus})
            ON CONFLICT (id) DO UPDATE SET last_attempt_at = now(),
              last_ok_at = COALESCE(EXCLUDED.last_ok_at, rentvine_status.last_ok_at),
              last_result = EXCLUDED.last_result, http_status = EXCLUDED.http_status`;
}

/** Is the stored index older than FRESH_MS (or missing)? */
export async function indexIsStale(sql: Sql): Promise<boolean> {
  const rows = await sql<{ checked_at: Date }[]>`SELECT checked_at FROM segment_index WHERE id = 1`;
  return !rows[0] || Date.now() - rows[0].checked_at.getTime() > FRESH_MS;
}

/** One sync. Never throws; records the outcome in rentvine_status. */
export async function syncOnce(sql: Sql, getCreds: () => Promise<RentvineCreds | null>, fetchImpl: typeof fetch = fetch,
  pace = PACE_MS, log: Pick<Console, 'info' | 'warn' | 'error'> = console): Promise<string> {
  const creds = await getCreds();
  if (!creds) {
    await status(sql, false, 'no Rentvine key in app_secret (rentvine_api_key / rentvine_api_secret)', null);
    log.warn('[rentvine] no key in the database yet; skipping');
    return 'no-key';
  }
  try {
    const client = rentvineClient(creds, fetchImpl, pace);
    const rows = await client.activeLeases();
    const records = rows.map(toRecord).filter((r): r is IndexRecord => r !== null);
    const d = digest(records);
    const prev = (await sql<{ digest: string; record_count: number }[]>`SELECT digest, record_count FROM segment_index WHERE id = 1`)[0];
    const verdict = accept(prev?.record_count ?? null, records.length);
    if (!verdict.ok) {
      await status(sql, false, `kept previous index: ${verdict.why}`, 200);
      log.warn(`[rentvine] kept previous index: ${verdict.why}`);
      return 'rejected';
    }
    if (prev && prev.digest === d) {
      await sql`UPDATE segment_index SET checked_at = now() WHERE id = 1`;
      await status(sql, true, `unchanged (${records.length} leases)`, 200);
      log.info(`[rentvine] unchanged: ${records.length} leases`);
      return 'unchanged';
    }
    await sql`INSERT INTO segment_index (id, source, generated_at, checked_at, digest, record_count, records)
              VALUES (1, 'rentvine', now(), now(), ${d}, ${records.length}, ${sql.json(records as never)})
              ON CONFLICT (id) DO UPDATE SET source = EXCLUDED.source, generated_at = now(), checked_at = now(),
                digest = EXCLUDED.digest, record_count = EXCLUDED.record_count, records = EXCLUDED.records`;
    await status(sql, true, `updated (${records.length} leases from ${rows.length} rows)`, 200);
    log.info(`[rentvine] index updated: ${records.length} leases (${new Set(records.map((r) => r.zip)).size} ZIPs)`);
    return 'updated';
  } catch (err) {
    const code = err instanceof RentvineError ? err.status : null;
    const msg = err instanceof Error ? err.message : 'error';
    await status(sql, false, msg, code).catch(() => {});
    log.error(`[rentvine] sync failed: ${msg}`);
    return 'failed';
  }
}
