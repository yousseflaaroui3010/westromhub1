// Owner portal API (/api/portal/*).
//
// Sign-in: email + password, session in an HttpOnly cookie scoped to
// /api/portal (SameSite=Lax; Secure behind HTTPS). Only a SHA-256 of the
// session token is stored. POSTs must carry an allowed Origin (the global CORS
// check rejects others), which with SameSite closes cross-site requests.
//
// Accounts: the first staff account is made once with the setup code from
// app_secret (portal_setup_code, read in Railway's database view). After that,
// people join only through invite links that staff (or an owner, for their own
// portfolio) create and send themselves. Every portfolio read checks the
// person's role on THAT portfolio and redacts by role (portal/view.ts).

import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { timingSafeEqual } from 'node:crypto';
import type { Sql } from '../db';
import { apiError, logFailure } from '../http/errors';
import { getClientIp } from '../security/clientIp';
import type { CounterStore } from '../security/store';
import { MEMBER_ROLES, permissions, type MemberRole, type Permission, type Role } from './access';
import { hashPassword, newToken, normEmail, passwordProblem, tokenHash, verifyPassword } from './crypto';
import { buildPortfolio, catalog, loadLists, RENTVINE_CDN, type CatalogEntry, type Estimator, type Lists, type PortfolioData, type RvApi } from './rentvine';
import { viewFor } from './view';

export interface PortalDeps {
  sql: Sql;
  store: CounterStore;
  /** The Rentvine client, or null while no key is stored. */
  rentvine: () => Promise<(RvApi & { download(path: string): Promise<{ bytes: ArrayBuffer; type: string }> }) | null>;
  estimate: Estimator | null;
  setupCode: () => Promise<string | undefined>;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const COOKIE = 'wg_portal';
const SESSION_DAYS = 14;
const INVITE_DAYS = 7;
const LISTS_FRESH_MS = 6 * 3600_000;
const SNAPSHOT_FRESH_MS = 24 * 3600_000;
const MAX_IMAGE = 15 * 1024 * 1024;

interface User { id: string; email: string; name: string; staff: boolean }
type Env = { Variables: { user: User | null } };

const PERMS_OF = (role: Role | null) => [...permissions(role)];

export function portalRoutes(deps: PortalDeps) {
  const { sql, store } = deps;
  const now = deps.now ?? Date.now;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const app = new Hono<Env>();

  const audit = (c: Context, action: string, userId: string | null, portfolioId: string | null = null, detail: string | null = null) =>
    sql`INSERT INTO portal_audit (user_id, action, portfolio_id, detail, ip) VALUES (${userId}, ${action}, ${portfolioId}, ${detail?.slice(0, 200) ?? null}, ${getClientIp(c)})`
      .catch(() => {});

  const limited = async (c: Context, name: string, key: string, max: number, windowMs: number) => {
    const { count } = await store.hit(`rl:portal-${name}:${key}`, windowMs);
    return count > max ? apiError(c, 429, 'rate_limited', 'Too many tries. Please wait a few minutes and try again.') : null;
  };

  // A POST from a page must say where it came from; the CORS check already rejected unknown origins.
  app.use('*', async (c, next) => {
    if (c.req.method === 'POST' && !c.req.header('Origin')) return apiError(c, 403, 'origin_required', 'Not allowed.');
    return next();
  });
  app.use('*', bodyLimit({ maxSize: 8 * 1024, onError: (c) => apiError(c, 413, 'payload_too_large', 'Request too large.') }));

  // Who is signed in (or null).
  app.use('*', async (c, next) => {
    c.set('user', null);
    const token = getCookie(c, COOKIE);
    if (token && token.length <= 100) {
      const rows = await sql<User[]>`
        SELECT u.id::text AS id, u.email, u.name, u.staff FROM portal_session s JOIN portal_user u ON u.id = s.user_id
        WHERE s.token_hash = ${tokenHash(token)} AND s.expires_at > now() AND u.disabled_at IS NULL`;
      c.set('user', rows[0] ?? null);
    }
    return next();
  });

  const secure = (c: Context) => c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';

  async function startSession(c: Context, userId: string) {
    const token = newToken();
    await sql`INSERT INTO portal_session (token_hash, user_id, expires_at, ip)
              VALUES (${tokenHash(token)}, ${userId}, ${new Date(now() + SESSION_DAYS * 86_400_000)}, ${getClientIp(c)})`;
    await sql`DELETE FROM portal_session WHERE expires_at < now()`;
    setCookie(c, COOKIE, token, { path: '/api/portal', httpOnly: true, sameSite: 'Lax', secure: secure(c), maxAge: SESSION_DAYS * 86_400 });
  }

  async function json(c: Context): Promise<Record<string, unknown> | null> {
    try { const b = await c.req.json(); return b && typeof b === 'object' ? b as Record<string, unknown> : null; } catch { return null; }
  }

  async function roleOn(user: User | null, portfolioId: string): Promise<Role | null> {
    if (!user) return null;
    if (user.staff) return 'staff';
    const rows = await sql<{ role: MemberRole }[]>`SELECT role FROM portal_member WHERE portfolio_id = ${portfolioId} AND user_id = ${user.id}`;
    return rows[0]?.role ?? null;
  }

  // ── Rentvine reads (one at a time per process) ──────────────────────────
  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => { const p = queue.then(fn, fn); queue = p.catch(() => {}); return p; };

  async function lists(api: RvApi): Promise<Lists> {
    const cached = (await sql<{ data: Lists; fetched_at: Date }[]>`SELECT data, fetched_at FROM portal_cache WHERE name = 'lists'`)[0];
    if (cached && now() - cached.fetched_at.getTime() < LISTS_FRESH_MS) return cached.data;
    const fresh = await loadLists(api);
    await sql`INSERT INTO portal_cache (name, data, fetched_at) VALUES ('lists', ${sql.json(fresh as never)}, now())
              ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, fetched_at = now()`;
    await sql`INSERT INTO portal_cache (name, data, fetched_at) VALUES ('catalog', ${sql.json(catalog(fresh) as never)}, now())
              ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, fetched_at = now()`;
    return fresh;
  }

  const building = new Set<string>();
  function rebuild(portfolioId: string, force = false) {
    if (building.has(portfolioId)) return;
    building.add(portfolioId);
    void serial(async () => {
      try {
        const api = await deps.rentvine();
        if (!api) throw new Error('No Rentvine key is stored yet.');
        await sql`INSERT INTO portal_snapshot (portfolio_id, state, started_at) VALUES (${portfolioId}, 'building', now())
                  ON CONFLICT (portfolio_id) DO UPDATE SET state = 'building', started_at = now(), error = NULL`;
        if (force) await sql`UPDATE portal_cache SET fetched_at = to_timestamp(0) WHERE name = 'lists'`;
        const data = await buildPortfolio(api, await lists(api), portfolioId, deps.estimate);
        await sql`UPDATE portal_snapshot SET state = 'ready', data = ${sql.json(data as never)}, fetched_at = now(), error = NULL WHERE portfolio_id = ${portfolioId}`;
      } catch (err) {
        const msg = err instanceof Error ? err.message.slice(0, 200) : 'Rentvine could not be read.';
        console.error(`[portal] portfolio ${portfolioId} read failed: ${msg}`);
        await sql`UPDATE portal_snapshot SET state = 'error', error = ${msg} WHERE portfolio_id = ${portfolioId}`.catch(() => {});
      } finally {
        building.delete(portfolioId);
      }
    });
  }

  let catalogLoading = false;
  function refreshCatalog() {
    if (catalogLoading) return;
    catalogLoading = true;
    void serial(async () => {
      try { const api = await deps.rentvine(); if (api) await lists(api); }
      catch (err) { console.error(`[portal] catalog read failed: ${err instanceof Error ? err.message.slice(0, 200) : 'error'}`); }
      finally { catalogLoading = false; }
    });
  }

  // ── Setup (first staff account, once) ──────────────────────────────────
  const staffExists = async () => (await sql`SELECT 1 FROM portal_user WHERE staff LIMIT 1`).length > 0;

  app.get('/setup', async (c) => c.json({ needed: !(await staffExists()) }));

  app.post('/setup', async (c) => {
    const hit = await limited(c, 'setup', getClientIp(c), 5, 3600_000); if (hit) return hit;
    if (await staffExists()) return apiError(c, 410, 'setup_done', 'Setup is already done. Ask a Westrom admin for an invite.');
    const b = await json(c);
    const email = normEmail(b?.email);
    const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 80) : '';
    const code = typeof b?.code === 'string' ? b.code.trim() : '';
    const expected = await deps.setupCode();
    const problem = passwordProblem(b?.password);
    if (!expected) return apiError(c, 503, 'setup_unavailable', 'Setup is not available right now.');
    if (!email || !name) return apiError(c, 400, 'invalid', 'Enter your name and work email.');
    if (!email.endsWith('@westromgroup.com')) return apiError(c, 400, 'invalid', 'Use a westromgroup.com email for the first account.');
    if (problem) return apiError(c, 400, 'weak_password', problem);
    const a = Buffer.from(code), e = Buffer.from(expected);
    if (a.length !== e.length || !timingSafeEqual(a, e)) { await audit(c, 'setup_bad_code', null); return apiError(c, 403, 'bad_code', 'That setup code is not right.'); }
    const hashed = await hashPassword(b!.password as string);
    const rows = await sql<{ id: string }[]>`INSERT INTO portal_user (email, name, password_hash, staff) VALUES (${email}, ${name}, ${hashed}, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, staff = true, name = EXCLUDED.name RETURNING id::text`;
    await audit(c, 'setup', rows[0].id);
    await startSession(c, rows[0].id);
    return c.json({ ok: true });
  });

  // ── Sign in / out ───────────────────────────────────────────────────────
  app.post('/login', async (c) => {
    const ipHit = await limited(c, 'login-ip', getClientIp(c), 12, 15 * 60_000); if (ipHit) return ipHit;
    const b = await json(c);
    const email = normEmail(b?.email);
    const password = typeof b?.password === 'string' ? b.password.slice(0, 200) : '';
    if (email) { const eHit = await limited(c, 'login-email', email, 8, 3600_000); if (eHit) return eHit; }
    const rows = email ? await sql<{ id: string; password_hash: string | null }[]>`
      SELECT id::text, password_hash FROM portal_user WHERE email = ${email} AND disabled_at IS NULL` : [];
    const ok = await verifyPassword(password, rows[0]?.password_hash ?? null);
    if (!ok || !rows[0]) { await audit(c, 'login_failed', rows[0]?.id ?? null, null, email); return apiError(c, 401, 'bad_login', 'That email and password do not match.'); }
    await startSession(c, rows[0].id);
    await audit(c, 'login', rows[0].id);
    return c.json({ ok: true });
  });

  app.post('/logout', async (c) => {
    const token = getCookie(c, COOKIE);
    if (token) await sql`DELETE FROM portal_session WHERE token_hash = ${tokenHash(token)}`;
    deleteCookie(c, COOKIE, { path: '/api/portal' });
    return c.json({ ok: true });
  });

  app.get('/me', async (c) => {
    const user = c.get('user');
    if (!user) return c.json({ user: null });
    const names = new Map(((await sql<{ data: CatalogEntry[] }[]>`SELECT data FROM portal_cache WHERE name = 'catalog'`)[0]?.data ?? []).map((e) => [e.id, e.name]));
    const portfolios = user.staff ? [] : (await sql<{ portfolio_id: string; role: MemberRole }[]>`
      SELECT portfolio_id, role FROM portal_member WHERE user_id = ${user.id} ORDER BY created_at`)
      .map((m) => ({ id: m.portfolio_id, role: m.role, name: names.get(m.portfolio_id) ?? null }));
    return c.json({ user: { email: user.email, name: user.name, staff: user.staff }, portfolios });
  });

  // ── Staff: every portfolio in Rentvine ──────────────────────────────────
  app.get('/catalog', async (c) => {
    const user = c.get('user');
    if (!user) return apiError(c, 401, 'signed_out', 'Please sign in.');
    if (!user.staff) return apiError(c, 403, 'forbidden', 'Not allowed.');
    const row = (await sql<{ data: CatalogEntry[]; fetched_at: Date }[]>`SELECT data, fetched_at FROM portal_cache WHERE name = 'catalog'`)[0];
    if (!row || now() - row.fetched_at.getTime() > LISTS_FRESH_MS) refreshCatalog();
    return c.json({ state: row ? 'ready' : 'loading', fetchedAt: row?.fetched_at ?? null, portfolios: row?.data ?? [] });
  });

  // ── One portfolio ───────────────────────────────────────────────────────
  const idOk = (id: string) => /^[0-9A-Za-z_-]{1,40}$/.test(id);

  async function snapshot(id: string) {
    return (await sql<{ state: string; data: PortfolioData | null; error: string | null; fetched_at: Date | null }[]>`
      SELECT state, data, error, fetched_at FROM portal_snapshot WHERE portfolio_id = ${id}`)[0] ?? null;
  }

  async function gate(c: Context, need: Permission) {
    const user = c.get('user') as User | null;
    const id = c.req.param('id') ?? '';
    if (!user) return { fail: apiError(c, 401, 'signed_out', 'Please sign in.') };
    if (!idOk(id)) return { fail: apiError(c, 404, 'not_found', 'Not found.') };
    const role = await roleOn(user, id);
    if (!role) { await audit(c, 'denied', user.id, id); return { fail: apiError(c, 403, 'not_yours', 'This portfolio is not on your account.') }; }
    if (!permissions(role).has(need)) return { fail: apiError(c, 403, 'forbidden', 'Your access does not include this.') };
    return { user, id, role };
  }

  app.get('/portfolios/:id', async (c) => {
    // Any role on this portfolio may open it (an accountant has no homes:view);
    // what each role sees is cut down by viewFor.
    const user = c.get('user');
    const id = c.req.param('id');
    if (!user) return apiError(c, 401, 'signed_out', 'Please sign in.');
    if (!idOk(id)) return apiError(c, 404, 'not_found', 'Not found.');
    const role = await roleOn(user, id);
    if (!role) { await audit(c, 'denied', user.id, id); return apiError(c, 403, 'not_yours', 'This portfolio is not on your account.'); }
    const snap = await snapshot(id);
    if (!snap?.data) {
      if (!snap || snap.state !== 'building') rebuild(id);
      return c.json({ state: snap?.state === 'error' ? 'error' : 'building', error: snap?.state === 'error' ? snap.error : null, role, permissions: PERMS_OF(role) });
    }
    if (snap.state !== 'building' && snap.fetched_at && now() - snap.fetched_at.getTime() > SNAPSHOT_FRESH_MS) rebuild(id);
    await audit(c, 'view', user.id, id);
    return c.json({
      state: snap.state === 'building' ? 'refreshing' : 'ready', role, permissions: PERMS_OF(role), fetchedAt: snap.fetched_at,
      notes: role === 'staff' ? snap.data.notes : [], portfolio: viewFor(snap.data, role, now()),
    });
  });

  app.post('/portfolios/:id/refresh', async (c) => {
    const g = await gate(c, 'portfolio:any'); if ('fail' in g) return g.fail;
    rebuild(g.id, true);
    await audit(c, 'refresh', g.user.id, g.id);
    return c.json({ ok: true });
  });

  app.get('/portfolios/:id/photo/:home', async (c) => {
    const g = await gate(c, 'homes:view'); if ('fail' in g) return g.fail;
    const home = (await snapshot(g.id))?.data?.homes.find((h) => h.id === c.req.param('home'));
    const url = home?.photoUrl;
    if (!url || !url.startsWith(RENTVINE_CDN)) return apiError(c, 404, 'not_found', 'No photo.');
    try {
      const res = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
      const type = res.headers.get('content-type') ?? '';
      if (!res.ok || !/^image\/(jpeg|png|webp|gif|avif)/.test(type)) return apiError(c, 502, 'photo_failed', 'The photo did not load.');
      const bytes = await res.arrayBuffer();
      if (bytes.byteLength > MAX_IMAGE) return apiError(c, 502, 'photo_failed', 'The photo is too large.');
      return c.body(bytes, 200, { 'Content-Type': type, 'Cache-Control': 'private, max-age=86400' });
    } catch (err) {
      logFailure(c, 'portal_photo', err);
      return apiError(c, 502, 'photo_failed', 'The photo did not load.');
    }
  });

  app.get('/portfolios/:id/files/:file', async (c) => {
    const g = await gate(c, 'documents:view'); if ('fail' in g) return g.fail;
    const file = (await snapshot(g.id))?.data?.files.find((f) => f.id === c.req.param('file'));
    if (!file || !/^\d{1,12}$/.test(file.id)) return apiError(c, 404, 'not_found', 'Not found.');
    const api = await deps.rentvine();
    if (!api) return apiError(c, 503, 'unavailable', 'Documents are not available right now.');
    try {
      const { bytes, type } = await serial(() => api.download(`files/${file.id}/download`));
      if (bytes.byteLength > 60 * 1024 * 1024) return apiError(c, 502, 'file_failed', 'The file is too large.');
      await audit(c, 'download', g.user.id, g.id, file.name);
      const safe = file.name.replace(/[^\w .()-]/g, '_').slice(0, 120) || 'document';
      return c.body(bytes, 200, {
        'Content-Type': /^[\w.+-]+\/[\w.+-]+$/.test(type) ? type : 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safe}"`, 'Cache-Control': 'private, no-store',
      });
    } catch (err) {
      logFailure(c, 'portal_file', err);
      return apiError(c, 502, 'file_failed', 'Rentvine did not send the file.');
    }
  });

  app.get('/portfolios/:id/statements/:statement', async (c) => {
    const g = await gate(c, 'statements:download'); if ('fail' in g) return g.fail;
    const st = (await snapshot(g.id))?.data?.statements.find((s) => s.id === c.req.param('statement'));
    if (!st || !/^\d{1,12}$/.test(st.id)) return apiError(c, 404, 'not_found', 'Not found.');
    const api = await deps.rentvine();
    if (!api) return apiError(c, 503, 'unavailable', 'Statements are not available right now.');
    try {
      const { bytes } = await serial(() => api.download(`portfolios/statements/${st.id}/download`));
      if (bytes.byteLength > 60 * 1024 * 1024) return apiError(c, 502, 'file_failed', 'The statement is too large.');
      await audit(c, 'statement', g.user.id, g.id, st.to);
      return c.body(bytes, 200, {
        'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="owner-statement-${(st.to ?? st.id).slice(0, 7)}.zip"`,
        'Cache-Control': 'private, no-store',
      });
    } catch (err) {
      logFailure(c, 'portal_statement', err);
      return apiError(c, 502, 'file_failed', 'Rentvine did not send the statement.');
    }
  });

  // ── People on a portfolio, and invites ──────────────────────────────────
  app.get('/portfolios/:id/members', async (c) => {
    const g = await gate(c, 'members:view'); if ('fail' in g) return g.fail;
    const members = await sql<{ email: string; name: string; role: string }[]>`
      SELECT u.email, u.name, m.role FROM portal_member m JOIN portal_user u ON u.id = m.user_id
      WHERE m.portfolio_id = ${g.id} AND u.disabled_at IS NULL ORDER BY m.created_at`;
    const invites = await sql<{ email: string; role: string; expires_at: Date }[]>`
      SELECT email, role, expires_at FROM portal_invite WHERE portfolio_id = ${g.id} AND used_at IS NULL AND expires_at > now() ORDER BY created_at DESC`;
    return c.json({ members, invites });
  });

  app.post('/invites', async (c) => {
    const user = c.get('user');
    if (!user) return apiError(c, 401, 'signed_out', 'Please sign in.');
    const hit = await limited(c, 'invite', user.id, 40, 3600_000); if (hit) return hit;
    const b = await json(c);
    const email = normEmail(b?.email);
    const asStaff = b?.staff === true;
    const portfolioId = typeof b?.portfolioId === 'string' ? b.portfolioId : null;
    const role = MEMBER_ROLES.includes(b?.role as MemberRole) ? b!.role as MemberRole : null;
    if (!email) return apiError(c, 400, 'invalid', 'Enter a valid email.');
    if (asStaff) {
      if (!user.staff) return apiError(c, 403, 'forbidden', 'Only Westrom staff invite staff.');
      if (!email.endsWith('@westromgroup.com')) return apiError(c, 400, 'invalid', 'Staff use a westromgroup.com email.');
    } else {
      if (!portfolioId || !idOk(portfolioId) || !role) return apiError(c, 400, 'invalid', 'Choose a portfolio and a role.');
      const mine = await roleOn(user, portfolioId);
      if (!mine || !permissions(mine).has('members:manage')) return apiError(c, 403, 'forbidden', 'You cannot invite people to this portfolio.');
      if (mine !== 'staff' && role === 'prospect') return apiError(c, 403, 'forbidden', 'Only staff invite prospective owners.');
    }
    const token = newToken();
    await sql`INSERT INTO portal_invite (token_hash, email, staff, portfolio_id, role, created_by, expires_at)
              VALUES (${tokenHash(token)}, ${email}, ${asStaff}, ${asStaff ? null : portfolioId}, ${asStaff ? null : role}, ${user.id},
                      ${new Date(now() + INVITE_DAYS * 86_400_000)})`;
    await audit(c, 'invite', user.id, portfolioId, `${email} as ${asStaff ? 'staff' : role}`);
    const origin = c.req.header('Origin')!;
    return c.json({ link: `${origin}/portfolio/invite#${token}`, expiresInDays: INVITE_DAYS });
  });

  app.get('/invites/peek', async (c) => {
    const token = c.req.query('t') ?? '';
    const hit = await limited(c, 'peek', getClientIp(c), 30, 3600_000); if (hit) return hit;
    const inv = (await sql<{ email: string; staff: boolean; has_password: boolean }[]>`
      SELECT i.email, i.staff, (u.password_hash IS NOT NULL) AS has_password FROM portal_invite i LEFT JOIN portal_user u ON u.email = i.email
      WHERE i.token_hash = ${tokenHash(token)} AND i.used_at IS NULL AND i.expires_at > now()`)[0];
    if (!inv) return apiError(c, 404, 'invite_gone', 'This invite link has expired or was already used. Ask Westrom Group for a new one.');
    return c.json({ email: inv.email, staff: inv.staff, existing: inv.has_password });
  });

  app.post('/invites/accept', async (c) => {
    const hit = await limited(c, 'accept', getClientIp(c), 10, 3600_000); if (hit) return hit;
    const b = await json(c);
    const token = typeof b?.token === 'string' ? b.token : '';
    const password = typeof b?.password === 'string' ? b.password : '';
    const inv = (await sql<{ email: string; staff: boolean; portfolio_id: string | null; role: MemberRole | null }[]>`
      SELECT email, staff, portfolio_id, role FROM portal_invite WHERE token_hash = ${tokenHash(token)} AND used_at IS NULL AND expires_at > now()`)[0];
    if (!inv) return apiError(c, 404, 'invite_gone', 'This invite link has expired or was already used. Ask Westrom Group for a new one.');
    const existing = (await sql<{ id: string; password_hash: string | null }[]>`SELECT id::text, password_hash FROM portal_user WHERE email = ${inv.email}`)[0];
    let userId: string;
    if (existing?.password_hash) {
      // Joining another portfolio with an account you already have: prove it is you.
      if (!(await verifyPassword(password, existing.password_hash))) return apiError(c, 401, 'bad_login', 'Enter the password you already use with Westrom Group.');
      userId = existing.id;
      if (inv.staff) await sql`UPDATE portal_user SET staff = true WHERE id = ${userId}`;
    } else {
      const problem = passwordProblem(password);
      const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 80) : '';
      if (!name) return apiError(c, 400, 'invalid', 'Enter your name.');
      if (problem) return apiError(c, 400, 'weak_password', problem);
      const hashed = await hashPassword(password);
      userId = (await sql<{ id: string }[]>`INSERT INTO portal_user (email, name, password_hash, staff) VALUES (${inv.email}, ${name}, ${hashed}, ${inv.staff})
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, staff = portal_user.staff OR EXCLUDED.staff
        RETURNING id::text`)[0].id;
    }
    if (!inv.staff && inv.portfolio_id && inv.role) {
      await sql`INSERT INTO portal_member (portfolio_id, user_id, role) VALUES (${inv.portfolio_id}, ${userId}, ${inv.role})
                ON CONFLICT (portfolio_id, user_id) DO UPDATE SET role = EXCLUDED.role`;
    }
    await sql`UPDATE portal_invite SET used_at = now() WHERE token_hash = ${tokenHash(token)}`;
    await audit(c, 'invite_accepted', userId, inv.portfolio_id);
    await startSession(c, userId);
    return c.json({ ok: true, portfolioId: inv.portfolio_id });
  });

  app.post('/portfolios/:id/members/remove', async (c) => {
    const g = await gate(c, 'members:manage'); if ('fail' in g) return g.fail;
    const email = normEmail((await json(c))?.email);
    if (!email) return apiError(c, 400, 'invalid', 'Enter a valid email.');
    await sql`DELETE FROM portal_member m USING portal_user u WHERE m.user_id = u.id AND u.email = ${email} AND m.portfolio_id = ${g.id}`;
    await sql`UPDATE portal_invite SET expires_at = now() WHERE email = ${email} AND portfolio_id = ${g.id} AND used_at IS NULL`;
    await audit(c, 'member_removed', g.user.id, g.id, email);
    return c.json({ ok: true });
  });

  app.onError((err, c) => { logFailure(c, 'portal', err); return apiError(c, 500, 'internal_error', 'Something went wrong. Please try again.'); });
  return app;
}
