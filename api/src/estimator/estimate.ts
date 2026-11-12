// Own-data rent estimator: a faithful TypeScript port of
// wgc-lead-pipeline estimator/src/estimate.js (loadIndex .. estimateRent).
// Behaviour is pinned by estimator.golden.json, generated from the original
// JS on 2026-11-12 (see estimator.test.ts). Change both or neither.
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Lease {
  zip: string;
  city: string;
  type: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  rent: number;
  startDate: Date | null;
  uid: string | null;
}
export interface EstimateOpts { minComps?: number; now?: number; roundStep?: number; dedupe?: boolean }
export interface Estimate {
  low: number;
  high: number;
  comps: Array<{ zip: string; beds: string; sqft: number | string; ago_days: number | null; rent: number }>;
  meta: { tier: string; sampleSize: number; source: string };
}

function zip5(s: unknown): string | null {
  const m = String(s == null ? '' : s).match(/\d{5}/);
  return m ? m[0] : null;
}

export function loadIndex(records: any[]): Lease[] {
  if (!Array.isArray(records)) return [];
  return records.map((r) => ({
    zip: r.zip,
    city: r.city || '',
    type: r.type || '',
    beds: r.beds == null ? null : r.beds,
    baths: r.baths == null ? null : r.baths,
    sqft: r.sqft || null,
    rent: r.rent,
    startDate: r.startDate instanceof Date
      ? r.startDate
      : (r.date ? new Date(r.date) : (r.startDate ? new Date(r.startDate) : null)),
    uid: r.uid == null ? null : r.uid,
  })).filter((l) => l.zip && l.rent != null);
}

// Collapse a lease history to one record per physical unit, keeping each unit's
// MOST RECENT lease (current rent, no double-counting). Leases with no uid
// (no address to key on) are each kept as distinct. This is the estimate basis
// AND what stops the same home from appearing as three "different" comps.
export function dedupeByUnit(leases: Lease[]): Lease[] {
  const best = new Map<string, { l: Lease; t: number }>();
  const out: Lease[] = [];
  for (const l of leases) {
    if (!l.uid) { out.push(l); continue; }
    const t = l.startDate ? l.startDate.getTime() : -Infinity;
    const cur = best.get(l.uid);
    if (!cur || t > cur.t) best.set(l.uid, { l, t });
  }
  for (const { l } of best.values()) out.push(l);
  return out;
}

// --- Segment matching ---

// Form beds are '2'|'3'|'4'|'5+'. '5+' means >= 5; others are exact.
function bedsMatch(queryBeds: any, leaseBeds: number | null): boolean {
  if (queryBeds == null || queryBeds === '') return true; // beds is optional
  if (leaseBeds == null) return false;
  const q = String(queryBeds).trim();
  if (q === '5+') return leaseBeds >= 5;
  const n = Number(q);
  return Number.isFinite(n) ? leaseBeds === n : true;
}

function withinSqft(querySqft: number, leaseSqft: number | null, tol: number): boolean {
  if (!querySqft || !leaseSqft) return false;
  const lo = querySqft * (1 - tol);
  const hi = querySqft * (1 + tol);
  return leaseSqft >= lo && leaseSqft <= hi;
}

// Progressive widening: the first tier that yields >= MIN_COMPS wins; if none
// do, the widest non-empty tier is used so we always answer when data exists.
// Each tier is [label, predicate].
function buildTiers(query: any): Array<[string, (l: Lease) => boolean]> {
  const zip = query.zip;
  const zip3 = zip ? zip.slice(0, 3) : null;
  const sqft = Number(query.sqft) || 0;
  const beds = query.beds;
  return [
    ['zip+beds+sqft15', (l: Lease) => l.zip === zip && bedsMatch(beds, l.beds) && withinSqft(sqft, l.sqft, 0.15)],
    ['zip+beds+sqft25', (l: Lease) => l.zip === zip && bedsMatch(beds, l.beds) && withinSqft(sqft, l.sqft, 0.25)],
    ['zip+beds', (l: Lease) => l.zip === zip && bedsMatch(beds, l.beds)],
    ['zip+sqft25', (l: Lease) => l.zip === zip && withinSqft(sqft, l.sqft, 0.25)],
    ['zip', (l: Lease) => l.zip === zip],
    ['zip3+beds+sqft25', (l: Lease) => zip3 && l.zip.slice(0, 3) === zip3 && bedsMatch(beds, l.beds) && withinSqft(sqft, l.sqft, 0.25)],
    ['zip3+beds', (l: Lease) => zip3 && l.zip.slice(0, 3) === zip3 && bedsMatch(beds, l.beds)],
    ['zip3', (l: Lease) => zip3 && l.zip.slice(0, 3) === zip3],
  ];
}

function selectMatches(query: any, leases: Lease[], minComps: number): { label: string; matches: Lease[] } {
  let widest: { label: string; matches: Lease[] } = { label: 'none', matches: [] };
  for (const [label, pred] of buildTiers(query)) {
    const matches = leases.filter(pred);
    if (matches.length > widest.matches.length) widest = { label, matches };
    if (matches.length >= minComps) return { label, matches };
  }
  return widest; // best available, even if under minComps
}

// --- Range + comps ---

function percentile(sortedAsc: number[], p: number): number {
  if (!sortedAsc.length) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (sortedAsc.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

const roundTo = (n: number, step: number): number => Math.round(n / step) * step;

function daysAgo(startDate: Date | null, now: number): number | null {
  if (!startDate) return null;
  const d = Math.round((now - startDate.getTime()) / 86400000);
  return d < 0 ? 0 : d; // active leases can have near-future start dates
}

// Comps are chosen to read like Northpoint's "comparable records": same ZIP,
// same bedroom count (never mix bed counts — that is what makes them credible),
// a natural sqft spread, and FRESHEST FIRST (their "LAST SEEN" ordering). This
// is deliberately decoupled from the estimate's tight sqft tier, which can be
// too narrow to surface recent comps. Beds is kept matched even when it means
// showing fewer comps; geography widens (zip -> zip3) only if the same-beds
// pool is thin.
function selectCompPool(query: any, pool: Lease[]): Lease[] {
  const zip = query.zip;
  const zip3 = zip ? zip.slice(0, 3) : null;
  const beds = query.beds;
  const ladders = [
    (l: Lease) => l.zip === zip && bedsMatch(beds, l.beds),
    (l: Lease) => zip3 && l.zip.slice(0, 3) === zip3 && bedsMatch(beds, l.beds),
  ];
  let widest: Lease[] = [];
  for (const pred of ladders) {
    const m = pool.filter(pred);
    if (m.length > widest.length) widest = m;
    if (m.length >= 3) return m;
  }
  return widest;
}

function pickComps(query: any, pool: Lease[], n: number, now: number) {
  const sqft = Number(query.sqft) || 0;
  return selectCompPool(query, pool)
    .slice()
    .sort((a, b) => {
      const ta = a.startDate ? a.startDate.getTime() : 0;
      const tb = b.startDate ? b.startDate.getTime() : 0;
      if (tb !== ta) return tb - ta; // most recent lease first (Northpoint "LAST SEEN")
      const da = sqft && a.sqft ? Math.abs(a.sqft - sqft) : Number.MAX_SAFE_INTEGER;
      const db = sqft && b.sqft ? Math.abs(b.sqft - sqft) : Number.MAX_SAFE_INTEGER;
      return da - db; // then closest in size
    })
    .slice(0, n)
    .map((l) => ({
      zip: l.zip,
      beds: l.beds == null ? '' : String(l.beds),
      sqft: l.sqft || '',
      ago_days: daysAgo(l.startDate, now),
      rent: l.rent,
    }));
}

/**
 * Compute an own-data rent estimate for a segment query.
 *
 * @param {{zip:string, sqft?:number|string, beds?:string|number}} query
 * @param {Array} leases  normalized leases (from normalizeLeases)
 * @param {{minComps?:number, now?:number, roundStep?:number}} [opts]
 * @returns {{low:number, high:number, comps:Array, meta:object} | null}
 *          null when there is no usable data at all (caller falls back to the
 *          non-estimate "received" success shape — success.js detectShape).
 */
export function estimateRent(query: any, leases: Lease[], opts: EstimateOpts = {}): Estimate | null {
  const minComps = opts.minComps == null ? 5 : opts.minComps;
  const now = opts.now == null ? Date.now() : opts.now;
  const step = opts.roundStep == null ? 25 : opts.roundStep;

  const zip = zip5(query && query.zip);
  if (!zip || !Array.isArray(leases) || !leases.length) return null;

  // One observation per home (most recent lease) unless the caller opts out.
  const pool = opts.dedupe === false ? leases : dedupeByUnit(leases);

  const { label, matches } = selectMatches({ ...query, zip }, pool, minComps);
  if (!matches.length) return null;

  const rents = matches.map((l) => l.rent).sort((a, b) => a - b);
  const mid = percentile(rents, 0.5);
  let low = percentile(rents, 0.25);
  let high = percentile(rents, 0.75);

  // Thin sample (< 4 comps) => the IQR is noise; widen to a modest ±5% band
  // around the median so we never imply false precision.
  if (rents.length < 4) {
    low = mid * 0.95;
    high = mid * 1.05;
  }

  low = roundTo(low, step);
  high = roundTo(high, step);
  if (high < low) { const t = low; low = high; high = t; }

  // Never present a collapsed "$X – $X" point (strategy §5: show a RANGE, not a
  // false-precision single number). When comps cluster tightly, enforce a
  // minimum visible spread of ~5% of the median (>= 2 rounding steps), expanded
  // symmetrically around the midpoint.
  const minSpread = Math.max(2 * step, roundTo(mid * 0.05, step));
  if (high - low < minSpread) {
    low = roundTo(mid - minSpread / 2, step);
    high = roundTo(mid + minSpread / 2, step);
  }

  return {
    low,
    high,
    comps: pickComps({ ...query, zip }, pool, 3, now),
    meta: { tier: label, sampleSize: matches.length, source: 'own-lease-history' },
  };
}
