// Owner portal API (/api/portal/*).
//
// Sign-in: email + a 6-digit code (10 minutes, 5 tries) sent by n8n through
// the same gateway secret the lead form uses. Who may sign in, and to what:
//   - a staff email domain (westromgroup.com): every portfolio;
//   - an email Rentvine lists on a portfolio's owner contact: those portfolios;
//   - an email an owner (or staff) added to a portfolio, e.g. their accountant.
// Anyone else gets the same answer and no email, so the form does not reveal
// who is an owner. Sessions: HttpOnly cookie scoped to /api/portal
// (SameSite=Lax; Secure behind HTTPS); only a SHA-256 of the token is stored.
// POSTs must carry an allowed Origin. Every portfolio read checks the role on
// THAT portfolio and cuts the data down by role (portal/view.ts).

import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { timingSafeEqual } from 'node:crypto';
import type { Sql } from '../db';
import { apiError, logFailure } from '../http/errors';
import { getClientIp } from '../security/clientIp';
import type { CounterStore } from '../security/store';
import { permissions, type MemberRole, type Permission, type Role } from './access';
import { codeHash, newToken, normEmail, sixDigitCode, tokenHash } from './crypto';
import { buildPortfolio, catalog, loadLists, RENTVINE_CDN, SNAPSHOT_VERSION, type CatalogEntry, type Estimator, type Lists, type PortfolioData, type RvApi } from './rentvine';
import { viewFor } from './view';

export interface PortalDeps {
  sql: Sql;
  store: CounterStore;
  /** The Rentvine client, or null while no key is stored. */
  rentvine: () => Promise<(RvApi & { download(path: string): Promise<{ bytes: ArrayBuffer; type: string }> }) | null>;
  estimate: Estimator | null;
  /** Sends the sign-in code (n8n). Null: sign-in cannot send codes (logged). */
  sendCode: ((to: { email: string; name: string | null }, code: string) => Promise<void>) | null;
  /** Email domains that are Westrom Group staff. Default: westromgroup.com. */
  staffDomains?: string[];
  /** Keep Rentvine's lists warm in the background (off in tests). */
  warm?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

const COOKIE = 'wg_portal';
const SESSION_DAYS = 14;
const CODE_MINUTES = 10;
const CODE_TRIES = 5;
const LISTS_FRESH_MS = 6 * 3600_000;
const SNAPSHOT_FRESH_MS = 24 * 3600_000;
const MAX_IMAGE = 15 * 1024 * 1024;

/** The picture's type from its first bytes (Rentvine's downloads do not always say). */
export function imageType(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}


interface User { id: string; email: string; name: string; staff: boolean }
type Env = { Variables: { user: User | null } };

const PERMS_OF = (role: Role | null) => [...permissions(role)];

export function portalRoutes(deps: PortalDeps) {
  const { sql, store } = deps;
  // Pictures read through the Rentvine API (not the CDN), kept in memory so a page view costs no extra Rentvine calls.
  const photoCache = new Map<string, { bytes: ArrayBuffer; type: string }>();
  const now = deps.now ?? Date.now;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const staffDomains = (deps.staffDomains ?? ['westromgroup.com']).map((d) => d.toLowerCase());
  const isStaff = (email: string) => staffDomains.some((d) => email.endsWith(`@${d}`));
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
      // Staff is the email's domain, checked on every request (not a stored flag).
      c.set('user', rows[0] ? { ...rows[0], staff: isStaff(rows[0].email) } : null);
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
    if (rows[0]) return rows[0].role;
    return (await owners()).byEmail.get(user.email)?.has(portfolioId) ? 'owner' : null;
  }

  // Rentvine's owner contacts by email, from the cached lists (rebuilt when the lists change).
  let ownerIndex: { at: number; byEmail: Map<string, Set<string>>; names: Map<string, string> } | null = null;
  async function owners() {
    const row = (await sql<{ data: Lists; fetched_at: Date }[]>`SELECT data, fetched_at FROM portal_cache WHERE name = 'lists'`)[0];
    if (!row) return { byEmail: new Map<string, Set<string>>(), names: new Map<string, string>() };
    if (ownerIndex && ownerIndex.at === row.fetched_at.getTime()) return ownerIndex;
    const emailOf = new Map(row.data.owners.filter((o) => o.email).map((o) => [o.contactId, o.email as string]));
    const byEmail = new Map<string, Set<string>>();
    const names = new Map<string, string>();
    for (const p of row.data.portfolios) {
      if (!p.active) continue;
      for (const ct of p.contacts) {
        const email = emailOf.get(ct.contactId);
        if (!email) continue;
        if (!byEmail.has(email)) byEmail.set(email, new Set());
        byEmail.get(email)!.add(p.id);
        if (ct.name) names.set(email, ct.name);
      }
    }
    ownerIndex = { at: row.fetched_at.getTime(), byEmail, names };
    return ownerIndex;
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

  // ── Sign in with an emailed code ───────────────────────────────────────
  const NEUTRAL = { ok: true, message: 'If that email is on file with Westrom Group, a 6-digit code is on its way. It works for 10 minutes.' };

  app.post('/login/start', async (c) => {
    const ipHit = await limited(c, 'code-ip', getClientIp(c), 10, 15 * 60_000); if (ipHit) return ipHit;
    const email = normEmail((await json(c))?.email);
    if (!email) return apiError(c, 400, 'invalid', 'Enter a valid email.');
    const eHit = await limited(c, 'code-email', email, 5, 3600_000); if (eHit) return eHit;
    const idx = await owners();
    const member = (await sql`SELECT 1 FROM portal_member m JOIN portal_user u ON u.id = m.user_id WHERE u.email = ${email} AND u.disabled_at IS NULL LIMIT 1`).length > 0;
    const allowed = isStaff(email) || idx.byEmail.has(email) || member;
    if (!allowed) { await audit(c, 'code_not_on_file', null, null, email); return c.json(NEUTRAL); }
    const disabled = (await sql`SELECT 1 FROM portal_user WHERE email = ${email} AND disabled_at IS NOT NULL`).length > 0;
    if (disabled) { await audit(c, 'code_disabled', null, null, email); return c.json(NEUTRAL); }
    const code = sixDigitCode();
    await sql`INSERT INTO portal_code (email, code_hash, expires_at, attempts) VALUES (${email}, ${codeHash(email, code)}, ${new Date(now() + CODE_MINUTES * 60_000)}, 0)
              ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = now()`;
    if (!deps.sendCode) { console.error('[portal] no code sender configured (N8N_LEAD_WEBHOOK_BASE / gateway secret)'); return c.json(NEUTRAL); }
    try {
      await deps.sendCode({ email, name: idx.names.get(email) ?? null }, code);
      await audit(c, 'code_sent', null, null, email);
    } catch (err) {
      console.error(`[portal] sending the sign-in code failed: ${err instanceof Error ? err.message.slice(0, 160) : 'error'}`);
      await audit(c, 'code_send_failed', null, null, email);
    }
    return c.json(NEUTRAL);
  });

  app.post('/login/verify', async (c) => {
    const ipHit = await limited(c, 'verify-ip', getClientIp(c), 20, 15 * 60_000); if (ipHit) return ipHit;
    const b = await json(c);
    const email = normEmail(b?.email);
    const code = typeof b?.code === 'string' ? b.code.replace(/\s+/g, '') : '';
    const wrong = () => apiError(c, 401, 'bad_code', 'That code is not right or has expired. Ask for a new one.');
    if (!email || !/^\d{6}$/.test(code)) return wrong();
    const row = (await sql<{ code_hash: string; expires_at: Date; attempts: number }[]>`
      UPDATE portal_code SET attempts = attempts + 1 WHERE email = ${email} RETURNING code_hash, expires_at, attempts`)[0];
    if (!row || row.expires_at.getTime() < now() || row.attempts > CODE_TRIES) { await audit(c, 'code_rejected', null, null, email); return wrong(); }
    const a = Buffer.from(row.code_hash), e = Buffer.from(codeHash(email, code));
    if (a.length !== e.length || !timingSafeEqual(a, e)) { await audit(c, 'code_wrong', null, null, email); return wrong(); }
    await sql`DELETE FROM portal_code WHERE email = ${email}`;
    const name = (await owners()).names.get(email) ?? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
    const user = (await sql<{ id: string; disabled: boolean }[]>`
      INSERT INTO portal_user (email, name, staff) VALUES (${email}, ${name.slice(0, 80)}, ${isStaff(email)})
      ON CONFLICT (email) DO UPDATE SET staff = EXCLUDED.staff RETURNING id::text, (disabled_at IS NOT NULL) AS disabled`)[0];
    if (user.disabled) return wrong();
    await startSession(c, user.id);
    await audit(c, 'login', user.id);
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
    const mine = new Map<string, MemberRole>();
    if (!user.staff) {
      for (const id of (await owners()).byEmail.get(user.email) ?? []) mine.set(id, 'owner');
      for (const m of await sql<{ portfolio_id: string; role: MemberRole }[]>`SELECT portfolio_id, role FROM portal_member WHERE user_id = ${user.id} ORDER BY created_at`) {
        if (!mine.has(m.portfolio_id)) mine.set(m.portfolio_id, m.role);
      }
    }
    const portfolios = [...mine].map(([id, role]) => ({ id, role, name: names.get(id) ?? null }));
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
  // Rentvine portfolio ids are numbers.
  const idOk = (id: string) => /^\d{1,12}$/.test(id);

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
    // Staff can see the page exactly as an owner or accountant would (?as=owner), to show it.
    const as = c.req.query('as');
    const preview = role === 'staff' && (as === 'owner' || as === 'accountant') ? as : null;
    const shown: Role = preview ?? role;
    const snap = await snapshot(id);
    if (!snap?.data) {
      if (!snap || snap.state !== 'building') rebuild(id);
      return c.json({ state: snap?.state === 'error' ? 'error' : 'building', error: snap?.state === 'error' ? snap.error : null, role: shown, permissions: PERMS_OF(shown), preview });
    }
    if (snap.state !== 'building' && snap.fetched_at && (now() - snap.fetched_at.getTime() > SNAPSHOT_FRESH_MS || snap.data?.v !== SNAPSHOT_VERSION)) rebuild(id);
    await audit(c, preview ? `preview_${preview}` : 'view', user.id, id);
    return c.json({
      state: snap.state === 'building' ? 'refreshing' : 'ready', role: shown, permissions: PERMS_OF(shown), fetchedAt: snap.fetched_at, preview,
      notes: role === 'staff' && !preview ? snap.data.notes : [], portfolio: viewFor(snap.data, shown, now()),
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
    const file = home?.photoFile;
    if (!url && file && /^\d{1,12}$/.test(file.id)) {
      try {
        const key = `${file.kind}:${file.id}`;
        let hit = photoCache.get(key);
        if (!hit) {
          const api = await deps.rentvine();
          if (!api) return apiError(c, 503, 'unavailable', 'Photos are not available right now.');
          const got = await serial(() => api.download(file.kind === 'listing' ? `listings/files/${file.id}/preview` : `files/${file.id}/download`));
          const type = imageType(new Uint8Array(got.bytes));
          if (!type || got.bytes.byteLength > MAX_IMAGE) return apiError(c, 502, 'photo_failed', 'The photo did not load.');
          hit = { bytes: got.bytes, type };
          photoCache.set(key, hit);
          if (photoCache.size > 120) photoCache.delete(photoCache.keys().next().value!);
        }
        return c.body(hit.bytes, 200, { 'Content-Type': hit.type, 'Cache-Control': 'private, max-age=86400' });
      } catch (err) {
        logFailure(c, 'portal_photo', err);
        return apiError(c, 502, 'photo_failed', 'The photo did not load.');
      }
    }
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

  // ── People on a portfolio ───────────────────────────────────────────────
  // Owners come from Rentvine (they sign in with the email Rentvine has).
  // Others (an accountant, a second owner Rentvine does not list) are added here.
  app.get('/portfolios/:id/members', async (c) => {
    const g = await gate(c, 'members:view'); if ('fail' in g) return g.fail;
    const data = (await snapshot(g.id))?.data;
    const owners = (data?.contacts ?? []).map((o) => ({
      name: o.name, share: o.share, onFile: !!o.email,
      email: g.role === 'staff' ? o.email : null, // owners' emails only for staff
    }));
    const members = await sql<{ email: string; name: string; role: string }[]>`
      SELECT u.email, u.name, m.role FROM portal_member m JOIN portal_user u ON u.id = m.user_id
      WHERE m.portfolio_id = ${g.id} AND u.disabled_at IS NULL ORDER BY m.created_at`;
    return c.json({ owners, members });
  });

  app.post('/portfolios/:id/members/add', async (c) => {
    const g = await gate(c, 'members:manage'); if ('fail' in g) return g.fail;
    const hit = await limited(c, 'member-add', g.user.id, 30, 3600_000); if (hit) return hit;
    const b = await json(c);
    const email = normEmail(b?.email);
    const role: MemberRole | null = b?.role === 'accountant' || b?.role === 'owner' || (b?.role === 'prospect' && g.role === 'staff') ? b.role as MemberRole : null;
    if (!email || !role) return apiError(c, 400, 'invalid', 'Enter an email and choose the access.');
    if (isStaff(email)) return apiError(c, 400, 'invalid', 'Westrom Group staff already see every portfolio.');
    const name = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 80);
    const user = (await sql<{ id: string }[]>`INSERT INTO portal_user (email, name) VALUES (${email}, ${name})
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id::text`)[0];
    await sql`INSERT INTO portal_member (portfolio_id, user_id, role) VALUES (${g.id}, ${user.id}, ${role})
              ON CONFLICT (portfolio_id, user_id) DO UPDATE SET role = EXCLUDED.role`;
    await audit(c, 'member_added', g.user.id, g.id, `${email} as ${role}`);
    return c.json({ ok: true });
  });

  app.post('/portfolios/:id/members/remove', async (c) => {
    const g = await gate(c, 'members:manage'); if ('fail' in g) return g.fail;
    const email = normEmail((await json(c))?.email);
    if (!email) return apiError(c, 400, 'invalid', 'Enter a valid email.');
    await sql`DELETE FROM portal_member m USING portal_user u WHERE m.user_id = u.id AND u.email = ${email} AND m.portfolio_id = ${g.id}`;
    await audit(c, 'member_removed', g.user.id, g.id, email);
    return c.json({ ok: true });
  });

  if (deps.warm !== false) {
    // Owners sign in against Rentvine's lists, so keep them loaded.
    refreshCatalog();
    setInterval(refreshCatalog, LISTS_FRESH_MS).unref();
  }

  app.onError((err, c) => { logFailure(c, 'portal', err); return apiError(c, 500, 'internal_error', 'Something went wrong. Please try again.'); });
  return app;
}
