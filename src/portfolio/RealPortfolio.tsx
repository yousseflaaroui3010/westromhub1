import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Check, Copy, Search, UserMinus } from 'lucide-react';
import { ROLE_LABEL, type Permission, type Role } from './access';
import type { Home, Portfolio } from './data';
import { Frame, type MenuItem } from './Frame';
import { BlobReveal, HouseArt, HouseBlueprint } from './HouseArt';
import { Ahead, Footer, Hero, HomeDrawer, Homes, Manifesto, Money, Papers, Updates } from './sections';
import { Reveal, fmtDate } from './ui';

// The real owner portfolio page: signed in, data from Rentvine through our
// API. Nothing real is in this code; it all comes from /api/portal, which
// decides access and cuts the data down by role before sending it.

type Me = { user: { email: string; name: string; staff: boolean } | null; portfolios?: { id: string; role: Role; name: string | null }[] };
type Result<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function call<T>(path: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(`/api/portal${path}`, body === undefined
      ? { credentials: 'same-origin' }
      : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, data: data as T };
    return { ok: false, status: res.status, error: (data as { error?: string }).error ?? 'Something went wrong. Please try again.' };
  } catch {
    return { ok: false, status: 0, error: 'You seem to be offline. Check the connection and try again.' };
  }
}

export default function RealPortfolio() {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    let alive = true;
    void call<Me>('/me').then((r) => { if (alive) setMe(r.ok ? r.data : { user: null }); });
    return () => { alive = false; };
  }, [nonce]);

  const path = location.pathname.replace(/\/+$/, '');
  const id = path.match(/^\/portfolio\/([0-9A-Za-z_-]{1,40})$/)?.[1];

  useEffect(() => { document.title = 'Owner portfolio · Westrom Group'; }, [path]);

  if (path === '/portfolio/setup') return <Setup onDone={() => { reload(); navigate('/portfolio'); }} />;
  if (path === '/portfolio/invite') return <Invite onDone={(pid) => { reload(); navigate(pid ? `/portfolio/${pid}` : '/portfolio'); }} />;
  if (!me) return <Frame label="Owner portfolio"><Waiting title={<>One moment.</>} /></Frame>;
  if (!me.user) return <SignIn onDone={reload} />;

  const signOut = async () => { await call('/logout', {}); setMe({ user: null }); navigate('/portfolio'); };
  const who = { name: me.user.name, role: me.user.staff ? 'Westrom Group staff' : undefined };

  if (id && id !== 'setup' && id !== 'invite') return <PortfolioPage id={id} me={me} who={who} onSignOut={signOut} />;
  if (me.user.staff) return <StaffPicker who={who} onSignOut={signOut} />;
  const mine = me.portfolios ?? [];
  if (mine.length === 1) { navigate(`/portfolio/${mine[0].id}`, { replace: true }); return null; }
  return (
    <Frame label="Owner portfolio" who={who} menu={[{ label: 'Sign out', onClick: signOut }]}>
      <section className="pf-chapter pf-picker" data-tone="paper">
        <Reveal className="pf-chapter-in">
          <p className="pf-kicker">Your portfolios</p>
          <h1 className="pf-title">Welcome back, <em>{me.user.name.split(' ')[0]}.</em></h1>
          {mine.length === 0
            ? <p className="pf-lede">No portfolio is on your account yet. Westrom Group will send you an invite link.</p>
            : <ul className="pf-list">{mine.map((p) => (
                <li key={p.id}><a href={`/portfolio/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/portfolio/${p.id}`); }}>
                  <span className="pf-list-name">{p.name ?? `Portfolio ${p.id}`}</span><span className="pf-muted">{ROLE_LABEL[p.role]}</span><ArrowUpRight aria-hidden />
                </a></li>
              ))}</ul>}
        </Reveal>
      </section>
    </Frame>
  );
}

/* ── Sign in, setup, invite ───────────────────────────── */

function AuthLayout({ kicker, title, children }: { kicker: string; title: ReactNode; children: ReactNode }) {
  return (
    <Frame label="Owner portfolio">
      <section className="pf-auth" data-tone="paper" id="top">
        <div className="pf-auth-art">
          <BlobReveal
            className="pf-arch" intro label="Move over the house"
            base={<HouseArt style="twostory" palette={3} />}
            reveal={<HouseBlueprint style="twostory" facts={{ beds: null, baths: null, sqft: null, yearBuilt: null, rent: 'YOURS' }} />}
          />
        </div>
        <div className="pf-auth-form">
          <p className="pf-kicker">{kicker}</p>
          <h1 className="pf-title">{title}</h1>
          {children}
        </div>
      </section>
    </Frame>
  );
}

function Field({ id, label, ...rest }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="pf-field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={id} className="pf-input" {...rest} />
    </label>
  );
}

function SignIn({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  useEffect(() => { void call<{ needed: boolean }>('/setup').then((r) => r.ok && setSetupNeeded(r.data.needed)); }, []);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setError(null);
    const r = await call('/login', { email: f.get('email'), password: f.get('password') });
    setBusy(false);
    if (r.ok) onDone(); else setError(r.error);
  };
  return (
    <AuthLayout kicker="Westrom Group · Owner portfolio" title={<>Your homes, <em>one sign-in away.</em></>}>
      <form className="pf-form" onSubmit={submit}>
        <Field id="email" label="Email" type="email" autoComplete="username" required />
        <Field id="password" label="Password" type="password" autoComplete="current-password" required />
        {error && <p className="pf-alert" role="alert">{error}</p>}
        <button className="pf-btn is-red" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="pf-auth-note">New here? Open the invite link Westrom Group sent you. Forgot your password? Ask your property manager for a new link.</p>
      {setupNeeded && <p className="pf-auth-note"><a className="pf-link" href="/portfolio/setup">First-time setup for Westrom Group staff <ArrowUpRight aria-hidden /></a></p>}
    </AuthLayout>
  );
}

function Setup({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get('password') !== f.get('password2')) { setError('The two passwords are different.'); return; }
    setBusy(true); setError(null);
    const r = await call('/setup', { code: f.get('code'), name: f.get('name'), email: f.get('email'), password: f.get('password') });
    setBusy(false);
    if (r.ok) onDone(); else setError(r.error);
  };
  return (
    <AuthLayout kicker="First-time setup" title={<>Make the <em>first staff account.</em></>}>
      <p className="pf-auth-note">The setup code is the <b>portal_setup_code</b> row in the app_secret table, in Railway’s database view. It works once, for the first account; everyone after that joins by invite.</p>
      <form className="pf-form" onSubmit={submit}>
        <Field id="code" label="Setup code" autoComplete="off" required />
        <Field id="name" label="Your name" autoComplete="name" required />
        <Field id="email" label="Work email (westromgroup.com)" type="email" autoComplete="username" required />
        <Field id="password" label="Password (10 characters or more)" type="password" autoComplete="new-password" minLength={10} required />
        <Field id="password2" label="Password again" type="password" autoComplete="new-password" minLength={10} required />
        {error && <p className="pf-alert" role="alert">{error}</p>}
        <button className="pf-btn is-red" disabled={busy}>{busy ? 'Creating…' : 'Create the account'}</button>
      </form>
    </AuthLayout>
  );
}

function Invite({ onDone }: { onDone: (portfolioId: string | null) => void }) {
  const token = useMemo(() => window.location.hash.replace(/^#/, ''), []);
  const [info, setInfo] = useState<{ email: string; existing: boolean } | { error: string } | null>(
    () => (token ? null : { error: 'This link is missing its code. Open the full link from your email.' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!token) return;
    void call<{ email: string; existing: boolean }>(`/invites/peek?t=${encodeURIComponent(token)}`).then((r) => setInfo(r.ok ? r.data : { error: r.error }));
  }, [token]);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (info && 'email' in info && !info.existing && f.get('password') !== f.get('password2')) { setError('The two passwords are different.'); return; }
    setBusy(true); setError(null);
    const r = await call<{ portfolioId: string | null }>('/invites/accept', { token, name: f.get('name'), password: f.get('password') });
    setBusy(false);
    if (r.ok) { history.replaceState(null, '', '/portfolio'); onDone(r.data.portfolioId); } else setError(r.error);
  };
  if (!info) return <Frame label="Owner portfolio"><Waiting title={<>Opening your invite.</>} /></Frame>;
  if ('error' in info) return <AuthLayout kicker="Invite" title={<>This link <em>has expired.</em></>}><p className="pf-lede">{info.error}</p></AuthLayout>;
  return (
    <AuthLayout kicker={`Invite for ${info.email}`} title={info.existing ? <>Add this portfolio <em>to your account.</em></> : <>Welcome to <em>Westrom Group.</em></>}>
      <form className="pf-form" onSubmit={submit}>
        {!info.existing && <Field id="name" label="Your name" autoComplete="name" required />}
        <Field id="password" label={info.existing ? 'Your password' : 'Choose a password (10 characters or more)'} type="password"
          autoComplete={info.existing ? 'current-password' : 'new-password'} minLength={info.existing ? undefined : 10} required />
        {!info.existing && <Field id="password2" label="Password again" type="password" autoComplete="new-password" minLength={10} required />}
        {error && <p className="pf-alert" role="alert">{error}</p>}
        <button className="pf-btn is-red" disabled={busy}>{busy ? 'One moment…' : info.existing ? 'Add it' : 'Open my portfolio'}</button>
      </form>
    </AuthLayout>
  );
}

function Waiting({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <section className="pf-waiting" data-tone="paper" id="top">
      <span className="pf-waiting-line" aria-hidden />
      <h1 className="pf-title">{title}</h1>
      {children}
    </section>
  );
}

/* ── Staff: every portfolio ───────────────────────────── */

type CatalogEntry = { id: string; name: string; homes: number; cities: string[] };

function StaffPicker({ who, onSignOut }: { who: { name: string; role?: string }; onSignOut: () => void }) {
  const navigate = useNavigate();
  const [cat, setCat] = useState<{ state: string; portfolios: CatalogEntry[]; fetchedAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    let stop = false;
    let timer = 0;
    const load = async () => {
      const r = await call<{ state: string; portfolios: CatalogEntry[]; fetchedAt: string | null }>('/catalog');
      if (stop) return;
      if (!r.ok) { setError(r.error); return; }
      setCat(r.data);
      if (r.data.state !== 'ready') timer = window.setTimeout(load, 3000);
    };
    void load();
    return () => { stop = true; window.clearTimeout(timer); };
  }, []);
  const shown = (cat?.portfolios ?? []).filter((p) => !q || `${p.name} ${p.cities.join(' ')}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Frame label="Owner portfolio" who={who} menu={[{ label: 'Invite a teammate', href: '#team' }, { label: 'Sign out', onClick: onSignOut }]} watchKey={String(cat?.portfolios.length)}>
      <section className="pf-chapter pf-picker" data-tone="paper" id="top">
        <Reveal className="pf-chapter-in">
          <p className="pf-kicker">Westrom Group staff</p>
          <h1 className="pf-title">Every portfolio, <em>one search away.</em></h1>
          {error && <p className="pf-alert" role="alert">{error}</p>}
          {!cat || cat.state !== 'ready' ? (
            <p className="pf-lede">Reading the portfolio list from Rentvine. The first time takes a minute or two; after that it is kept for six hours.</p>
          ) : (
            <>
              <label className="pf-search" htmlFor="pf-q"><Search aria-hidden /><input id="pf-q" placeholder={`Search ${cat.portfolios.length} portfolios by owner or city`} value={q} onChange={(e) => setQ(e.target.value)} /></label>
              <ul className="pf-list">
                {shown.slice(0, 60).map((p) => (
                  <li key={p.id}>
                    <a href={`/portfolio/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/portfolio/${p.id}`); }}>
                      <span className="pf-list-name">{p.name}</span>
                      <span className="pf-muted">{p.homes} {p.homes === 1 ? 'home' : 'homes'}{p.cities.length ? ` · ${p.cities.join(', ')}` : ''}</span>
                      <ArrowUpRight aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              {shown.length > 60 && <p className="pf-muted pf-small">Showing 60 of {shown.length}. Search to narrow it down.</p>}
            </>
          )}
        </Reveal>
      </section>
      <section className="pf-chapter" data-tone="paper" id="team">
        <Reveal className="pf-chapter-in">
          <p className="pf-kicker">Team</p>
          <h2 className="pf-title">Invite <em>a teammate.</em></h2>
          <InviteForm staff />
        </Reveal>
      </section>
    </Frame>
  );
}

/* ── One portfolio ───────────────────────────────────── */

type PortfolioAnswer = {
  state: 'building' | 'refreshing' | 'ready' | 'error'; error?: string | null; role: Role; permissions: Permission[];
  fetchedAt?: string; notes?: string[]; portfolio?: Portfolio;
};

function PortfolioPage({ id, me, who, onSignOut }: { id: string; me: Me; who: { name: string; role?: string }; onSignOut: () => void }) {
  const navigate = useNavigate();
  const [answer, setAnswer] = useState<PortfolioAnswer | null>(null);
  const [error, setError] = useState<{ status: number; text: string } | null>(null);
  const [open, setOpen] = useState<Home | null>(null);
  const [tick, setTick] = useState(0);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    const load = async () => {
      const r = await call<PortfolioAnswer>(`/portfolios/${id}`);
      if (stop) return;
      if (!r.ok) { setError({ status: r.status, text: r.error }); return; }
      setAnswer(r.data);
      if (r.data.state === 'building' || r.data.state === 'refreshing') timer = window.setTimeout(load, 2500);
    };
    void load();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [id, tick]);

  const p = answer?.portfolio;
  useEffect(() => { if (p) document.title = `${p.name} · Westrom Group`; }, [p]);
  const perms = useMemo(() => new Set(answer?.permissions ?? []), [answer]);
  const staff = !!me.user?.staff;
  const firstName = me.user!.name.split(' ')[0];

  const menu: MenuItem[] = [];
  if (p) {
    if (perms.has('homes:view') && p.homes.length) menu.push({ label: 'Homes', href: '#homes' });
    if (perms.has('money:view') && p.ledger.length) menu.push({ label: 'Money', href: '#money' });
    if (perms.has('alerts:view')) menu.push({ label: 'Ahead', href: '#ahead' });
    if (perms.has('documents:view') && p.documents.length) menu.push({ label: 'Papers', href: '#papers' });
    if (perms.has('members:view')) menu.push({ label: 'Access', href: '#access' });
  }
  if (staff) {
    menu.push({ label: 'All portfolios', onClick: () => navigate('/portfolio'), quiet: true });
    menu.push({ label: 'Refresh from Rentvine', onClick: async () => { await call(`/portfolios/${id}/refresh`, {}); setTick((t) => t + 1); }, quiet: true });
  } else if ((me.portfolios ?? []).length > 1) {
    menu.push({ label: 'My portfolios', onClick: () => navigate('/portfolio'), quiet: true });
  }
  menu.push({ label: 'Sign out', onClick: onSignOut, quiet: true });

  if (error) {
    return (
      <Frame label="Owner portfolio" who={who} menu={menu}>
        <section className="pf-denied" data-tone="paper" id="top">
          <p className="pf-kicker">{error.status === 403 ? '403 · Not your portfolio' : 'Something went wrong'}</p>
          <h1 className="pf-title">{error.status === 403 ? <>This portfolio <em>is private.</em></> : <>We could not <em>open it.</em></>}</h1>
          <p className="pf-lede">{error.text}</p>
          <a className="pf-btn is-red" href="/portfolio">Back</a>
        </section>
      </Frame>
    );
  }
  if (!answer || !p) {
    return (
      <Frame label="Owner portfolio" who={who} menu={menu}>
        <Waiting title={answer?.state === 'error' ? <>Rentvine <em>did not answer.</em></> : <>Reading your portfolio <em>from Rentvine.</em></>}>
          <p className="pf-lede">{answer?.state === 'error'
            ? `${answer.error ?? 'Rentvine could not be read.'} ${staff ? 'Use Refresh from Rentvine in the menu to try again.' : 'Please try again in a few minutes.'}`
            : 'The first time takes about a minute: homes, leases, statements and photos. After that it opens at once.'}</p>
        </Waiting>
      </Frame>
    );
  }

  const role = answer.role;
  return (
    <Frame label={p.stage === 'prospect' ? 'Proposal' : 'Owner portfolio'} who={{ name: who.name, role: ROLE_LABEL[role] }} menu={menu}
      footnote={`${p.name} · read from Rentvine ${answer.fetchedAt ? fmtDate(answer.fetchedAt.slice(0, 10), { month: 'short', day: 'numeric' }) : ''}`} watchKey={`${id}:${answer.fetchedAt}`}>
      <Hero portfolio={p} firstName={firstName} perms={perms} role={role} />
      <Manifesto portfolio={p} perms={perms} />
      {perms.has('homes:view') && p.homes.length > 0 && <Homes portfolio={p} perms={perms} onOpen={setOpen} />}
      {perms.has('money:view') && p.ledger.length > 0 && <Money portfolio={p} perms={perms} />}
      {perms.has('feed:view') && p.feed.length > 0 && <Updates portfolio={p} />}
      {perms.has('alerts:view') && p.keyDates.length > 0 && <Ahead portfolio={p} />}
      {perms.has('documents:view') && p.documents.length > 0 && <Papers portfolio={p} />}
      {perms.has('members:view') && <RealAccess portfolio={p} role={role} perms={perms} />}
      {staff && answer.notes && answer.notes.length > 0 && (
        <section className="pf-chapter pf-notes" data-tone="paper"><div className="pf-chapter-in"><p className="pf-kicker">Staff only · what Rentvine did not send</p><ul>{answer.notes.map((n) => <li key={n}>{n}</li>)}</ul></div></section>
      )}
      <Footer portfolio={p} />
      {open && <HomeDrawer home={open} portfolio={p} perms={perms} onClose={close} />}
    </Frame>
  );
}

/* ── People and invites ──────────────────────────────── */

function InviteForm({ portfolioId, staff = false, roles = [], prefill = '' }: { portfolioId?: string; staff?: boolean; roles?: Role[]; prefill?: string }) {
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState(prefill);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null); setLink(null); setCopied(false);
    const r = await call<{ link: string }>('/invites', staff ? { email, staff: true } : { email, portfolioId, role: f.get('role') });
    if (r.ok) setLink(r.data.link); else setError(r.error);
  };
  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <form className="pf-invite" onSubmit={submit}>
      <div className="pf-invite-row">
        <Field id={staff ? 'team-email' : 'invite-email'} label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {!staff && (
          <label className="pf-field" htmlFor="invite-role">
            <span>Access</span>
            <select id="invite-role" name="role" className="pf-input" defaultValue={roles[0]}>
              {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </label>
        )}
        <button className="pf-btn">Create invite link</button>
      </div>
      {error && <p className="pf-alert" role="alert">{error}</p>}
      {link && (
        <div className="pf-linkbox">
          <p>Send this link to <b>{email}</b> from your own email. It works once, for 7 days.</p>
          <div><code className="pf-select">{link}</code><button type="button" className="pf-icon" onClick={copy} aria-label="Copy link">{copied ? <Check /> : <Copy />}</button></div>
        </div>
      )}
    </form>
  );
}

function RealAccess({ portfolio, role, perms }: { portfolio: Portfolio; role: Role; perms: ReadonlySet<Permission> }) {
  const [data, setData] = useState<{ members: { email: string; name: string; role: Role }[]; invites: { email: string; role: Role; expires_at: string }[] } | null>(null);
  const [prefill, setPrefill] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => { void call<NonNullable<typeof data>>(`/portfolios/${portfolio.id}/members`).then((r) => r.ok && setData(r.data)); }, [portfolio.id, tick]);
  const manage = perms.has('members:manage');
  const roles: Role[] = role === 'staff' ? ['owner', 'accountant', 'prospect'] : ['accountant', 'owner'];
  const remove = async (email: string) => { await call(`/portfolios/${portfolio.id}/members/remove`, { email }); setTick((t) => t + 1); };
  const onPortal = new Set((data?.members ?? []).map((m) => m.email));
  return (
    <section id="access" data-tone="paper" className="pf-chapter">
      <Reveal className="pf-chapter-in">
        <p className="pf-kicker">Access</p>
        <h2 className="pf-title">Who sees <em>this portfolio.</em></h2>
        <p className="pf-lede">Co-owners share it. An accountant sees the money and the papers, never the tenants. Nobody opens a portfolio they are not on.</p>
        <div className="pf-access">
          <ul className="pf-members">
            {(data?.members ?? []).map((m) => (
              <li key={m.email}>
                <b>{m.name} · {m.email}</b><span>{ROLE_LABEL[m.role]}</span>
                {manage && <button className="pf-link pf-remove" onClick={() => remove(m.email)}><UserMinus aria-hidden /> Remove</button>}
              </li>
            ))}
            {(data?.invites ?? []).map((i) => <li key={`i-${i.email}`}><b>{i.email}</b><span>Invited as {ROLE_LABEL[i.role].toLowerCase()}, waiting</span></li>)}
            <li><b>Your Westrom Group team</b><span>Staff</span></li>
          </ul>
          <div>
            {manage && <InviteForm key={prefill} portfolioId={portfolio.id} roles={roles} prefill={prefill} />}
            {role === 'staff' && portfolio.contacts && portfolio.contacts.length > 0 && (
              <div className="pf-contacts">
                <p className="pf-kicker">Owners in Rentvine</p>
                <ul className="pf-rows">
                  {portfolio.contacts.map((c) => (
                    <li key={`${c.name}-${c.email}`}>
                      <span>{c.name}{c.share != null && <span className="pf-muted"> · {c.share}%</span>}</span>
                      <span className="pf-muted">{c.email ?? 'No email in Rentvine'}</span>
                      {c.email && !onPortal.has(c.email)
                        ? <button className="pf-link" onClick={() => setPrefill(c.email!)}>Invite</button>
                        : <span className="pf-muted">{c.email ? 'On the portal' : ''}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
