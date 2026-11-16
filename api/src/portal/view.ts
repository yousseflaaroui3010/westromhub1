// Turns a stored snapshot into what ONE role may see. Runs on the server, so
// anything a role lacks never reaches that person's browser.
// The output matches the page's Portfolio type (src/portfolio/data.ts).

import { permissions, tenantLabel, type Role } from './access';
import type { PortfolioData, PortfolioHome } from './rentvine';

type Style = 'ranch' | 'twostory' | 'cottage' | 'modern' | 'duplex';

const hash = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

function styleOf(h: PortfolioHome): Style {
  const u = h.units[0];
  if (h.units.length > 1) return 'duplex';
  if ((u?.sqft ?? 0) >= 2300) return 'twostory';
  if (h.yearBuilt && h.yearBuilt < 1980) return 'cottage';
  if (h.yearBuilt && h.yearBuilt >= 2016) return 'modern';
  return 'ranch';
}

/** "Morgan Family Trust" -> "Morgan"; "13 Kegs LLC" -> "13 Kegs"; a Texas series LLC -> its parent. */
export function shortName(name: string): string {
  const parent = name.match(/\bseries of (.+)$/i)?.[1] ?? name;
  const cleaned = parent
    .replace(/[,.]/g, ' ')
    .replace(/\b(llc|inc|ltd|lp|llp|co|corp|company|trust|family|propert\w*|holdings|investments?|group|real estate|rentals?|revocable|living|the|and|&)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  const words = (cleaned || parent).split(' ').filter(Boolean);
  let out = words[0] ?? name;
  for (const w of words.slice(1)) { if ((out + ' ' + w).length > 14) break; out += ' ' + w; }
  return out.slice(0, 16);
}

function docKind(name: string): string {
  const n = name.toLowerCase();
  if (/(management agreement|pma|txr.?2201)/.test(n)) return 'agreement';
  if (/(addend|flood|hoa|lead|multiple property|access)/.test(n)) return 'addendum';
  if (/lease/.test(n)) return 'lease';
  if (/(inspection|move.?out|move.?in|zinspector)/.test(n)) return 'inspection';
  if (/(1099|w-?9|tax)/.test(n)) return 'tax';
  if (/statement/.test(n)) return 'statement';
  return 'addendum';
}

const DAY = 86_400_000;
const daysUntil = (iso: string, now: number) => Math.round((Date.parse(`${iso}T12:00:00Z`) - now) / DAY);

function nextProtestDeadline(now: number): string {
  const d = new Date(now);
  const y = d.getUTCMonth() > 4 || (d.getUTCMonth() === 4 && d.getUTCDate() > 15) ? d.getUTCFullYear() + 1 : d.getUTCFullYear();
  return `${y}-05-15`;
}

export const WESTROM_CONTACT = { name: 'Westrom Group', title: 'Your property management team', phone: '(817) 445-1108', email: 'info@westromgroup.com' };

/** `added`: home id → when staff added its picture (a newer picture gets a new address, so browsers fetch it). */
export function viewFor(data: PortfolioData, role: Role, now = Date.now(), added: Map<string, number> = new Map()) {
  const perms = permissions(role);
  const photo = (homeId: string) => `/api/portal/portfolios/${encodeURIComponent(data.id)}/photo/${encodeURIComponent(homeId)}`;

  const homes = !perms.has('homes:view') ? [] : data.homes.map((h) => {
    const first = h.units[0];
    const h32 = hash(h.id);
    return {
      id: h.id, address: h.address, city: h.city, zip: h.zip, county: h.county,
      style: styleOf(h), palette: h32 % 5, photo: added.has(h.id) ? `${photo(h.id)}?v=${added.get(h.id)}` : h.photoUrl || h.photoFile ? photo(h.id) : undefined,
      beds: first?.beds ?? null, baths: first?.baths ?? null, sqft: first?.sqft ?? null, yearBuilt: h.yearBuilt,
      hoa: null,
      marketLowCents: perms.has('market:view') ? h.marketLowCents : null,
      marketHighCents: perms.has('market:view') ? h.marketHighCents : null,
      units: h.units.map((u) => {
        if (!perms.has('tenancy:view')) return { label: h.units.length > 1 ? u.label || null : null, status: 'occupied', rentCents: 0, lease: null, payments: [] };
        const l = u.lease;
        const endingSoon = l?.end && !l.monthToMonth && daysUntil(l.end, now) <= 60;
        return {
          label: h.units.length > 1 ? (u.label || `Unit ${u.id}`) : null,
          status: !l ? 'vacant' : endingSoon ? 'renewal' : 'occupied',
          rentCents: u.rentCents ?? 0,
          lease: l ? { tenants: l.tenants.map((t) => tenantLabel(t, perms)), start: l.start, end: l.end, monthToMonth: l.monthToMonth, depositCents: l.depositCents ?? 0 } : null,
          payments: [],
        };
      }),
      workOrders: [],
    };
  });

  const money = perms.has('money:view');
  const chronological = [...data.statements].sort((a, b) => (a.to ?? '').localeCompare(b.to ?? ''));
  const ledger = !money ? [] : chronological.filter((s) => s.to).map((s) => ({
    month: s.to!.slice(0, 7), rentCents: s.incomeCents, feesCents: s.expenseCents, repairsCents: 0, paidCents: s.paidCents, expensesCents: s.expenseCents,
  }));
  const statements = !money ? [] : data.statements.filter((s) => s.to).map((s) => ({
    id: s.id, period: s.to!.slice(0, 7), incomeCents: s.incomeCents, expenseCents: s.expenseCents, paidCents: s.paidCents, reserveCents: s.reserveCents ?? 0,
    href: perms.has('statements:download') ? `/api/portal/portfolios/${encodeURIComponent(data.id)}/statements/${encodeURIComponent(s.id)}` : undefined,
  }));

  const keyDates: { date: string; title: string; detail: string; kind: string; href?: string }[] = [];
  if (perms.has('alerts:view')) {
    if (perms.has('tenancy:view')) {
      for (const h of data.homes) for (const u of h.units) {
        const end = u.lease?.end;
        if (end && !u.lease!.monthToMonth) { const d = daysUntil(end, now); if (d >= 0 && d <= 150) keyDates.push({ date: end, title: 'Lease ends', detail: h.address, kind: 'lease' }); }
      }
    }
    keyDates.sort((a, b) => a.date.localeCompare(b.date));
    keyDates.splice(3);
    keyDates.push({ date: nextProtestDeadline(now), title: 'Property tax protest deadline', detail: `Check the appraisal notice for ${data.homes.length === 1 ? 'your home' : `all ${data.homes.length} homes`}`, kind: 'tax', href: '/taxes' });
  }

  const documents = !perms.has('documents:view') ? [] : data.files.map((f) => ({
    name: f.name.replace(/\.[a-z0-9]{2,4}$/i, ''), kind: docKind(f.name), date: f.created ?? '', fileId: f.id,
    href: `/api/portal/portfolios/${encodeURIComponent(data.id)}/files/${encodeURIComponent(f.id)}`,
  }));

  return {
    id: data.id,
    name: data.name,
    shortName: shortName(data.name),
    stage: role === 'prospect' ? 'prospect' : 'owner',
    since: data.since ? data.since.slice(0, 4) : '',
    homes, ledger, statements, feed: [], keyDates, documents,
    manager: WESTROM_CONTACT,
    real: true,
    // Owner names and emails only for staff, who send the invites.
    contacts: role === 'staff' ? data.contacts : undefined,
  };
}
