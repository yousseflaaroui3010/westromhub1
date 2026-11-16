import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Search, UserMinus } from 'lucide-react';
import { ROLE_LABEL, type Permission, type Role } from './access';
import type { Home, Portfolio } from './data';
import { Frame, type MenuItem } from './Frame';
import { BlobReveal, HouseArt, HouseBlueprint } from './HouseArt';
import { Ahead, CareChapter, Footer, Hero, HomeDrawer, Homes, Manifesto, Money, Papers, Updates } from './sections';
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
  const id = path.match(/^\/portfolio\/(\d{1,12})$/)?.[1];
  // Old links from the first version (/portfolio/setup, /portfolio/invite) and anything else land on sign-in.
  useEffect(() => { if (path !== '/portfolio' && !id) navigate('/portfolio', { replace: true }); }, [path, id, navigate]);

  useEffect(() => { document.title = 'Owner portfolio · Westrom Group'; }, [path]);

  if (!me) return <Frame label="Owner portfolio"><Waiting title={<>One moment.</>} /></Frame>;
  if (!me.user) return <SignIn onDone={reload} />;

  const signOut = async () => { await call('/logout', {}); setMe({ user: null }); navigate('/portfolio'); };
  const who = { name: me.user.name, role: me.user.staff ? 'Westrom Group staff' : undefined };

  if (id) return <PortfolioPage id={id} me={me} who={who} onSignOut={signOut} />;
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
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const start = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setBusy(true); setError(null);
    const r = await call<{ message: string }>('/login/start', { email });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setNotice(r.data.message);
    setStep('code');
  };
  const verify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const code = String(new FormData(e.currentTarget).get('code') ?? '');
    setBusy(true); setError(null);
    const r = await call('/login/verify', { email, code });
    setBusy(false);
    if (r.ok) onDone(); else setError(r.error);
  };

  if (step === 'code') {
    return (
      <AuthLayout kicker={`Code sent to ${email}`} title={<>Check <em>your email.</em></>}>
        <p className="pf-auth-note">{notice}</p>
        <form className="pf-form" onSubmit={verify}>
          <label className="pf-field" htmlFor="code">
            <span>6-digit code</span>
            <input id="code" name="code" className="pf-input pf-code" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9 ]{6,7}" maxLength={7} placeholder="000 000" required autoFocus />
          </label>
          {error && <p className="pf-alert" role="alert">{error}</p>}
          <button className="pf-btn is-red" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
        </form>
        <p className="pf-auth-note">
          No email after two minutes? Check spam, then <button className="pf-link" onClick={() => void start()}>send a new code</button> or <button className="pf-link" onClick={() => { setStep('email'); setError(null); }}>use another email</button>.
        </p>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout kicker="Westrom Group · Owner portfolio" title={<>Your homes, <em>one email away.</em></>}>
      <form className="pf-form" onSubmit={start}>
        <Field id="email" label="Your email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        {error && <p className="pf-alert" role="alert">{error}</p>}
        <button className="pf-btn is-red" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
      </form>
      <p className="pf-auth-note">Use the email Westrom Group has for you. We send a 6-digit code; there is no password to remember.</p>
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

type CatalogEntry = { id: string; name: string; homes: number; cities: string[]; photos?: number };

function StaffPicker({ who, onSignOut }: { who: { name: string; role?: string }; onSignOut: () => void }) {
  const navigate = useNavigate();
  const [cat, setCat] = useState<{ state: string; portfolios: CatalogEntry[]; fetchedAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  // For a demo: owners whose homes have their real picture in Rentvine come first, and only they show by default.
  const [pictured, setPictured] = useState(true);
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
  const withPhotos = (cat?.portfolios ?? []).filter((p) => (p.photos ?? 0) > 0).length;
  const shown = (cat?.portfolios ?? [])
    .filter((p) => !pictured || (p.photos ?? 0) > 0)
    .filter((p) => !q || `${p.name} ${p.cities.join(' ')}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.photos ?? 0) / b.homes - (a.photos ?? 0) / a.homes || (b.photos ?? 0) - (a.photos ?? 0) || a.name.localeCompare(b.name));
  return (
    <Frame label="Owner portfolio" who={who} menu={[{ label: 'Sign out', onClick: onSignOut }]} watchKey={String(cat?.portfolios.length)}>
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
              <div className="pf-filter" role="group" aria-label="Which portfolios">
                <button type="button" aria-pressed={pictured} onClick={() => setPictured(true)}>With pictures in Rentvine · {withPhotos}</button>
                <button type="button" aria-pressed={!pictured} onClick={() => setPictured(false)}>All · {cat.portfolios.length}</button>
              </div>
              <ul className="pf-list">
                {shown.slice(0, 60).map((p) => (
                  <li key={p.id}>
                    <a href={`/portfolio/${p.id}`} onClick={(e) => { e.preventDefault(); navigate(`/portfolio/${p.id}`); }}>
                      <span className="pf-list-name">{p.name}</span>
                      <span className="pf-muted">{p.homes} {p.homes === 1 ? 'home' : 'homes'}{p.photos ? ` · ${p.photos === p.homes ? (p.homes === 1 ? 'with its picture' : 'all with pictures') : `${p.photos} with pictures`}` : ''}{p.cities.length ? ` · ${p.cities.join(', ')}` : ''}</span>
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
    </Frame>
  );
}

/* ── One portfolio ───────────────────────────────────── */

type PortfolioAnswer = {
  state: 'building' | 'refreshing' | 'ready' | 'error'; error?: string | null; role: Role; permissions: Permission[];
  fetchedAt?: string; notes?: string[]; portfolio?: Portfolio; preview?: 'owner' | 'accountant' | null;
};

function PortfolioPage({ id, me, who, onSignOut }: { id: string; me: Me; who: { name: string; role?: string }; onSignOut: () => void }) {
  const navigate = useNavigate();
  const [answer, setAnswer] = useState<PortfolioAnswer | null>(null);
  const [error, setError] = useState<{ status: number; text: string } | null>(null);
  const [open, setOpen] = useState<Home | null>(null);
  const [tick, setTick] = useState(0);
  const [preview, setPreview] = useState<'owner' | null>(null);
  // The owner view hides contacts, so keep the first owner's name from the staff view for the greeting.
  const [ownerFirst, setOwnerFirst] = useState('');
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    const load = async () => {
      const r = await call<PortfolioAnswer>(`/portfolios/${id}${preview ? `?as=${preview}` : ''}`);
      if (stop) return;
      if (!r.ok) { setError({ status: r.status, text: r.error }); return; }
      setAnswer(r.data);
      if (r.data.state === 'building' || r.data.state === 'refreshing') timer = window.setTimeout(load, 2500);
    };
    void load();
    return () => { stop = true; window.clearTimeout(timer); };
  }, [id, tick, preview]);

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
    menu.push(preview
      ? { label: 'Back to the staff view', onClick: () => { setPreview(null); window.scrollTo({ top: 0 }); }, quiet: true }
      : { label: 'See it as the owner sees it', onClick: () => { setOwnerFirst(p?.contacts?.[0]?.name.split(' ')[0] ?? ''); setPreview('owner'); window.scrollTo({ top: 0 }); }, quiet: true });
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
    <Frame label={p.stage === 'prospect' ? 'Proposal' : 'Owner portfolio'} who={{ name: who.name, role: answer.preview ? `Seeing it as the ${answer.preview}` : ROLE_LABEL[role] }} menu={menu}
      footnote={`${p.name} · read from Rentvine ${answer.fetchedAt ? fmtDate(answer.fetchedAt.slice(0, 10), { month: 'short', day: 'numeric' }) : ''}`} watchKey={`${id}:${answer.fetchedAt}:${answer.preview}`}>
      {staff && (
        <button className="pf-preview-toggle" onClick={() => { if (!answer.preview) setOwnerFirst(p.contacts?.[0]?.name.split(' ')[0] ?? ''); setPreview(answer.preview ? null : 'owner'); window.scrollTo({ top: 0 }); }}>
          {answer.preview ? 'Owner view · back to staff view' : 'See it as the owner sees it'}
        </button>
      )}
      <Hero portfolio={p} firstName={answer.preview ? (ownerFirst || p.shortName) : firstName} perms={perms} role={role} />
      <Manifesto portfolio={p} perms={perms} />
      {perms.has('homes:view') && p.homes.length > 0 && <Homes portfolio={p} perms={perms} onOpen={setOpen} />}
      {perms.has('money:view') && p.ledger.length > 0 && <Money portfolio={p} perms={perms} />}
      {p.care && (perms.has('money:view') || perms.has('homes:view')) && <CareChapter portfolio={p} />}
      {perms.has('feed:view') && p.feed.length > 0 && <Updates portfolio={p} />}
      {perms.has('alerts:view') && p.keyDates.length > 0 && <Ahead portfolio={p} />}
      {perms.has('documents:view') && p.documents.length > 0 && <Papers portfolio={p} />}
      {perms.has('members:view') && <RealAccess portfolio={p} role={role} perms={perms} />}
      {staff && answer.notes && answer.notes.length > 0 && (
        <section className="pf-chapter pf-notes" data-tone="paper"><div className="pf-chapter-in"><p className="pf-kicker">Staff only · what Rentvine did not send</p><ul>{answer.notes.map((n) => <li key={n}>{n}</li>)}</ul></div></section>
      )}
      <Footer portfolio={p} />
      {open && <HomeDrawer home={p.homes.find((h) => h.id === open.id) ?? open} portfolio={p} perms={perms} onClose={close}
        photoTools={staff && !answer.preview ? {
          add: async (file) => {
            if (file.size > 8 * 1024 * 1024) return 'That picture is too large. Please use one under 8 MB.';
            try {
              const res = await fetch(`/api/portal/portfolios/${id}/photo/${encodeURIComponent(open.id)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
              if (!res.ok) return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'The picture did not save. Please try again.';
            } catch { return 'You seem to be offline. Check the connection and try again.'; }
            setTick((t) => t + 1);
            return null;
          },
          remove: async () => { await call(`/portfolios/${id}/photo/${encodeURIComponent(open.id)}/remove`, {}); setTick((t) => t + 1); },
        } : undefined} />}
    </Frame>
  );
}

/* ── People and invites ──────────────────────────────── */

function AddPerson({ portfolioId, roles, onAdded }: { portfolioId: string; roles: Role[]; onAdded: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setError(null); setDone(null);
    const r = await call(`/portfolios/${portfolioId}/members/add`, { email: f.get('email'), role: f.get('role') });
    if (!r.ok) { setError(r.error); return; }
    setDone(String(f.get('email')));
    form.reset();
    onAdded();
  };
  return (
    <form className="pf-invite" onSubmit={submit}>
      <div className="pf-invite-row">
        <Field id="add-email" name="email" label="Their email" type="email" required />
        <label className="pf-field" htmlFor="add-role">
          <span>Access</span>
          <select id="add-role" name="role" className="pf-input" defaultValue={roles[0]}>
            {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </label>
        <button className="pf-btn">Add</button>
      </div>
      {error && <p className="pf-alert" role="alert">{error}</p>}
      {done && <p className="pf-linkbox">Added. <b>{done}</b> can now sign in at wgcassetguide.com/portfolio with that email; they get a code by email.</p>}
    </form>
  );
}

function RealAccess({ portfolio, role, perms }: { portfolio: Portfolio; role: Role; perms: ReadonlySet<Permission> }) {
  type People = { owners: { name: string; share: number | null; onFile: boolean; email: string | null }[]; members: { email: string; name: string; role: Role }[] };
  const [data, setData] = useState<People | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => { void call<People>(`/portfolios/${portfolio.id}/members`).then((r) => r.ok && setData(r.data)); }, [portfolio.id, tick]);
  const manage = perms.has('members:manage');
  const roles: Role[] = role === 'staff' ? ['accountant', 'owner', 'prospect'] : ['accountant', 'owner'];
  const remove = async (email: string) => { await call(`/portfolios/${portfolio.id}/members/remove`, { email }); setTick((t) => t + 1); };
  return (
    <section id="access" data-tone="paper" className="pf-chapter">
      <Reveal className="pf-chapter-in">
        <p className="pf-kicker">Access</p>
        <h2 className="pf-title">Who sees <em>this portfolio.</em></h2>
        <p className="pf-lede">Owners sign in with the email Westrom Group has on file for them. Add your accountant and they see the money and the papers, never the tenants.</p>
        <div className="pf-access">
          <ul className="pf-members">
            {(data?.owners ?? []).map((o) => (
              <li key={o.name}>
                <b>{o.name}{o.share != null && <span className="pf-muted"> · {o.share}%</span>}</b>
                <span>Owner{role === 'staff' ? ` · ${o.email ?? 'no email in Rentvine, so no sign-in yet'}` : o.onFile ? '' : ' · ask Westrom Group to add your email'}</span>
              </li>
            ))}
            {(data?.members ?? []).map((m) => (
              <li key={m.email}>
                <b>{m.email}</b><span>{ROLE_LABEL[m.role]}, added here</span>
                {manage && <button className="pf-link pf-remove" onClick={() => remove(m.email)}><UserMinus aria-hidden /> Remove</button>}
              </li>
            ))}
            <li><b>Your Westrom Group team</b><span>Staff</span></li>
          </ul>
          <div>{manage && <AddPerson portfolioId={portfolio.id} roles={roles} onAdded={() => setTick((t) => t + 1)} />}</div>
        </div>
      </Reveal>
    </section>
  );
}
