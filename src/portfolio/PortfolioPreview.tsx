import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './portfolio.css';
import { ROLE_LABEL, permissionsFor, roleIn, visiblePortfolios } from './access';
import { MEMBERSHIPS, PERSONAS, PORTFOLIOS, portfolioById, type Home } from './data';
import {
  Contact, Documents, Hero, HomeDrawer, Homes, KeyDates, Market, Money, People, ProspectCta, ProspectIntro, Updates,
} from './sections';

const ALL_IDS = PORTFOLIOS.map((p) => p.id);

/**
 * MOCKUP of the owner portfolio page. Invented data, and the "View as" dock
 * stands in for signing in. Access is decided by access.ts exactly as the
 * server will decide it; here it only runs in the browser.
 */
export default function PortfolioPreview() {
  const [params, setParams] = useSearchParams();
  const persona = PERSONAS.find((p) => p.key === params.get('as')) ?? PERSONAS[0];
  const session = persona.session;
  const mine = visiblePortfolios(session, MEMBERSHIPS, ALL_IDS);
  const asked = params.get('p');
  const portfolioId = asked ?? mine[0];
  const role = roleIn(session, portfolioId, MEMBERSHIPS);
  const portfolio = role ? portfolioById(portfolioId) : null;
  const perms = permissionsFor(session, portfolioId, MEMBERSHIPS);
  const [open, setOpen] = useState<Home | null>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    document.title = portfolio ? `${portfolio.name} · Westrom` : 'Owner portfolio · Westrom';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.content = 'noindex, nofollow';
    document.documentElement.classList.add('pf-html');
    return () => document.documentElement.classList.remove('pf-html');
  }, [portfolio]);

  const go = (next: { as?: string; p?: string | null }) => {
    const q = new URLSearchParams(params);
    if (next.as !== undefined) { q.set('as', next.as); q.delete('p'); }
    if (next.p === null) q.delete('p'); else if (next.p) q.set('p', next.p);
    setParams(q, { replace: true });
    setOpen(null);
    window.scrollTo({ top: 0 });
  };

  const notMine = ALL_IDS.find((id) => !mine.includes(id));
  const firstName = session.name.split(' ')[0];

  // Sections in page order, each shown only when the role holds its permission.
  const sections: { id: string; label: string }[] = !portfolio ? [] : portfolio.stage === 'prospect'
    ? [{ id: 'homes', label: 'Your home' }, { id: 'why', label: 'Why us' }, ...(perms.has('documents:view') ? [{ id: 'documents', label: 'Documents' }] : [])]
    : ([
        ['homes:view', 'homes', 'Homes'], ['money:view', 'money', 'Money'], ['feed:view', 'updates', 'Updates'],
        ['alerts:view', 'dates', 'Dates'], ['market:view', 'market', 'Market'], ['documents:view', 'documents', 'Documents'],
        ['members:view', 'people', 'Access'],
      ] as const).filter(([perm]) => perms.has(perm)).map(([, id, label]) => ({ id, label }));
  const idx = (id: string) => sections.findIndex((x) => x.id === id) + 1;

  return (
    <div className="pf-root">
      <nav className="pf-nav" aria-label="Portfolio">
        <a href="#top" className="pf-brand"><span className="pf-brand-mark">W</span><span>WESTROM</span></a>
        {portfolio && <NavLinks items={sections} />}
        <div className="pf-nav-me">
          <span className="pf-avatar">{firstName[0]}</span>
          <span className="pf-nav-me-text"><b>{session.name}</b><small>{role ? ROLE_LABEL[role] : 'No access'}</small></span>
        </div>
      </nav>

      {!portfolio ? (
        <Denied name={portfolioById(portfolioId)?.name ?? 'This portfolio'} onBack={() => go({ p: null })} />
      ) : (
        <>
          <Hero portfolio={portfolio} firstName={firstName} perms={perms} role={role!} />
          <main className="pf-main">
            {portfolio.stage === 'prospect' ? (
              <>
                <ProspectIntro portfolio={portfolio} index={idx('homes')} />
                {perms.has('documents:view') && <Documents portfolio={portfolio} index={idx('documents')} />}
                <ProspectCta portfolio={portfolio} />
              </>
            ) : (
              <>
                {perms.has('homes:view') && <Homes portfolio={portfolio} perms={perms} index={idx('homes')} onOpen={setOpen} />}
                {perms.has('money:view') && <Money portfolio={portfolio} perms={perms} index={idx('money')} />}
                {perms.has('feed:view') && <Updates portfolio={portfolio} index={idx('updates')} />}
                {perms.has('alerts:view') && <KeyDates portfolio={portfolio} index={idx('dates')} />}
                {perms.has('market:view') && <Market portfolio={portfolio} index={idx('market')} />}
                {perms.has('documents:view') && <Documents portfolio={portfolio} index={idx('documents')} />}
                {perms.has('members:view') && <People portfolio={portfolio} members={MEMBERSHIPS} perms={perms} role={role!} index={idx('people')} />}
              </>
            )}
          </main>
          <Contact portfolio={portfolio} />
        </>
      )}

      {open && portfolio && <HomeDrawer home={open} portfolio={portfolio} perms={perms} onClose={close} />}

      <aside className="pf-dock" aria-label="Mockup controls">
        <span className="pf-dock-tag">Mockup · invented data</span>
        <span className="pf-dock-label">View as</span>
        <div className="pf-dock-personas" role="radiogroup" aria-label="View as">
          {PERSONAS.map((p) => (
            <button key={p.key} role="radio" aria-checked={p.key === persona.key} className={p.key === persona.key ? 'is-on' : ''} onClick={() => go({ as: p.key })} title={p.blurb}>
              <b>{p.session.name.split(' ')[0]}</b><small>{p.blurb}</small>
            </button>
          ))}
        </div>
        {session.staff ? (
          <select className="pf-dock-select" value={portfolioId} onChange={(e) => go({ p: e.target.value })} aria-label="Portfolio">
            {ALL_IDS.map((id) => <option key={id} value={id}>{portfolioById(id)!.name}</option>)}
          </select>
        ) : notMine && portfolio ? (
          <button className="pf-dock-try" onClick={() => go({ p: notMine })}><Lock aria-hidden /> Try {portfolioById(notMine)!.shortName}’s<span className="pf-hide-sm">portfolio</span></button>
        ) : null}
      </aside>
    </div>
  );
}

/** Renders the section links into the top bar once the visible sections are known. */
function NavLinks({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const ids = items.map((i) => i.id).join(',');
  useEffect(() => {
    const els = ids.split(',').map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.5] });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [ids]);
  return (
    <div className="pf-nav-links">
      {items.map((i) => <a key={i.id} href={`#${i.id}`} className={active === i.id ? 'is-on' : ''}>{i.label}</a>)}
    </div>
  );
}

function Denied({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <section className="pf-denied">
      <ShieldAlert className="pf-denied-icon" aria-hidden />
      <p className="pf-kicker"><b>403</b> / Not your portfolio</p>
      <h1 className="pf-h2">{name} is <em>private</em>.</h1>
      <p className="pf-lede">You can only open portfolios you are a member of. On the live site the server refuses this before a single number leaves Westrom, and the attempt is written to the access log.</p>
      <button className="pf-btn pf-btn-red" onClick={onBack}><ShieldCheck aria-hidden /> Back to my portfolio</button>
    </section>
  );
}
