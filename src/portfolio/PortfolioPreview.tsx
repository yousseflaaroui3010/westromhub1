import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import './portfolio.css';
import { ROLE_LABEL, permissionsFor, roleIn, visiblePortfolios } from './access';
import { MEMBERSHIPS, PERSONAS, PORTFOLIOS, portfolioById, type Home } from './data';
import {
  Access, Ahead, Footer, Hero, HomeDrawer, Homes, Manifesto, Money, Papers, ProspectCta, ProspectHome, ProspectManifesto, SixThings, Updates,
} from './sections';
import { PlatLines } from './PlatLines';

const ALL_IDS = PORTFOLIOS.map((p) => p.id);

/**
 * MOCKUP of the owner portfolio page: invented data, and the "View as" dock
 * stands in for signing in. Access comes from access.ts exactly as the server
 * will decide it; in this mockup it only runs in the browser.
 */
export default function PortfolioPreview() {
  const [params, setParams] = useSearchParams();
  const persona = PERSONAS.find((p) => p.key === params.get('as')) ?? PERSONAS[0];
  const session = persona.session;
  const mine = visiblePortfolios(session, MEMBERSHIPS, ALL_IDS);
  const portfolioId = params.get('p') ?? mine[0];
  const role = roleIn(session, portfolioId, MEMBERSHIPS);
  const portfolio = role ? portfolioById(portfolioId) : null;
  const perms = permissionsFor(session, portfolioId, MEMBERSHIPS);
  const [open, setOpen] = useState<Home | null>(null);
  const [menu, setMenu] = useState(false);
  const close = useCallback(() => setOpen(null), []);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = portfolio ? `${portfolio.name} · Westrom` : 'Owner portfolio · Westrom';
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.content = 'noindex, nofollow';
    document.documentElement.classList.add('pf-html');
    return () => document.documentElement.classList.remove('pf-html');
  }, [portfolio]);

  // The whole page turns navy while a navy chapter holds the middle of the screen.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) el.dataset.tone = (e.target as HTMLElement).dataset.tone ?? 'paper'; });
    }, { rootMargin: '-50% 0px -50% 0px' });
    el.querySelectorAll('[data-tone]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [portfolioId, persona.key]);

  const go = (next: { as?: string; p?: string | null }) => {
    const q = new URLSearchParams(params);
    if (next.as !== undefined) { q.set('as', next.as); q.delete('p'); }
    if (next.p === null) q.delete('p'); else if (next.p) q.set('p', next.p);
    setParams(q, { replace: true });
    setOpen(null);
    setMenu(false);
    window.scrollTo({ top: 0 });
  };

  const notMine = ALL_IDS.find((id) => !mine.includes(id));
  const firstName = session.name.split(' ')[0];
  const prospect = portfolio?.stage === 'prospect';

  const chapters: { id: string; label: string }[] = !portfolio ? [] : prospect
    ? [{ id: 'homes', label: 'Your home' }, { id: 'why', label: 'Working with us' }, ...(perms.has('documents:view') ? [{ id: 'papers', label: 'Papers' }] : [])]
    : ([
        ['homes:view', 'homes', 'Homes'], ['money:view', 'money', 'Money'], ['feed:view', 'updates', 'This week'],
        ['alerts:view', 'ahead', 'Ahead'], ['documents:view', 'papers', 'Papers'], ['members:view', 'access', 'Access'],
      ] as const).filter(([perm]) => perms.has(perm)).map(([, id, label]) => ({ id, label }));

  return (
    <div className="pf-root" ref={root} data-tone="paper">
      <PlatLines />

      <header className="pf-bar">
        <a href="#top" className="pf-wordmark" aria-label="Westrom, top of page"><span>Westrom</span><b>{prospect ? 'Proposal' : 'Portfolio'}</b></a>
        <div className="pf-bar-right">
          <span className="pf-bar-me">{session.name}<small>{role ? ROLE_LABEL[role] : 'No access'}</small></span>
          {portfolio && <button className="pf-menu-btn" aria-expanded={menu} aria-controls="pf-menu" onClick={() => setMenu((m) => !m)}><span /><span /><b className="pf-sr">Menu</b></button>}
        </div>
      </header>

      {menu && portfolio && (
        <nav className="pf-menu" id="pf-menu" aria-label="Sections">
          <ol>{chapters.map((c, i) => <li key={c.id} style={{ ['--i' as string]: i }}><a href={`#${c.id}`} onClick={() => setMenu(false)}>{c.label}</a></li>)}</ol>
          <p className="pf-muted">{portfolio.name}</p>
        </nav>
      )}

      {!portfolio ? (
        <Denied name={portfolioById(portfolioId)?.name ?? 'This portfolio'} onBack={() => go({ p: null })} />
      ) : (
        <>
          <Hero portfolio={portfolio} firstName={firstName} perms={perms} role={role!} />
          {prospect ? (
            <>
              <ProspectManifesto portfolio={portfolio} />
              <ProspectHome portfolio={portfolio} perms={perms} onOpen={setOpen} />
              <SixThings />
              {perms.has('documents:view') && <Papers portfolio={portfolio} />}
              <ProspectCta portfolio={portfolio} />
            </>
          ) : (
            <>
              <Manifesto portfolio={portfolio} perms={perms} />
              {perms.has('homes:view') && <Homes portfolio={portfolio} perms={perms} onOpen={setOpen} />}
              {perms.has('money:view') && <Money portfolio={portfolio} perms={perms} />}
              {perms.has('feed:view') && <Updates portfolio={portfolio} />}
              {perms.has('alerts:view') && <Ahead portfolio={portfolio} />}
              {perms.has('documents:view') && <Papers portfolio={portfolio} />}
              {perms.has('members:view') && <Access portfolio={portfolio} members={MEMBERSHIPS} perms={perms} role={role!} />}
            </>
          )}
          <Footer portfolio={portfolio} />
        </>
      )}

      {open && portfolio && <HomeDrawer home={open} portfolio={portfolio} perms={perms} onClose={close} />}

      <aside className="pf-dock" aria-label="Mockup controls">
        <span className="pf-dock-tag">Mockup<span className="pf-hide-sm"> · invented data · view as</span></span>
        <div className="pf-dock-people" role="radiogroup" aria-label="View as">
          {PERSONAS.map((p) => (
            <button key={p.key} role="radio" aria-checked={p.key === persona.key} className={p.key === persona.key ? 'is-on' : ''} onClick={() => go({ as: p.key })} title={p.blurb}>
              {p.session.name.split(' ')[0]}
            </button>
          ))}
        </div>
        {session.staff ? (
          <select className="pf-dock-select" value={portfolioId} onChange={(e) => go({ p: e.target.value })} aria-label="Portfolio">
            {ALL_IDS.map((id) => <option key={id} value={id}>{portfolioById(id)!.name}</option>)}
          </select>
        ) : notMine && portfolio ? (
          <button className="pf-dock-try" onClick={() => go({ p: notMine })}><Lock aria-hidden /> Open {portfolioById(notMine)!.shortName}’s</button>
        ) : null}
      </aside>
    </div>
  );
}

function Denied({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <section className="pf-denied" data-tone="paper">
      <p className="pf-kicker">403 · Not your portfolio</p>
      <h1 className="pf-title">{name} <em>is private.</em></h1>
      <p className="pf-lede">You can only open portfolios you are on. On the live site the server refuses this before a single figure leaves Westrom, and the attempt goes in the access log.</p>
      <button className="pf-btn is-red" onClick={onBack}><ShieldCheck aria-hidden /> Back to my portfolio</button>
    </section>
  );
}
