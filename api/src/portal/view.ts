// Turns a stored snapshot into what ONE role may see. Runs on the server, so
// anything a role lacks never reaches that person's browser.
// The output matches the page's Portfolio type (src/portfolio/data.ts).

import { permissions, tenantLabel, type Role } from './access';
import type { LedgerSummary } from './ledger';
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
/** `street`: a street picture can be asked for any home (Street View is set up); a miss falls back to the drawing in the browser. */
/** `ledger`: the portfolio's last 12 months from Rentvine's transactions (null until the first sweep). */
export function viewFor(data: PortfolioData, role: Role, now = Date.now(), added: Map<string, number> = new Map(), street = false, ledger: LedgerSummary | null = null) {
  const perms = permissions(role);
  const photo = (homeId: string) => `/api/portal/portfolios/${encodeURIComponent(data.id)}/photo/${encodeURIComponent(homeId)}`;

  const homes = !perms.has('homes:view') ? [] : data.homes.map((h) => {
    const first = h.units[0];
    const h32 = hash(h.id);
    return {
      id: h.id, address: h.address, city: h.city, zip: h.zip, county: h.county,
      style: styleOf(h), palette: h32 % 5, photo: added.has(h.id) ? `${photo(h.id)}?v=${added.get(h.id)}` : h.photoUrl || h.photoFile || street ? photo(h.id) : undefined,
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
  // Month by month from Rentvine's transactions when the sweep has them; Rentvine's
  // saved statements otherwise (few owners have any).
  const moved = ledger && (ledger.totals.rentCents || ledger.totals.paidCents || ledger.totals.billsCents || ledger.totals.feesCents);
  const months = !money ? [] : moved
    ? ledger!.months.map((m) => ({ month: m.month, rentCents: m.rentCents + m.otherInCents, feesCents: m.feesCents, repairsCents: m.billsCents, paidCents: m.paidCents }))
    : chronological.filter((s) => s.to).map((s) => ({
      month: s.to!.slice(0, 7), rentCents: s.incomeCents, feesCents: s.expenseCents, repairsCents: 0, paidCents: s.paidCents, expensesCents: s.expenseCents,
    }));
  const year = money && moved ? { ...ledger!.totals, lastPaid: ledger!.lastPaid, months: ledger!.months.length } : undefined;

  // Care: the repairs and services paid for the homes (Rentvine), and the
  // maintenance requests and how fast they were closed (PropertyMeld).
  const meldsSetUp = data.homes.some((h) => h.melds !== undefined);
  const melds = !perms.has('homes:view') ? [] : data.homes.flatMap((h) => (h.melds ?? []).map((m) => ({
    ...m, home: h.address, days: m.opened && m.closed ? Math.max(0, Math.round((Date.parse(m.closed) - Date.parse(m.opened)) / 86_400_000)) : null,
  }))).sort((a, b) => (b.opened ?? '').localeCompare(a.opened ?? ''));
  // Rentvine's generic bill labels say nothing to an owner: shown as "Invoice paid".
  const billLabel = (d: string | null) => (!d || /^(uploaded )?invoice$/i.test(d.trim()) ? 'Invoice paid' : d);
  const repairs = !money || !moved ? [] : ledger!.bills.map((b) => ({ date: b.date, home: b.home, description: billLabel(b.description), amountCents: b.amountCents }));
  const care = (repairs.length || melds.length || meldsSetUp) ? { repairs, melds, meldsSetUp } : undefined;

  // What happened lately, newest first: payments to the owner, requests closed, leases signed.
  const feed: { date: string; kind: string; title: string; body: string; isNew?: boolean }[] = [];
  if (money && moved) {
    for (const m of [...ledger!.months].reverse().slice(0, 3)) {
      if (m.paidCents > 0) {
        feed.push({
          date: ledger!.lastPaid && ledger!.lastPaid.startsWith(m.month) ? ledger!.lastPaid : `${m.month}-28`, kind: 'payment',
          title: `${dollars(m.paidCents)} paid to you`,
          body: `${dollars(m.rentCents + m.otherInCents)} of rent came in for ${monthName(m.month)}; after Westrom's fee and ${m.billsCents ? `${dollars(m.billsCents)} of bills` : 'no bills'}, ${dollars(m.paidCents)} went to your account.`,
        });
      }
    }
  }
  for (const m of melds.slice(0, 12)) {
    if (m.closed) {
      const took = m.days == null ? '' : `: ${m.days === 0 ? 'the same day' : `${m.days} day${m.days === 1 ? '' : 's'}`}`;
      feed.push({ date: m.closed, kind: 'repair', title: `Done: ${m.title}`, body: `${m.home}. Opened ${shortDay(m.opened)}, closed ${shortDay(m.closed)}${took}.` });
    } else if (m.open && m.opened) {
      feed.push({ date: m.opened, kind: 'repair', title: `In progress: ${m.title}`, body: `${m.home}. Opened ${shortDay(m.opened)}; we are on it.` });
    }
  }
  if (perms.has('tenancy:view')) {
    for (const h of data.homes) for (const u of h.units) {
      const start = u.lease?.start;
      if (start && daysUntil(start, now) > -120 && daysUntil(start, now) <= 0) {
        feed.push({ date: start, kind: 'renewal', title: `Lease started at ${h.address}`, body: `Leased at ${dollars(u.rentCents ?? 0)} a month${u.lease!.end ? ` until ${monthName(u.lease!.end.slice(0, 7))}` : ''}.` });
      }
    }
  }
  feed.sort((a, b) => b.date.localeCompare(a.date));
  feed.splice(6);
  if (feed[0] && daysUntil(feed[0].date, now) >= -10) feed[0].isNew = true;
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
    homes, ledger: months, statements, feed, keyDates, documents, year, care,
    manager: WESTROM_CONTACT,
    real: true,
    // Owner names and emails only for staff, who send the invites.
    contacts: role === 'staff' ? data.contacts : undefined,
  };
}

const dollars = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym: string) => `${MONTH_NAMES[Number(ym.slice(5, 7)) - 1] ?? ''} ${ym.slice(0, 4)}`;
const shortDay = (d: string | null) => (d ? `${MONTH_NAMES[Number(d.slice(5, 7)) - 1]?.slice(0, 3) ?? ''} ${Number(d.slice(8, 10))}` : '');
