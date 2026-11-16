// MOCKUP DATA. Every person, address and number below is invented.
//
// The shapes follow what the staff dashboard (Westrom_Security_Deposit) already
// reads, so the real version can be fed from the same sources:
//   portfolio, owners (name, email, share), homes      Rentvine /portfolios, /owners, /properties
//   lease facts (tenants, start, end, rent, deposit)    Rentvine /leases (owner_portfolios._lease_facts)
//   ledger: rent collected, fees, bills, paid to owner  Rentvine ledger (owner_portfolios.ledger_summary)
//   statements: income, expense, paid, reserve         Rentvine /portfolios/{id}/statements
//   files: PMA, flood, HOA, lead paint, inspections    Rentvine /paths/1/contents (types 4, 6, 7, 11)
//   photos                                              Rentvine listing image + the home's Files
//   showings, applications, listing feedback           RentEngine (marketing.py)
//   work orders                                         Rentvine webhooks / Property Meld
//   market range                                        this repo's own Rentvine estimate index

import type { Membership, Session } from './access';

export type HouseStyle = 'ranch' | 'twostory' | 'cottage' | 'modern' | 'duplex';
export type UnitStatus = 'occupied' | 'renewal' | 'vacant' | 'make-ready';

export interface Lease {
  tenants: string[];
  start: string;
  end: string;
  monthToMonth?: boolean;
  depositCents: number;
}

export interface Listing {
  daysOnMarket: number;
  showings: number;
  applications: number;
  askingCents: number;
  feedback: string;
}

export interface Unit {
  label: string | null;
  status: UnitStatus;
  rentCents: number;
  lease: Lease | null;
  listing?: Listing;
  /** The last six months, oldest first. */
  payments: ('paid' | 'late' | 'none')[];
}

export interface WorkOrder { date: string; title: string; costCents: number; state: 'done' | 'open' | 'scheduled' }
export interface Doc { name: string; kind: 'agreement' | 'addendum' | 'lease' | 'inspection' | 'tax' | 'statement' | 'sample'; date: string; home?: string; href?: string }

export interface Home {
  id: string;
  address: string;
  city: string;
  zip: string;
  county: string;
  style: HouseStyle;
  palette: number;
  /** Listing photo (Rentvine listing image or the home's Files). Drawn elevation when missing. */
  photo?: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  hoa: string | null;
  marketLowCents: number | null;
  marketHighCents: number | null;
  units: Unit[];
  workOrders: WorkOrder[];
}

export interface LedgerMonth { month: string; rentCents: number; feesCents: number; repairsCents: number; paidCents: number; /** Real statements give one expenses total. */ expensesCents?: number }
export interface Statement { id: string; period: string; incomeCents: number; expenseCents: number; paidCents: number; reserveCents: number; href?: string }
export interface FeedItem { date: string; kind: 'update' | 'payment' | 'repair' | 'showing' | 'renewal' | 'document'; title: string; body: string; isNew?: boolean }
/** The last 12 months from Rentvine's transactions (real portfolios). */
export interface YearTotals { rentCents: number; otherInCents: number; ownerInCents: number; billsCents: number; feesCents: number; paidCents: number; lastPaid: string | null; months: number }
export interface Repair { date: string; home: string | null; description: string | null; amountCents: number }
export interface MeldItem { ref: string | null; title: string; status: string; priority: string | null; opened: string | null; closed: string | null; open: boolean; home: string; days: number | null }
export interface Care { repairs: Repair[]; melds: MeldItem[]; meldsSetUp: boolean }
export interface KeyDate { date: string; title: string; detail: string; href?: string; kind: 'tax' | 'insurance' | 'lease' | 'inspection' }

export interface Portfolio {
  id: string;
  name: string;
  shortName: string;
  stage: 'owner' | 'prospect';
  since: string;
  homes: Home[];
  ledger: LedgerMonth[];
  statements: Statement[];
  feed: FeedItem[];
  keyDates: KeyDate[];
  documents: Doc[];
  manager: { name: string; title: string; phone: string; email: string };
  /** Set on portfolios read from Rentvine (not the invented demo ones). */
  real?: boolean;
  year?: YearTotals;
  care?: Care;
  /** Owners on the Rentvine portfolio: sent to staff only, for invites. */
  contacts?: { name: string; email: string | null; share: number | null }[];
}

const $ = (dollars: number) => Math.round(dollars * 100);

const MONTHS = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

/** Deterministic months: rent minus a 10% fee minus that month's repairs. */
function ledger(rentByMonth: number, repairs: number[]): LedgerMonth[] {
  return MONTHS.map((month, i) => {
    const rent = rentByMonth;
    const fees = Math.round(rent * 0.1);
    const fix = repairs[i] ?? 0;
    return { month, rentCents: $(rent), feesCents: $(fees), repairsCents: $(fix), paidCents: $(rent - fees - fix) };
  });
}

function statements(rows: LedgerMonth[]): Statement[] {
  return rows.slice(-6).reverse().map((m) => ({
    id: `st-${m.month}`,
    period: m.month,
    incomeCents: m.rentCents,
    expenseCents: m.feesCents + m.repairsCents,
    paidCents: m.paidCents,
    reserveCents: $(350),
  }));
}

const morganLedger = ledger(8940, [0, 410, 0, 0, 1280, 0, 95, 0, 0, 640, 0, 185]);
const ramirezLedger = ledger(10_830, [220, 0, 0, 2450, 0, 0, 380, 0, 175, 0, 910, 0]);

export const PORTFOLIOS: Portfolio[] = [
  {
    id: 'pf-1042',
    name: 'Morgan Family Trust',
    shortName: 'Morgan',
    stage: 'owner',
    since: '2019',
    manager: { name: 'Avery Collins', title: 'Your property manager', phone: '(817) 555-0142', email: 'avery@example.com' },
    homes: [
      {
        id: 'h-412', address: '412 Larkspur Bend', city: 'Haslet', zip: '76052', county: 'Tarrant',
        style: 'ranch', palette: 0, beds: 3, baths: 2, sqft: 1840, yearBuilt: 2004, hoa: 'Larkspur Meadows HOA',
        marketLowCents: $(2080), marketHighCents: $(2260),
        units: [{ label: null, status: 'occupied', rentCents: $(2150), payments: ['paid', 'paid', 'paid', 'paid', 'paid', 'paid'],
          lease: { tenants: ['Jordan Alexander Price', 'Samira Price'], start: '2026-08-01', end: '2027-07-31', depositCents: $(2150) } }],
        workOrders: [{ date: '2026-11-04', title: 'Garbage disposal replaced', costCents: $(185), state: 'done' }],
      },
      {
        id: 'h-9', address: '9 Cedar Hollow Ct', city: 'Keller', zip: '76248', county: 'Tarrant',
        style: 'twostory', palette: 1, beds: 4, baths: 2.5, sqft: 2610, yearBuilt: 2011, hoa: 'Cedar Hollow POA',
        marketLowCents: $(2850), marketHighCents: $(3050),
        units: [{ label: null, status: 'renewal', rentCents: $(2795), payments: ['paid', 'paid', 'late', 'paid', 'paid', 'paid'],
          lease: { tenants: ['Marcus Bell', 'Danielle Bell'], start: '2025-01-01', end: '2026-12-31', depositCents: $(2795) } }],
        workOrders: [{ date: '2026-12-02', title: 'Renewal inspection', costCents: 0, state: 'scheduled' }],
      },
      {
        id: 'h-2207', address: '2207 Mesquite Trail', city: 'Fort Worth', zip: '76179', county: 'Tarrant',
        style: 'cottage', palette: 2, beds: 3, baths: 2, sqft: 1520, yearBuilt: 1972, hoa: null,
        marketLowCents: $(1790), marketHighCents: $(1940),
        units: [{ label: null, status: 'vacant', rentCents: $(1875), lease: null, payments: ['paid', 'paid', 'paid', 'paid', 'none', 'none'],
          listing: { daysOnMarket: 12, showings: 9, applications: 2, askingCents: $(1875), feedback: 'Loved the backyard and new floors. One asked about a fence for a large dog.' } }],
        workOrders: [
          { date: '2026-09-28', title: 'Make-ready: paint, carpet, deep clean', costCents: $(640), state: 'done' },
          { date: '2026-11-18', title: 'Gutter cleaning', costCents: $(120), state: 'scheduled' },
        ],
      },
      {
        id: 'h-518', address: '518 Saddle Club Dr', city: 'Saginaw', zip: '76131', county: 'Tarrant',
        style: 'modern', palette: 3, beds: 3, baths: 2, sqft: 1690, yearBuilt: 2019, hoa: null,
        marketLowCents: $(1950), marketHighCents: $(2120),
        units: [{ label: null, status: 'occupied', rentCents: $(1995), payments: ['paid', 'paid', 'paid', 'paid', 'paid', 'paid'],
          lease: { tenants: ['Elena Ruiz'], start: '2024-03-01', end: '2025-02-28', monthToMonth: true, depositCents: $(1900) } }],
        workOrders: [],
      },
    ],
    ledger: morganLedger,
    year: { rentCents: morganLedger.reduce((t, m) => t + m.rentCents, 0), otherInCents: 0, ownerInCents: 0, feesCents: morganLedger.reduce((t, m) => t + m.feesCents, 0), billsCents: morganLedger.reduce((t, m) => t + m.repairsCents, 0), paidCents: morganLedger.reduce((t, m) => t + m.paidCents, 0), lastPaid: '2026-11-05', months: 12 },
    care: {
      meldsSetUp: true,
      melds: [
        { ref: 'M-1042', title: 'Leak under the kitchen sink', status: 'PENDING_VENDOR', priority: 'MEDIUM', opened: '2026-11-12', closed: null, open: true, home: '9 Cedar Hollow Ct', days: null },
        { ref: 'M-1031', title: 'Garbage disposal not working', status: 'COMPLETE', priority: 'MEDIUM', opened: '2026-11-02', closed: '2026-11-04', open: false, home: '412 Larkspur Bend', days: 2 },
        { ref: 'M-0988', title: 'AC not cooling upstairs', status: 'COMPLETE', priority: 'HIGH', opened: '2026-07-14', closed: '2026-07-14', open: false, home: '1100 Pecan Grove Ln', days: 0 },
        { ref: 'M-0954', title: 'Fence board loose', status: 'COMPLETE', priority: 'LOW', opened: '2026-05-20', closed: '2026-05-23', open: false, home: '2207 Mesquite Trail', days: 3 },
        { ref: 'M-0921', title: 'Water heater pilot out', status: 'COMPLETE', priority: 'HIGH', opened: '2026-03-03', closed: '2026-03-04', open: false, home: '412 Larkspur Bend', days: 1 },
      ],
      repairs: [
        { date: '2026-11-04', home: '412 Larkspur Bend', description: 'Garbage disposal replaced', amountCents: $(185) },
        { date: '2026-09-18', home: '1100 Pecan Grove Ln', description: 'Make-ready paint and cleaning', amountCents: $(640) },
        { date: '2026-07-15', home: '1100 Pecan Grove Ln', description: 'AC capacitor replaced', amountCents: $(95) },
        { date: '2026-04-09', home: '2207 Mesquite Trail', description: 'Fence repair', amountCents: $(1280) },
      ],
    },
    statements: statements(morganLedger),
    feed: [
      { date: '2026-11-13', kind: 'update', isNew: true, title: 'Weekly update', body: 'Rent is in on 3 of 3 occupied homes. Mesquite Trail had 4 showings this week and 2 applications are being screened.' },
      { date: '2026-11-11', kind: 'showing', isNew: true, title: 'Showing feedback, 2207 Mesquite Trail', body: '“Loved the backyard and new floors.” One family asked about a fence for a large dog.' },
      { date: '2026-11-04', kind: 'repair', title: 'Repair done, 412 Larkspur Bend', body: 'Garbage disposal replaced, $185. Invoice and photos are in Documents.' },
      { date: '2026-11-01', kind: 'renewal', title: 'Renewal offer sent, 9 Cedar Hollow Ct', body: '12 months at $2,895 (+$100), in line with the $2,850 to $3,050 market range. Waiting on the Bells.' },
      { date: '2026-10-10', kind: 'payment', title: 'October statement posted', body: 'Paid to you: $8,046. Your reserve stays at $350.' },
    ],
    keyDates: [
      { date: '2026-12-02', kind: 'inspection', title: 'Renewal inspection', detail: '9 Cedar Hollow Ct' },
      { date: '2026-12-31', kind: 'lease', title: 'Lease ends', detail: '9 Cedar Hollow Ct: renewal offer out' },
      { date: '2027-03-14', kind: 'insurance', title: 'Insurance renews', detail: '412 Larkspur Bend: a good time to shop it', href: '/insurance' },
      { date: '2027-05-15', kind: 'tax', title: 'Property tax protest deadline', detail: 'All 4 homes: check your appraisal notice', href: '/taxes' },
    ],
    documents: [
      { name: 'Management agreement 2026', kind: 'agreement', date: '2026-10-21' },
      { name: 'Flood addendum', kind: 'addendum', date: '2026-10-21', home: '412 Larkspur Bend' },
      { name: 'Lead-based paint addendum', kind: 'addendum', date: '2026-10-21', home: '2207 Mesquite Trail' },
      { name: 'Lease: Price', kind: 'lease', date: '2026-07-18', home: '412 Larkspur Bend' },
      { name: 'Move-out inspection', kind: 'inspection', date: '2026-09-24', home: '2207 Mesquite Trail' },
      { name: '1099-MISC 2025', kind: 'tax', date: '2026-01-29' },
    ],
  },
  {
    id: 'pf-2117',
    name: 'Ramirez Holdings LLC',
    shortName: 'Ramirez',
    stage: 'owner',
    since: '2022',
    manager: { name: 'Avery Collins', title: 'Your property manager', phone: '(817) 555-0142', email: 'avery@example.com' },
    homes: [
      {
        id: 'h-1100', address: '1100 Pecan Grove Ln', city: 'Denton', zip: '76201', county: 'Denton',
        style: 'duplex', palette: 4, beds: 2, baths: 1.5, sqft: 2200, yearBuilt: 1998, hoa: null,
        marketLowCents: $(1350), marketHighCents: $(1480),
        units: [
          { label: 'Unit A', status: 'occupied', rentCents: $(1425), payments: ['paid', 'paid', 'paid', 'paid', 'paid', 'paid'],
            lease: { tenants: ['Tyler Nguyen'], start: '2026-05-01', end: '2027-04-30', depositCents: $(1425) } },
          { label: 'Unit B', status: 'make-ready', rentCents: $(1395), lease: null, payments: ['paid', 'paid', 'paid', 'paid', 'paid', 'none'] },
        ],
        workOrders: [{ date: '2026-11-10', title: 'Unit B make-ready: paint and blinds', costCents: $(910), state: 'open' }],
      },
      {
        id: 'h-77', address: '77 Brushy Creek Rd', city: 'Justin', zip: '76247', county: 'Denton',
        style: 'ranch', palette: 2, beds: 4, baths: 2, sqft: 2140, yearBuilt: 2008, hoa: null,
        marketLowCents: $(2350), marketHighCents: $(2520),
        units: [{ label: null, status: 'occupied', rentCents: $(2450), payments: ['paid', 'paid', 'paid', 'paid', 'paid', 'paid'],
          lease: { tenants: ['Hannah Okafor', 'David Okafor'], start: '2025-09-01', end: '2027-08-31', depositCents: $(2450) } }],
        workOrders: [],
      },
      {
        id: 'h-3301', address: '3301 Bluestem Way', city: 'Northlake', zip: '76226', county: 'Denton',
        style: 'twostory', palette: 0, beds: 4, baths: 3, sqft: 2780, yearBuilt: 2016, hoa: 'Bluestem Ranch HOA',
        marketLowCents: $(2900), marketHighCents: $(3150),
        units: [{ label: null, status: 'occupied', rentCents: $(3060), payments: ['paid', 'paid', 'paid', 'paid', 'late', 'paid'],
          lease: { tenants: ['Priscilla Gomez'], start: '2026-02-01', end: '2027-01-31', depositCents: $(3060) } }],
        workOrders: [{ date: '2026-10-02', title: 'AC capacitor', costCents: $(175), state: 'done' }],
      },
      {
        id: 'h-640', address: '640 Willow Bend', city: 'Haslet', zip: '76052', county: 'Tarrant',
        style: 'cottage', palette: 4, beds: 3, baths: 2, sqft: 1610, yearBuilt: 1985, hoa: null,
        marketLowCents: $(1880), marketHighCents: $(2010),
        units: [{ label: null, status: 'occupied', rentCents: $(1950), payments: ['paid', 'paid', 'paid', 'paid', 'paid', 'paid'],
          lease: { tenants: ['Wes Carter'], start: '2026-06-15', end: '2027-06-14', depositCents: $(1950) } }],
        workOrders: [],
      },
      {
        id: 'h-15', address: '15 Lantana Ct', city: 'Roanoke', zip: '76262', county: 'Denton',
        style: 'modern', palette: 1, beds: 3, baths: 2.5, sqft: 1980, yearBuilt: 2021, hoa: 'Lantana Commons',
        marketLowCents: $(2420), marketHighCents: $(2600),
        units: [{ label: null, status: 'renewal', rentCents: $(2550), payments: ['paid', 'paid', 'paid', 'paid', 'paid', 'paid'],
          lease: { tenants: ['Aiden Brooks', 'Mia Brooks'], start: '2025-12-15', end: '2026-12-14', depositCents: $(2550) } }],
        workOrders: [],
      },
    ],
    ledger: ramirezLedger,
    statements: statements(ramirezLedger),
    feed: [
      { date: '2026-11-13', kind: 'update', isNew: true, title: 'Weekly update', body: 'Rent is in on all 5 occupied doors. Pecan Grove Unit B make-ready is 70% done; photos go up Friday.' },
      { date: '2026-11-10', kind: 'repair', isNew: true, title: 'Make-ready started, 1100 Pecan Grove Unit B', body: 'Paint and blinds, estimate $910. That is over your $350 repair limit, so we called first: you approved it on Nov 9.' },
      { date: '2026-11-03', kind: 'renewal', title: 'Renewal offer sent, 15 Lantana Ct', body: '12 months at $2,595 (+$45). Market range $2,420 to $2,600.' },
      { date: '2026-10-10', kind: 'payment', title: 'October statement posted', body: 'Paid to you: $8,837.' },
    ],
    keyDates: [
      { date: '2026-11-21', kind: 'inspection', title: 'Unit B listing photos', detail: '1100 Pecan Grove Ln' },
      { date: '2026-12-14', kind: 'lease', title: 'Lease ends', detail: '15 Lantana Ct: renewal offer out' },
      { date: '2027-01-31', kind: 'lease', title: 'Lease ends', detail: '3301 Bluestem Way' },
      { date: '2027-05-15', kind: 'tax', title: 'Property tax protest deadline', detail: 'All 5 properties', href: '/taxes' },
    ],
    documents: [
      { name: 'Management agreement 2026', kind: 'agreement', date: '2026-10-30' },
      { name: 'Multiple property addendum', kind: 'addendum', date: '2026-10-30' },
      { name: 'HOA addendum', kind: 'addendum', date: '2026-10-30', home: '3301 Bluestem Way' },
      { name: 'Lease: Okafor', kind: 'lease', date: '2025-08-20', home: '77 Brushy Creek Rd' },
      { name: '1099-MISC 2025', kind: 'tax', date: '2026-01-29' },
    ],
  },
  {
    id: 'pf-lead-88',
    name: 'Priya Shah',
    shortName: 'Shah',
    stage: 'prospect',
    since: '2026',
    manager: { name: 'Jon', title: 'Owner / Broker', phone: '(817) 555-0100', email: 'jon@example.com' },
    homes: [
      {
        id: 'h-lead', address: '1806 Prairie Rose Dr', city: 'Haslet', zip: '76052', county: 'Tarrant',
        style: 'twostory', palette: 3, beds: 4, baths: 2.5, sqft: 2390, yearBuilt: 2013, hoa: 'Prairie Rose HOA',
        marketLowCents: $(2550), marketHighCents: $(2740),
        units: [{ label: null, status: 'vacant', rentCents: $(2650), lease: null, payments: [] }],
        workOrders: [],
      },
    ],
    ledger: [],
    statements: [],
    feed: [],
    keyDates: [],
    documents: [
      { name: 'Sample management agreement', kind: 'sample', date: '2026-11-14' },
      { name: 'Our pet policy', kind: 'sample', date: '2026-11-14' },
      { name: 'How we screen residents', kind: 'sample', date: '2026-11-14' },
      { name: 'Sample owner statement', kind: 'sample', date: '2026-11-14' },
    ],
  },
];

export const MEMBERSHIPS: Membership[] = [
  { portfolioId: 'pf-1042', email: 'andrew.morgan@example.com', role: 'owner' },
  { portfolioId: 'pf-1042', email: 'lisa.morgan@example.com', role: 'owner' },
  { portfolioId: 'pf-1042', email: 'dana@whitfieldcpa.example', role: 'accountant' },
  { portfolioId: 'pf-2117', email: 'carlos@ramirezholdings.example', role: 'owner' },
  { portfolioId: 'pf-lead-88', email: 'priya.shah@example.com', role: 'prospect' },
];

export interface Persona { key: string; session: Session; blurb: string }

export const PERSONAS: Persona[] = [
  { key: 'andrew', session: { email: 'andrew.morgan@example.com', name: 'Andrew Morgan' }, blurb: 'Owner · Morgan Family Trust' },
  { key: 'lisa', session: { email: 'lisa.morgan@example.com', name: 'Lisa Morgan' }, blurb: 'Co-owner · same portfolio' },
  { key: 'dana', session: { email: 'dana@whitfieldcpa.example', name: 'Dana Whitfield' }, blurb: 'Their accountant' },
  { key: 'carlos', session: { email: 'carlos@ramirezholdings.example', name: 'Carlos Ramirez' }, blurb: 'Owner · Ramirez Holdings' },
  { key: 'priya', session: { email: 'priya.shah@example.com', name: 'Priya Shah' }, blurb: 'Lead · not signed yet' },
  { key: 'staff', session: { email: 'staff@westromgroup.com', name: 'Westrom staff', staff: true }, blurb: 'Sees every portfolio' },
];

export const portfolioById = (id: string) => PORTFOLIOS.find((p) => p.id === id) ?? null;
