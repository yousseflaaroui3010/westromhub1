import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { Frame } from './Frame';
import { ROLE_LABEL, permissionsFor, roleIn, visiblePortfolios } from './access';
import { MEMBERSHIPS, PERSONAS, PORTFOLIOS, portfolioById, type Home } from './data';
import {
  Access, Ahead, Footer, Hero, HomeDrawer, Homes, Manifesto, Money, Papers, ProspectCta, ProspectHome, ProspectManifesto, SixThings, Updates,
} from './sections';

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
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    document.title = portfolio ? `${portfolio.name} · Westrom Group` : 'Owner portfolio · Westrom Group';
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
  const prospect = portfolio?.stage === 'prospect';

  const chapters: { id: string; label: string }[] = !portfolio ? [] : prospect
    ? [{ id: 'homes', label: 'Your home' }, { id: 'why', label: 'Working with us' }, ...(perms.has('documents:view') ? [{ id: 'papers', label: 'Papers' }] : [])]
    : ([
        ['homes:view', 'homes', 'Homes'], ['money:view', 'money', 'Money'], ['feed:view', 'updates', 'This week'],
        ['alerts:view', 'ahead', 'Ahead'], ['documents:view', 'papers', 'Papers'], ['members:view', 'access', 'Access'],
      ] as const).filter(([perm]) => perms.has(perm)).map(([, id, label]) => ({ id, label }));

  return (
    <Frame
      label={prospect ? 'Proposal' : 'Owner portfolio'}
      who={{ name: session.name, role: role ? ROLE_LABEL[role] : 'No access' }}
      menu={portfolio ? chapters.map((c) => ({ label: c.label, href: `#${c.id}` })) : []}
      footnote={portfolio?.name}
      watchKey={`${portfolioId}:${persona.key}`}
    >
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
    </Frame>
  );
}

function Denied({ name, onBack }: { name: string; onBack: () => void }) {
  return (
    <section className="pf-denied" data-tone="paper">
      <p className="pf-kicker">403 · Not your portfolio</p>
      <h1 className="pf-title">{name} <em>is private.</em></h1>
      <p className="pf-lede">You can only open portfolios you are on. On the live site the server refuses this before a single figure leaves Westrom Group, and the attempt goes in the access log.</p>
      <button className="pf-btn is-red" onClick={onBack}><ShieldCheck aria-hidden /> Back to my portfolio</button>
    </section>
  );
}
