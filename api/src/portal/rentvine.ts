// Reads owner portfolios from Rentvine for the owner portal. Read only.
//
// Endpoints and shapes follow what the staff dashboard (Westrom_Security_Deposit,
// backend/clients/rentvine_client.py and services/owner_portfolios.py) already
// reads: /portfolios, /owners, /properties, /properties/units/export,
// /leases/export (active), /portfolios/{id}/statements, /paths/1/contents (a
// record's Files) and /properties/listings/search (the listing photo on
// cdn.rentvine.com). Every parser is defensive: a missing field becomes null,
// never an exception, and only the fields the page shows are kept.

type Obj = Record<string, unknown>;

export interface RvApi {
  get(path: string, params?: Record<string, string>): Promise<unknown>;
  pages(path: string, params: Record<string, string>, maxPages: number): Promise<Obj[]>;
}

/** Raise when PortfolioData gains a field, so saved snapshots are read again. */
export const SNAPSHOT_VERSION = 2;

export const RENTVINE_CDN = 'https://cdn.rentvine.com/';
const PORTFOLIO_TYPE = '11';
// Rentvine object types (Rentvine support, as used by the deposit dashboard): a
// single-family home keeps its files on the unit (7), others on the property (6).
const UNIT_TYPE = '7', PROPERTY_TYPE = '6';
const IMAGE_NAME = /\.(jpe?g|png|webp|gif|avif)$/i;

/** The first picture among a record's files (folders and other records' files left out). */
function firstImage(answer: unknown, objectId: string, objectType: string): string | null {
  const list = Array.isArray(answer) ? answer as Obj[]
    : ['contents', 'files', 'items', 'data'].map((k) => (answer as Obj | null)?.[k]).find(Array.isArray) as Obj[] | undefined ?? rows(answer);
  for (const r of list) {
    const f = parseFile(r, objectId, objectType);
    const inner = (r.file ?? r.attachment ?? r) as Obj;
    const kind = text(inner.type ?? inner.mimeType ?? inner.contentType).toLowerCase();
    if (f && /^\d{1,12}$/.test(f.id) && (kind.startsWith('image/') || IMAGE_NAME.test(f.name))) return f.id;
  }
  return null;
}

/** One record's files: the attachments path first, the paths listing as the fallback (as the deposit dashboard reads them). */
async function recordFiles(api: RvApi, objectId: string, objectType: string): Promise<unknown> {
  try { return await api.get(`files/attachments/${objectType}/${encodeURIComponent(objectId)}`); }
  catch { return api.get('paths/1/contents', { objectID: objectId, objectTypeID: objectType }); }
}

const text = (v: unknown): string => (v == null ? '' : String(v).trim());
const num = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const cents = (v: unknown): number | null => { const n = num(v); return n == null ? null : Math.round(n * 100); };
const day = (v: unknown): string | null => text(v).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
const yes = (v: unknown) => ['1', 'true', 'True'].includes(text(v));
const unwrap = (row: Obj, key: string): Obj => (row && typeof row[key] === 'object' && row[key] !== null ? row[key] as Obj : row);
export const rows = (answer: unknown): Obj[] =>
  Array.isArray(answer) ? answer as Obj[] : (answer && Array.isArray((answer as Obj).data) ? (answer as Obj).data as Obj[] : []);

// ── The shared lists (one read serves every portfolio) ─────────────────────

export interface PortfolioRow { id: string; name: string; active: boolean; contacts: { contactId: string; name: string; share: number | null }[] }
export interface OwnerRow { contactId: string; name: string; email: string | null }
export interface PropertyRow {
  id: string; portfolioId: string; address: string; city: string; state: string; zip: string; county: string;
  yearBuilt: number | null; since: string | null;
}
export interface UnitRow { id: string; propertyId: string; label: string; beds: number | null; baths: number | null; sqft: number | null; rentCents: number | null; depositCents: number | null }
export interface LeaseRow { unitId: string; start: string | null; end: string | null; monthToMonth: boolean; rentCents: number | null; depositCents: number | null; tenants: string[] }
export interface Lists { portfolios: PortfolioRow[]; owners: OwnerRow[]; properties: PropertyRow[]; units: UnitRow[]; leases: LeaseRow[] }

export function parsePortfolio(row: Obj): PortfolioRow | null {
  const p = unwrap(row, 'portfolio');
  const id = text(p.portfolioID ?? p.id);
  if (!id) return null;
  const raw = Array.isArray(p.contacts) ? p.contacts : Array.isArray(row.contacts) ? row.contacts : [];
  const contacts = (raw as Obj[]).map((c) => unwrap(c, 'contact')).map((c) => ({
    contactId: text(c.contactID ?? c.id), name: text(c.name), share: num(c.percentOwned),
  })).filter((c) => c.contactId || c.name);
  return { id, name: text(p.name) || `Portfolio ${id}`, active: p.isActive === undefined ? true : yes(p.isActive), contacts };
}

export function parseOwner(row: Obj): OwnerRow | null {
  const c = unwrap(row, 'contact');
  const contactId = text(c.contactID ?? c.id);
  if (!contactId) return null;
  const email = text(c.email).toLowerCase();
  return { contactId, name: text(c.name), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null };
}

export function parseProperty(row: Obj): PropertyRow | null {
  const p = unwrap(row, 'property');
  const id = text(p.propertyID ?? p.id);
  const portfolioId = text(p.portfolioID ?? (row.portfolio as Obj | undefined)?.portfolioID);
  if (!id || !portfolioId || (p.isActive !== undefined && !yes(p.isActive))) return null;
  const year = num(p.yearBuilt);
  return {
    id, portfolioId,
    address: [text(p.address), text(p.address2)].filter(Boolean).join(' ') || text(p.name) || `Home ${id}`,
    city: text(p.city), state: text(p.stateID ?? p.state) || 'TX', zip: text(p.postalCode ?? p.zip).slice(0, 5), county: text(p.county),
    yearBuilt: year && year > 1800 && year < 2100 ? year : null, since: day(p.dateContractBegins),
  };
}

export function parseUnit(row: Obj): UnitRow | null {
  const u = unwrap(row, 'unit');
  const id = text(u.unitID ?? u.id);
  const propertyId = text(u.propertyID ?? (row.property as Obj | undefined)?.propertyID);
  if (!id || !propertyId) return null;
  const full = num(u.fullBaths), half = num(u.halfBaths);
  const sqft = num(u.size ?? u.squareFeet ?? u.sqft);
  return {
    id, propertyId, label: text(u.name ?? u.unitNumber),
    beds: num(u.beds), baths: full != null ? full + (half ?? 0) / 2 : null,
    sqft: sqft && sqft >= 200 && sqft <= 20_000 ? Math.round(sqft) : null,
    rentCents: cents(u.rent), depositCents: cents(u.deposit),
  };
}

export function parseLease(row: Obj): LeaseRow | null {
  const l = unwrap(row, 'lease');
  const unit = (row.unit ?? {}) as Obj;
  const unitId = text(l.unitID ?? unit.unitID);
  if (!unitId) return null;
  const rawTenants = Array.isArray(l.tenants) ? l.tenants : Array.isArray(row.tenants) ? row.tenants : [];
  return {
    unitId, start: day(l.startDate), end: day(l.endDate), monthToMonth: yes(l.isMonthToMonth),
    rentCents: cents(unit.rent ?? l.rent ?? l.rentAmount), depositCents: cents(unit.deposit ?? l.deposit),
    tenants: (rawTenants as Obj[]).map((t) => text(unwrap(t, 'contact').name ?? t.name)).filter(Boolean).slice(0, 6),
  };
}

export async function loadLists(api: RvApi): Promise<Lists> {
  const keep = <T>(arr: Obj[], fn: (r: Obj) => T | null) => arr.map(fn).filter((x): x is T => x !== null);
  const portfolios = keep(await api.pages('portfolios', {}, 60), parsePortfolio);
  const owners = keep(await api.pages('owners', {}, 80), parseOwner);
  const properties = keep(await api.pages('properties', {}, 100), parseProperty);
  const units = keep(await api.pages('properties/units/export', {}, 120), parseUnit);
  const leases = keep(await api.pages('leases/export', { 'primaryLeaseStatusIDs[]': '2' }, 120), parseLease);
  return { portfolios, owners, properties, units, leases };
}

export interface CatalogEntry { id: string; name: string; homes: number; cities: string[] }

/** Active portfolios that own at least one active home, for the staff picker. */
export function catalog(lists: Lists): CatalogEntry[] {
  const homes = new Map<string, PropertyRow[]>();
  for (const p of lists.properties) homes.set(p.portfolioId, [...(homes.get(p.portfolioId) ?? []), p]);
  return lists.portfolios
    .filter((p) => p.active && homes.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, homes: homes.get(p.id)!.length, cities: [...new Set(homes.get(p.id)!.map((h) => h.city).filter(Boolean))].slice(0, 4) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── One portfolio ───────────────────────────────────────────────────────────

export interface PortfolioUnit {
  id: string; label: string; beds: number | null; baths: number | null; sqft: number | null; rentCents: number | null;
  lease: { tenants: string[]; start: string | null; end: string | null; monthToMonth: boolean; depositCents: number | null } | null;
}
export interface PortfolioHome {
  id: string; address: string; city: string; state: string; zip: string; county: string; yearBuilt: number | null;
  units: PortfolioUnit[]; photoUrl: string | null;
  /** When the listing has no primary picture: a picture from the listing's photos or the home's Files tab. */
  photoFile?: { kind: 'listing' | 'file'; id: string } | null; marketLowCents: number | null; marketHighCents: number | null;
}
export interface PortfolioData {
  id: string; name: string; since: string | null;
  contacts: { name: string; email: string | null; share: number | null }[];
  homes: PortfolioHome[];
  statements: { id: string; from: string | null; to: string | null; incomeCents: number; expenseCents: number; paidCents: number; reserveCents: number | null }[];
  files: { id: string; name: string; created: string | null }[];
  notes: string[];
  /** Shape version: an older snapshot is rebuilt on its next view. */
  v?: number;
}

export type Estimator = (q: { zip: string; sqft: number; beds: string | null }) => Promise<{ low: number; high: number } | null>;

function parseStatement(row: Obj) {
  const s = unwrap(row, 'statement');
  const id = text(s.statementID ?? s.id);
  if (!id) return null;
  return {
    id, from: day(s.startDate), to: day(s.endDate),
    incomeCents: cents(s.totalIncomeAmount) ?? 0, expenseCents: cents(s.totalExpenseAmount) ?? 0,
    paidCents: cents(s.totalDistributionAmount) ?? 0, reserveCents: cents(s.reserveAmount),
  };
}

export function parseFile(row: Obj, objectId: string, objectType: string) {
  const f = (row.file ?? row.attachment ?? row) as Obj;
  const id = text(f.fileID ?? f.id);
  const name = text(f.name ?? f.fileName ?? f.originalName ?? f.filename);
  if (!id || !name || yes(f.isFolder) || yes(row.isFolder)) return null;
  const oid = text(f.objectID ?? row.objectID), otype = text(f.objectTypeID ?? row.objectTypeID);
  if (oid && otype && (oid !== objectId || otype !== objectType)) return null; // another record's file
  return { id, name: name.slice(0, 160), created: day(f.dateTimeCreated ?? f.dateCreated ?? f.created ?? row.dateTimeCreated) };
}

const street = (address: string) => address.replace(/\s+(apt|unit|#|suite|ste)\b.*$/i, '').trim();

/** One portfolio, unredacted. Optional parts (statements, files, photos, market) fail soft into notes. */
export async function buildPortfolio(api: RvApi, lists: Lists, portfolioId: string, estimate: Estimator | null): Promise<PortfolioData> {
  const pf = lists.portfolios.find((p) => p.id === portfolioId);
  if (!pf) throw new Error('That portfolio is not in Rentvine.');
  const notes: string[] = [];
  const emailOf = new Map(lists.owners.map((o) => [o.contactId, o.email]));
  const leaseOf = new Map(lists.leases.map((l) => [l.unitId, l]));
  const props = lists.properties.filter((p) => p.portfolioId === portfolioId);

  const homes: PortfolioHome[] = [];
  for (const p of props) {
    const units: PortfolioUnit[] = lists.units.filter((u) => u.propertyId === p.id).map((u) => {
      const l = leaseOf.get(u.id);
      return {
        id: u.id, label: u.label, beds: u.beds, baths: u.baths, sqft: u.sqft, rentCents: l?.rentCents ?? u.rentCents,
        lease: l ? { tenants: l.tenants, start: l.start, end: l.end, monthToMonth: l.monthToMonth, depositCents: l.depositCents ?? u.depositCents } : null,
      };
    });
    // The home's picture, in the order the deposit dashboard looks: the listing's
    // main picture, the listing's photos, then the unit's and property's Files.
    let photoUrl: string | null = null;
    let photoFile: PortfolioHome['photoFile'] = null;
    let listingId = '';
    try {
      const found = rows(await api.get('properties/listings/search', { search: street(p.address), pageSize: '25' }));
      const ids = new Set(units.map((u) => u.id));
      const hit = found.find((r) => ids.has(text((r.unit as Obj | undefined)?.unitID ?? (r.listing as Obj | undefined)?.unitID)));
      const img = (hit?.image ?? {}) as Obj;
      const url = text(img.large ?? img.medium ?? img.small);
      if (url.startsWith(RENTVINE_CDN)) photoUrl = url;
      listingId = text((hit?.listing as Obj | undefined)?.propertyListingID);
    } catch { /* try the files below */ }
    if (!photoUrl && /^\d{1,12}$/.test(listingId)) {
      try {
        const id = firstImage(await api.get(`listings/${listingId}/files`), '', '');
        if (id) photoFile = { kind: 'listing', id };
      } catch { /* next */ }
    }
    for (const [oid, otype] of [...units.map((u) => [u.id, UNIT_TYPE]), [p.id, PROPERTY_TYPE]]) {
      if (photoUrl || photoFile) break;
      try {
        const id = firstImage(await recordFiles(api, oid, otype), oid, otype);
        if (id) photoFile = { kind: 'file', id };
      } catch { /* next */ }
    }
    if (!photoUrl && !photoFile) notes.push(`No picture in Rentvine for ${p.address}.`);
    let marketLowCents: number | null = null, marketHighCents: number | null = null;
    const first = units[0];
    if (estimate && first?.sqft && p.zip) {
      try {
        const e = await estimate({ zip: p.zip, sqft: first.sqft, beds: first.beds != null ? String(first.beds) : null });
        if (e) { marketLowCents = Math.round(e.low * 100); marketHighCents = Math.round(e.high * 100); }
      } catch { /* no estimate */ }
    }
    homes.push({ id: p.id, address: p.address, city: p.city, state: p.state, zip: p.zip, county: p.county, yearBuilt: p.yearBuilt, units, photoUrl, photoFile, marketLowCents, marketHighCents });
  }

  let statements: PortfolioData['statements'] = [];
  try {
    statements = rows(await api.get(`portfolios/${encodeURIComponent(portfolioId)}/statements`, { page: '1', pageSize: '50' }))
      .map(parseStatement).filter((s): s is NonNullable<ReturnType<typeof parseStatement>> => s !== null)
      .sort((a, b) => (b.to ?? '').localeCompare(a.to ?? '')).slice(0, 12);
  } catch { notes.push('Statements did not come from Rentvine.'); }

  let files: PortfolioData['files'] = [];
  try {
    files = rows(await api.get('paths/1/contents', { objectID: portfolioId, objectTypeID: PORTFOLIO_TYPE }))
      .map((r) => parseFile(r, portfolioId, PORTFOLIO_TYPE)).filter((f): f is NonNullable<ReturnType<typeof parseFile>> => f !== null)
      .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? '')).slice(0, 40);
  } catch { notes.push('The portfolio’s Files did not come from Rentvine.'); }

  const since = props.map((p) => p.since).filter((d): d is string => !!d).sort()[0] ?? null;
  return {
    id: pf.id, name: pf.name, since,
    contacts: pf.contacts.map((c) => ({ name: c.name, email: emailOf.get(c.contactId) ?? null, share: c.share })),
    homes, statements, files, notes, v: SNAPSHOT_VERSION,
  };
}
