// Owner portal: pure parts always run; the HTTP flow runs against a real
// Postgres when TEST_DATABASE_URL is set (CI provides one).

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { createApp } from '../app';
import { migrate, type Sql } from '../db';
import { MemoryStore } from '../security/store';
import { hashPassword, verifyPassword } from './crypto';
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
    return [];
  },
  async pages(path) { calls.push(path); return (FIX[path] ?? []) as Record<string, unknown>[]; },
  async download() { return { bytes: new TextEncoder().encode('%PDF-1.7').buffer as ArrayBuffer, type: 'application/pdf' }; },
};

describe('portal pure parts', () => {
  it('hashes and checks passwords', async () => {
    const h = await hashPassword('correct horse battery');
    expect(h.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery', h)).toBe(true);
    expect(await verifyPassword('wrong horse battery', h)).toBe(false);
    expect(await verifyPassword('anything at all', null)).toBe(false);
  });

  it('shortens portfolio names for the hero', () => {
    expect(shortName('Morgan Family Trust')).toBe('Morgan');
    expect(shortName('13 Kegs LLC')).toBe('13 Kegs');
    expect(shortName('5619 A Protected Series Of Southern Five Propertie')).toBe('Southern Five');
    expect(shortName('Ramirez Holdings LLC')).toBe('Ramirez');
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

  beforeAll(async () => {
    sql = postgres(url as string, { max: 2, onnotice: () => {} });
    await sql.unsafe('DROP TABLE IF EXISTS portal_audit, portal_snapshot, portal_cache, portal_invite, portal_session, portal_member, portal_user CASCADE');
    await migrate(sql);
    app = createApp({
      allowedOrigins: [ORIGIN],
      store: new MemoryStore(),
      portal: {
        sql,
        rentvine: async () => fakeRentvine,
        estimate: async () => ({ low: 2080, high: 2260 }),
        setupCode: async () => 'setup-code-1234567890',
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
    for (let i = 0; i < 50; i++) {
      const body = await (await get(path, cookie)).json() as { state: string };
      if (body.state === 'ready') // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test reads deep JSON
      return body as Record<string, any>;
      await new Promise((r) => setTimeout(r, 40));
    }
    throw new Error('never ready');
  }

  let staff = '', owner = '', accountant = '';

  it('makes the first staff account once, with the setup code', async () => {
    expect(await (await get('/setup')).json()).toEqual({ needed: true });
    expect((await post('/setup', { code: 'nope', email: 'yousseff@westromgroup.com', name: 'Yousseff', password: 'a long enough password' })).status).toBe(403);
    expect((await post('/setup', { code: 'setup-code-1234567890', email: 'someone@gmail.com', name: 'X', password: 'a long enough password' })).status).toBe(400);
    const ok = await post('/setup', { code: 'setup-code-1234567890', email: 'Yousseff@westromgroup.com', name: 'Yousseff', password: 'a long enough password' });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(ok.headers.get('set-cookie')).toMatch(/Path=\/api\/portal/);
    staff = cookieOf(ok);
    expect((await post('/setup', { code: 'setup-code-1234567890', email: 'a@westromgroup.com', name: 'A', password: 'a long enough password' })).status).toBe(410);
  });

  it('refuses a POST without an Origin, and a wrong password, with one message', async () => {
    expect((await post('/login', { email: 'yousseff@westromgroup.com', password: 'a long enough password' }, '', null)).status).toBe(403);
    const bad = await post('/login', { email: 'yousseff@westromgroup.com', password: 'wrong password!!' });
    const nobody = await post('/login', { email: 'nobody@example.com', password: 'wrong password!!' });
    expect(bad.status).toBe(401);
    expect(await bad.json()).toMatchObject({ error: 'That email and password do not match.' });
    expect(await nobody.json()).toMatchObject({ error: 'That email and password do not match.' });
    const good = await post('/login', { email: 'yousseff@westromgroup.com', password: 'a long enough password' });
    expect(good.status).toBe(200);
    staff = cookieOf(good);
    expect(await (await get('/me', staff)).json()).toMatchObject({ user: { email: 'yousseff@westromgroup.com', staff: true } });
  });

  it('lets staff browse every portfolio and read one', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test reads deep JSON
    let cat: any;
    for (let i = 0; i < 50 && !(cat?.portfolios?.length); i++) { cat = await (await get('/catalog', staff)).json(); await new Promise((r) => setTimeout(r, 40)); }
    expect(cat.portfolios.map((p: { name: string }) => p.name)).toEqual(['13 Kegs LLC', 'Morgan Family Trust']);
    const body = await ready('/portfolios/501', staff);
    expect(body.role).toBe('staff');
    expect(body.portfolio.contacts[0].email).toBe('andrew@example.com');
    expect(body.portfolio.homes[0].photo).toBe('/api/portal/portfolios/501/photo/11');
  });

  it('invites an owner who then sees only their portfolio, with tenants as initials', async () => {
    const inv = await (await post('/invites', { email: 'andrew@example.com', portfolioId: '501', role: 'owner' }, staff)).json() as { link: string };
    expect(inv.link.startsWith(`${ORIGIN}/portfolio/invite#`)).toBe(true);
    const token = inv.link.split('#')[1];
    expect(await (await get(`/invites/peek?t=${token}`)).json()).toMatchObject({ email: 'andrew@example.com', existing: false });
    const acc = await post('/invites/accept', { token, name: 'Andrew Morgan', password: 'owner password here' });
    expect(acc.status).toBe(200);
    owner = cookieOf(acc);
    expect((await post('/invites/accept', { token, name: 'Again', password: 'owner password here' })).status).toBe(404);
    expect(await (await get('/me', owner)).json()).toMatchObject({ portfolios: [{ id: '501', role: 'owner' }] });

    const mine = await ready('/portfolios/501', owner);
    expect(mine.portfolio.homes[0].units[0].lease.tenants).toEqual(['Jordan P.']);
    expect(mine.portfolio.contacts).toBeUndefined();
    expect((await get('/portfolios/502', owner)).status).toBe(403);
    expect((await get('/catalog', owner)).status).toBe(403);
    expect((await post('/portfolios/501/refresh', {}, owner)).status).toBe(403);
  });

  it('serves the photo from cdn.rentvine.com only, to people on the portfolio', async () => {
    const res = await get('/portfolios/501/photo/11', owner);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(imageFetches).toEqual(['https://cdn.rentvine.com/photos/412.jpg']);
    expect((await get('/portfolios/501/photo/12', owner)).status).toBe(404); // no listing photo
    expect((await get('/portfolios/501/photo/11')).status).toBe(401);
  });

  it('lets an owner add an accountant, who gets money and papers but no tenants', async () => {
    const inv = await (await post('/invites', { email: 'dana@cpa.example', portfolioId: '501', role: 'accountant' }, owner)).json() as { link: string };
    const acc = await post('/invites/accept', { token: inv.link.split('#')[1], name: 'Dana', password: 'accountant password' });
    accountant = cookieOf(acc);
    const view = await ready('/portfolios/501', accountant);
    expect(view.role).toBe('accountant');
    expect(view.portfolio.homes).toEqual([]);
    expect(view.portfolio.statements).toHaveLength(1);
    expect(JSON.stringify(view)).not.toContain('Jordan');
    expect((await get('/portfolios/501/photo/11', accountant)).status).toBe(403);
    expect((await get('/portfolios/501/files/900', accountant)).status).toBe(200);
    expect((await get('/portfolios/501/statements/77', accountant)).status).toBe(200);
    expect((await get('/portfolios/501/statements/78', accountant)).status).toBe(404);
    expect((await post('/invites', { email: 'x@y.example', portfolioId: '501', role: 'owner' }, accountant)).status).toBe(403);
  });

  it('removes a member and signs out', async () => {
    expect((await post('/portfolios/501/members/remove', { email: 'dana@cpa.example' }, owner)).status).toBe(200);
    expect((await get('/portfolios/501', accountant)).status).toBe(403);
    expect((await post('/logout', {}, owner)).status).toBe(200);
    expect(await (await get('/me', owner)).json()).toEqual({ user: null });
    const denied = await sql`SELECT count(*)::int AS n FROM portal_audit WHERE action = 'denied'`;
    expect(denied[0].n).toBeGreaterThan(0);
  });
});
