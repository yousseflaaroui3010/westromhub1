// Owner portal: pure parts always run; the HTTP flow runs against a real
// Postgres when TEST_DATABASE_URL is set (CI provides one).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { createApp } from '../app';
import { imageType } from './routes';
import { migrate, type Sql } from '../db';
import { MemoryStore } from '../security/store';
import { codeHash, sixDigitCode } from './crypto';
import { buildPortfolio, catalog, loadLists, parseFile, type RvApi } from './rentvine';
import { shortName, viewFor } from './view';

// ── A fake Rentvine with the shapes the staff dashboard reads ──────────────
const FIX: Record<string, unknown[]> = {
  portfolios: [
    { portfolio: { portfolioID: 501, name: 'Morgan Family Trust', isActive: 1, contacts: [{ contactID: 9, name: 'Andrew Morgan', percentOwned: '100' }] } },
    { portfolio: { portfolioID: 502, name: '13 Kegs LLC', isActive: 1, contacts: [] } },
  ],
  owners: [{ contact: { contactID: 9, name: 'Andrew Morgan', email: 'Andrew@Example.com' } }],
  properties: [
    { property: { propertyID: 11, portfolioID: 501, address: '412 Larkspur Bend', city: 'Haslet', postalCode: '76052', county: 'Tarrant', yearBuilt: '2004', isActive: 1, dateContractBegins: '2019-03-01' } },
    { property: { propertyID: 12, portfolioID: 501, address: '2207 Mesquite Trail', city: 'Fort Worth', postalCode: '76179', county: 'Tarrant', yearBuilt: '1972', isActive: 1 } },
    { property: { propertyID: 13, portfolioID: 502, address: '7244 Retriever Ln', city: 'Fort Worth', postalCode: '76137', isActive: 1 } },
  ],
  'properties/units/export': [
    { unit: { unitID: 111, propertyID: 11, beds: 3, fullBaths: 2, halfBaths: 0, size: 1840, rent: '2150.00', deposit: '2150.00' } },
    { unit: { unitID: 121, propertyID: 12, beds: 3, fullBaths: 2, size: 1520, rent: '1875.00' } },
    { unit: { unitID: 131, propertyID: 13, beds: 4, fullBaths: 2, size: 2100, rent: '1850.00' } },
  ],
  'leases/export': [
    { lease: { leaseID: 1, unitID: 111, startDate: '2026-08-01', endDate: '2027-07-31', isMonthToMonth: 0, tenants: [{ name: 'Jordan Alexander Price' }] }, unit: { unitID: 111, rent: '2150.00', deposit: '2150.00' } },
  ],
};
const calls: string[] = [];
const fakeRentvine: RvApi & { download(path: string): Promise<{ bytes: ArrayBuffer; type: string }> } = {
  async get(path, params = {}) {
    calls.push(path);
    if (path === 'portfolios/501/statements') {
      return [{ statement: { statementID: 77, startDate: '2026-10-01', endDate: '2026-10-31', totalIncomeAmount: '4025.00', totalExpenseAmount: '402.50', totalDistributionAmount: '3622.50', reserveAmount: '350' } }];
    }
    if (path === 'paths/1/contents') return [{ file: { fileID: 900, name: 'Management Agreement 2026.pdf', objectID: params.objectID, objectTypeID: 11, dateTimeCreated: '2026-10-21 10:00:00' } }];
    if (path === 'properties/listings/search') {
      return params.search === '412 Larkspur Bend' ? [{ unit: { unitID: 111 }, image: { large: 'https://cdn.rentvine.com/photos/412.jpg' } }] : [];
    }
    // 2207 Mesquite Trail has no listing picture, only a photo on the unit's Files tab.
    if (path === 'files/attachments/7/121') return [{ file: { fileID: 950, name: 'Front of house.JPG', objectID: 121, objectTypeID: 7 } }, { file: { fileID: 951, name: 'Lease.pdf', objectID: 121, objectTypeID: 7 } }];
    return [];
  },
  async pages(path) { calls.push(path); return (FIX[path] ?? []) as Record<string, unknown>[]; },
  async download(path) {
    calls.push(path);
    if (path === 'files/950/download') return { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]).buffer as ArrayBuffer, type: 'application/octet-stream' };
    return { bytes: new TextEncoder().encode('%PDF-1.7').buffer as ArrayBuffer, type: 'application/pdf' };
  },
};

describe('portal pure parts', () => {
  it('makes 6-digit codes and binds their hash to the email', () => {
    for (let i = 0; i < 50; i++) expect(sixDigitCode()).toMatch(/^\d{6}$/);
    expect(codeHash('a@x.com', '123456')).not.toBe(codeHash('b@x.com', '123456'));
    expect(codeHash('a@x.com', '123456')).toBe(codeHash('a@x.com', '123456'));
  });

  it('shortens portfolio names for the hero', () => {
    expect(shortName('Morgan Family Trust')).toBe('Morgan');
    expect(shortName('13 Kegs LLC')).toBe('13 Kegs');
    expect(shortName('5619 A Protected Series Of Southern Five Propertie')).toBe('Southern Five');
    expect(shortName('Ramirez Holdings LLC')).toBe('Ramirez');
  });

  it('knows a picture by its first bytes', () => {
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(imageType(new TextEncoder().encode('%PDF-1.7'))).toBeNull();
  });

  it('keeps only files of the record asked for', () => {
    expect(parseFile({ file: { fileID: 1, name: 'a.pdf', objectID: 5, objectTypeID: 11 } }, '5', '11')).not.toBeNull();
    expect(parseFile({ file: { fileID: 2, name: 'b.pdf', objectID: 6, objectTypeID: 11 } }, '5', '11')).toBeNull();
  });

  it('builds a portfolio and redacts it per role', async () => {
    const lists = await loadLists(fakeRentvine);
    expect(catalog(lists).map((c) => c.id)).toEqual(['502', '501']);
    const data = await buildPortfolio(fakeRentvine, lists, '501', async () => ({ low: 2080, high: 2260 }));
    expect(data.homes).toHaveLength(2);
    expect(data.homes[0].photoUrl).toBe('https://cdn.rentvine.com/photos/412.jpg');
    expect(data.homes[1]).toMatchObject({ photoUrl: null, photoFile: { kind: 'file', id: '950' } });
    expect(data.v).toBe(2);
    expect(data.contacts[0].email).toBe('andrew@example.com');
    const now = Date.parse('2026-11-15T12:00:00Z');

    const owner = viewFor(data, 'owner', now);
    expect(owner.homes[0].units[0].lease?.tenants).toEqual(['Jordan P.']);
    expect(owner.homes[1].units[0].status).toBe('vacant');
    expect(owner.contacts).toBeUndefined();
    expect(owner.ledger[0]).toMatchObject({ month: '2026-10', paidCents: 362250 });
    expect(owner.keyDates.at(-1)).toMatchObject({ date: '2027-05-15', kind: 'tax' });

    const accountant = viewFor(data, 'accountant', now);
    expect(accountant.homes).toEqual([]);
    expect(accountant.statements).toHaveLength(1);
    expect(JSON.stringify(accountant)).not.toContain('Jordan');

    const staff = viewFor(data, 'staff', now);
    expect(staff.homes[0].units[0].lease?.tenants).toEqual(['Jordan Alexander Price']);
    expect(staff.contacts?.[0].email).toBe('andrew@example.com');
  });
});

const url = process.env.TEST_DATABASE_URL;
const ORIGIN = 'https://wgcassetguide.com';

describe.skipIf(!url)('portal over HTTP', () => {
  let sql: Sql;
  let app: ReturnType<typeof createApp>;
  const imageFetches: string[] = [];
  const sent: { email: string; name: string | null; code: string }[] = [];
  let clock = Date.parse('2026-11-15T12:00:00Z');

  beforeAll(async () => {
    sql = postgres(url as string, { max: 2, onnotice: () => {} });
    await sql.unsafe('DROP TABLE IF EXISTS portal_audit, portal_snapshot, portal_cache, portal_code, portal_invite, portal_session, portal_member, portal_user CASCADE');
    await migrate(sql);
    app = createApp({
      allowedOrigins: [ORIGIN],
      store: new MemoryStore(),
      portal: {
        sql,
        warm: false,
        now: () => clock,
        rentvine: async () => fakeRentvine,
        estimate: async () => ({ low: 2080, high: 2260 }),
        sendCode: async (to, code) => { sent.push({ ...to, code }); },
        fetchImpl: (async (u: string) => {
          imageFetches.push(String(u));
          return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } });
        }) as unknown as typeof fetch,
      },
    });
  });
  afterAll(async () => { await sql?.end({ timeout: 5 }); });

  const cookieOf = (res: Response) => (res.headers.get('set-cookie') ?? '').split(';')[0];
  const post = (path: string, body: unknown, cookie = '', origin: string | null = ORIGIN) => app.request(`/api/portal${path}`, {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}), ...(cookie ? { cookie } : {}) },
  });
  const get = (path: string, cookie = '') => app.request(`/api/portal${path}`, { headers: cookie ? { cookie } : {} });
  async function ready(path: string, cookie: string) {
    for (let i = 0; i < 60; i++) {
      const body = await (await get(path, cookie)).json() as { state: string };
      if (body.state === 'ready') return body as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error('never ready');
  }
  async function signIn(email: string) {
    const before = sent.length;
    expect((await post('/login/start', { email })).status).toBe(200);
    const mail = sent.slice(before).find((m) => m.email === email.toLowerCase());
    if (!mail) throw new Error(`no code sent to ${email}`);
    const res = await post('/login/verify', { email, code: mail.code });
    expect(res.status).toBe(200);
    return cookieOf(res);
  }

  let staff = '', owner = '', accountant = '';

  it('signs staff in by their westromgroup.com email, with a code that works once', async () => {
    expect((await post('/login/start', { email: 'yousseff@westromgroup.com' }, '', null)).status).toBe(403); // no Origin
    const start = await post('/login/start', { email: 'Yousseff@westromgroup.com' });
    expect(await start.json()).toMatchObject({ ok: true });
    const code = sent.at(-1)!.code;
    expect(code).toMatch(/^\d{6}$/);
    expect((await post('/login/verify', { email: 'yousseff@westromgroup.com', code: code === '000000' ? '111111' : '000000' })).status).toBe(401);
    const ok = await post('/login/verify', { email: 'yousseff@westromgroup.com', code });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(ok.headers.get('set-cookie')).toMatch(/Path=\/api\/portal/);
    staff = cookieOf(ok);
    expect((await post('/login/verify', { email: 'yousseff@westromgroup.com', code })).status).toBe(401); // used
    expect(await (await get('/me', staff)).json()).toMatchObject({ user: { email: 'yousseff@westromgroup.com', staff: true, name: 'Yousseff' } });
  });

  it('gives a stranger the same answer and sends nothing', async () => {
    const before = sent.length;
    const res = await post('/login/start', { email: 'stranger@example.com' });
    const ownerish = await post('/login/start', { email: 'yousseff@westromgroup.com' });
    expect(await res.json()).toEqual(await ownerish.json());
    expect(sent.slice(before).map((m) => m.email)).toEqual(['yousseff@westromgroup.com']);
    expect((await post('/login/verify', { email: 'stranger@example.com', code: '123456' })).status).toBe(401);
  });

  it('expires codes and stops after five wrong tries', async () => {
    await post('/login/start', { email: 'tina@westromgroup.com' });
    const code = sent.at(-1)!.code;
    clock += 11 * 60_000;
    expect((await post('/login/verify', { email: 'tina@westromgroup.com', code })).status).toBe(401);
    clock -= 11 * 60_000;
    await post('/login/start', { email: 'tina@westromgroup.com' });
    const fresh = sent.at(-1)!.code;
    const bad = fresh === '999999' ? '888888' : '999999';
    for (let i = 0; i < 5; i++) expect((await post('/login/verify', { email: 'tina@westromgroup.com', code: bad })).status).toBe(401);
    expect((await post('/login/verify', { email: 'tina@westromgroup.com', code: fresh })).status).toBe(401);
  });

  it('lets staff browse every portfolio and read one', async () => {
    let cat: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    for (let i = 0; i < 60 && !(cat?.portfolios?.length); i++) { cat = await (await get('/catalog', staff)).json(); await new Promise((r) => setTimeout(r, 40)); }
    expect(cat.portfolios.map((p: { name: string }) => p.name)).toEqual(['13 Kegs LLC', 'Morgan Family Trust']);
    const body = await ready('/portfolios/501', staff);
    expect(body.role).toBe('staff');
    expect(body.portfolio.contacts[0].email).toBe('andrew@example.com');
    expect(body.portfolio.homes[0].photo).toBe('/api/portal/portfolios/501/photo/11');
    const asOwner = await ready('/portfolios/501?as=owner', staff);
    expect(asOwner).toMatchObject({ role: 'owner', preview: 'owner' });
    expect(asOwner.portfolio.homes[0].units[0].lease.tenants).toEqual(['Jordan P.']);
    expect(asOwner.portfolio.contacts).toBeUndefined();
    expect((await get('/portfolios/setup', staff)).status).toBe(404);
  });

  it('signs an owner in with the email Rentvine has, and shows only their portfolio', async () => {
    owner = await signIn('Andrew@Example.com');
    expect(sent.at(-1)!.name).toBe('Andrew Morgan');
    expect(await (await get('/me', owner)).json()).toMatchObject({ user: { name: 'Andrew Morgan', staff: false }, portfolios: [{ id: '501', role: 'owner' }] });
    const mine = await ready('/portfolios/501', owner);
    expect(mine.portfolio.homes[0].units[0].lease.tenants).toEqual(['Jordan P.']);
    expect(mine.portfolio.contacts).toBeUndefined();
    expect((await get('/portfolios/502', owner)).status).toBe(403);
    expect((await ready('/portfolios/501?as=accountant', owner)).role).toBe('owner'); // only staff can preview
    expect((await get('/catalog', owner)).status).toBe(403);
    expect((await post('/portfolios/501/refresh', {}, owner)).status).toBe(403);
    const people = await (await get('/portfolios/501/members', owner)).json() as { owners: { email: string | null }[] };
    expect(people.owners[0].email).toBeNull(); // owners' emails are for staff only
  });

  it('serves the photo from cdn.rentvine.com only, to people on the portfolio', async () => {
    const res = await get('/portfolios/501/photo/11', owner);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(imageFetches).toEqual(['https://cdn.rentvine.com/photos/412.jpg']);
    const fromFiles = await get('/portfolios/501/photo/12', owner);
    expect(fromFiles.status).toBe(200);
    expect(fromFiles.headers.get('content-type')).toBe('image/jpeg');
    await get('/portfolios/501/photo/12', owner);
    expect(calls.filter((p) => p === 'files/950/download')).toHaveLength(1); // kept in memory
    expect((await get('/portfolios/501/photo/99', owner)).status).toBe(404);
    expect((await get('/portfolios/501/photo/11')).status).toBe(401);
  });

  it('lets an owner add an accountant, who signs in and gets money and papers but no tenants', async () => {
    expect((await post('/portfolios/501/members/add', { email: 'dana@cpa.example', role: 'accountant' }, owner)).status).toBe(200);
    expect((await post('/portfolios/501/members/add', { email: 'x@y.example', role: 'prospect' }, owner)).status).toBe(400);
    accountant = await signIn('dana@cpa.example');
    const view = await ready('/portfolios/501', accountant);
    expect(view.role).toBe('accountant');
    expect(view.portfolio.homes).toEqual([]);
    expect(view.portfolio.statements).toHaveLength(1);
    expect(JSON.stringify(view)).not.toContain('Jordan');
    expect((await get('/portfolios/501/photo/11', accountant)).status).toBe(403);
    expect((await get('/portfolios/501/files/900', accountant)).status).toBe(200);
    expect((await get('/portfolios/501/statements/77', accountant)).status).toBe(200);
    expect((await get('/portfolios/501/statements/78', accountant)).status).toBe(404);
    expect((await post('/portfolios/501/members/add', { email: 'z@y.example', role: 'owner' }, accountant)).status).toBe(403);
  });

  it('removes a member, locks a disabled account out, and signs out', async () => {
    expect((await post('/portfolios/501/members/remove', { email: 'dana@cpa.example' }, owner)).status).toBe(200);
    expect((await get('/portfolios/501', accountant)).status).toBe(403);
    const before = sent.length;
    await post('/login/start', { email: 'dana@cpa.example' });
    expect(sent.length).toBe(before); // no longer on any portfolio: no code
    await sql`UPDATE portal_user SET disabled_at = now() WHERE email = 'andrew@example.com'`;
    expect(await (await get('/me', owner)).json()).toEqual({ user: null });
    await post('/login/start', { email: 'andrew@example.com' });
    expect(sent.length).toBe(before);
    expect((await post('/logout', {}, staff)).status).toBe(200);
    expect(await (await get('/me', staff)).json()).toEqual({ user: null });
    const denied = await sql`SELECT count(*)::int AS n FROM portal_audit WHERE action = 'denied'`;
    expect(denied[0].n).toBeGreaterThan(0);
  });
});
