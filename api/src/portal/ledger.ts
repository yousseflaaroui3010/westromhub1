// An owner's money, month by month, from Rentvine's own transactions (as the
// deposit dashboard's Owner statements reads them: owner_portfolios.ledger and
// statement_reader.month_report). Rentvine keeps saved statements for very few
// owners, so the transactions are the record: rent collected, bills paid,
// Westrom's fee and what was paid to the owner, for the last 12 months.
//
// One sweep of GET /accounting/transactions/search (posted in the last year,
// not voided) covers the whole account; rows are kept per portfolio.

import { cents, day, rows, text, unwrap, yes, type Obj } from './rentvine';

/** Rentvine's transaction types that move an owner's money: +1 in, -1 out (statement_reader.MONEY). */
export const MONEY: Record<number, [1 | -1, Kind]> = {
  2: [1, 'rent'], 4: [-1, 'rent'],
  5: [1, 'owner in'], 6: [-1, 'owner in'],
  12: [1, 'other'], 13: [-1, 'other'],
  8: [-1, 'bill'], 18: [1, 'bill'],
  14: [-1, 'fee'], 9: [-1, 'fee'],
  16: [-1, 'paid'], 17: [1, 'paid'],
  19: [-1, 'deposit'], 20: [-1, 'deposit'], 21: [1, 'deposit'],
};
export type Kind = 'rent' | 'owner in' | 'other' | 'bill' | 'fee' | 'paid' | 'deposit';
/** A bill on the management fee account is Westrom's fee, not a bill (owner, 2026-11-12). */
const MANAGEMENT_FEE = /management\s+fee|mgmt\.?\s+fee/i;

export interface Tx { date: string; typeId: number; amountCents: number; description: string | null; homeId: string | null; home: string | null }

export function parseTx(row: Obj): (Tx & { portfolioId: string }) | null {
  const t = unwrap(row, 'transaction');
  const portfolioId = text((row.portfolio as Obj | undefined)?.portfolioID ?? t.portfolioID);
  const typeId = Number(text(t.transactionTypeID));
  const date = day(t.datePosted);
  if (!portfolioId || !date || yes(t.isVoided) || !(typeId in MONEY)) return null;
  const prop = (row.property ?? {}) as Obj;
  return {
    portfolioId, date, typeId, amountCents: Math.abs(cents(t.amount) ?? 0),
    description: text(t.description).slice(0, 160) || null,
    homeId: text(prop.propertyID) || null, home: text(prop.address ?? prop.name).slice(0, 120) || null,
  };
}

export function kindOf(t: Tx): { sign: 1 | -1; kind: Kind } {
  const [sign, kind] = MONEY[t.typeId];
  return { sign, kind: kind === 'bill' && MANAGEMENT_FEE.test(t.description ?? '') ? 'fee' : kind };
}

export interface MoneyMonth { month: string; rentCents: number; otherInCents: number; ownerInCents: number; billsCents: number; feesCents: number; paidCents: number }
export interface LedgerSummary {
  months: MoneyMonth[];
  totals: Omit<MoneyMonth, 'month'>;
  /** Bills paid for the homes (repairs, services), newest first. */
  bills: { date: string; home: string | null; homeId: string | null; description: string | null; amountCents: number }[];
  lastPaid: string | null;
}

const monthsBack = (now: number, n: number) => {
  const d = new Date(now); const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push(m.toISOString().slice(0, 7));
  }
  return out;
};

/** The last 12 months (oldest first, this month last), the year's totals and the bills. */
export function summarize(txs: Tx[], now = Date.now()): LedgerSummary {
  const keys = monthsBack(now, 12);
  const by = new Map(keys.map((k) => [k, { month: k, rentCents: 0, otherInCents: 0, ownerInCents: 0, billsCents: 0, feesCents: 0, paidCents: 0 }]));
  const bills: LedgerSummary['bills'] = [];
  let lastPaid: string | null = null;
  for (const t of txs) {
    const m = by.get(t.date.slice(0, 7));
    if (!m) continue;
    const { sign, kind } = kindOf(t);
    const c = sign * t.amountCents;
    if (kind === 'rent') m.rentCents += c;
    else if (kind === 'other') m.otherInCents += c;
    else if (kind === 'owner in') m.ownerInCents += c;
    else if (kind === 'bill') { m.billsCents -= c; if (t.typeId === 8) bills.push({ date: t.date, home: t.home, homeId: t.homeId, description: t.description, amountCents: t.amountCents }); }
    else if (kind === 'fee') m.feesCents -= c;
    else if (kind === 'paid') { m.paidCents -= c; if (t.typeId === 16 && (!lastPaid || t.date > lastPaid)) lastPaid = t.date; }
  }
  const months = keys.map((k) => by.get(k)!);
  const totals = months.reduce((s, m) => ({
    rentCents: s.rentCents + m.rentCents, otherInCents: s.otherInCents + m.otherInCents, ownerInCents: s.ownerInCents + m.ownerInCents,
    billsCents: s.billsCents + m.billsCents, feesCents: s.feesCents + m.feesCents, paidCents: s.paidCents + m.paidCents,
  }), { rentCents: 0, otherInCents: 0, ownerInCents: 0, billsCents: 0, feesCents: 0, paidCents: 0 });
  bills.sort((a, b) => b.date.localeCompare(a.date));
  return { months, totals, bills: bills.slice(0, 40), lastPaid };
}

export const LEDGER_PAGE = 100;
/** One page of the account's transactions posted since `since` (YYYY-MM-DD). */
export async function ledgerPage(api: { get(path: string, params?: Record<string, string>): Promise<unknown> }, since: string, page: number) {
  return rows(await api.get('accounting/transactions/search', { datePostedMin: since, isVoided: 'false', page: String(page), pageSize: String(LEDGER_PAGE) }));
}
