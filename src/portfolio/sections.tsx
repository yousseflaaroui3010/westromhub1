import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Download, Lock, Mail, Phone, X } from 'lucide-react';
import { ROLE_LABEL, ROLE_PERMISSIONS, tenantLabel, type Membership, type Permission, type Role } from './access';
import type { Home, Portfolio, Unit, UnitStatus } from './data';
import { BlobReveal, HouseArt, HouseBlueprint } from './HouseArt';
import { Reveal, daysFromToday, fmtDate, fmtMonth, leaseEndShort, money, reducedMotion } from './ui';

const dash = (n: number | null | undefined, f: (n: number) => string = String) => (n == null ? '—' : f(n));
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

type Perms = ReadonlySet<Permission>;

const STATUS: Record<UnitStatus, string> = { occupied: 'Leased', renewal: 'Renewal offered', vacant: 'For rent', 'make-ready': 'Getting ready' };
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const homeRent = (h: Home) => h.units.reduce((s, u) => s + u.rentCents, 0);

function factsFor(h: Home, perms: Perms) {
  const lease = h.units[0].lease;
  return {
    beds: h.beds, baths: h.baths, sqft: h.sqft, yearBuilt: h.yearBuilt,
    rent: perms.has('tenancy:view') || perms.has('market:view') ? money(homeRent(h)) : undefined,
    leaseEnd: perms.has('tenancy:view') && lease ? (lease.monthToMonth ? 'MONTH-TO-MONTH' : leaseEndShort(lease.end)) : undefined,
  };
}

function HomePicture({ home, perms, intro, label, className }: { home: Home; perms: Perms; intro?: boolean; label?: string; className?: string }) {
  return (
    <BlobReveal
      className={className}
      intro={intro}
      label={label}
      base={<HouseArt style={home.style} palette={home.palette} photo={home.photo} />}
      reveal={<HouseBlueprint style={home.style} facts={factsFor(home, perms)} />}
    />
  );
}

function Chapter({ kicker, title, children, id, tone = 'paper', className = '' }: {
  kicker: string; title?: ReactNode; children: ReactNode; id: string; tone?: 'paper' | 'navy'; className?: string;
}) {
  return (
    <section id={id} data-tone={tone} className={`pf-chapter ${className}`}>
      <Reveal className="pf-chapter-in">
        <p className="pf-kicker">{kicker}</p>
        {title && <h2 className="pf-title">{title}</h2>}
        {children}
      </Reveal>
    </section>
  );
}

/* ── Hero ─────────────────────────────────────────────── */

export function Hero({ portfolio, firstName, perms, role }: { portfolio: Portfolio; firstName: string; perms: Perms; role: Role }) {
  const featured = portfolio.homes[0];
  const prospect = portfolio.stage === 'prospect';
  const word = portfolio.shortName;
  const next = [...portfolio.keyDates].sort((a, b) => a.date.localeCompare(b.date))[0];
  const paidYear = portfolio.ledger.reduce((s, m) => s + m.paidCents, 0);
  return (
    <section className="pf-hero" data-tone="paper" id="top">
      <p className="pf-hero-eyebrow">
        {prospect ? 'Prepared for you by Westrom Group' : `${portfolio.name}${portfolio.since ? ` · with Westrom Group since ${portfolio.since}` : ''}`}
      </p>
      <h1 className="pf-hero-word" aria-label={prospect ? featured.address : portfolio.name} style={{ ['--len' as string]: word.length }}>
        {word.split('').map((ch, i) => <span key={i} style={{ ['--i' as string]: i }}>{ch === ' ' ? ' ' : ch}</span>)}
      </h1>
      <div className="pf-hero-arch">
        {perms.has('homes:view') ? (
          <HomePicture home={featured} perms={perms} intro className="pf-arch" label="Move over the house" />
        ) : (
          <div className="pf-arch pf-arch-ledger">
            <span className="pf-kicker">Paid out, last 12 months</span>
            <b>{money(paidYear)}</b>
            <span>Statements, ledger and tax papers. Your access covers the money, not the tenants.</span>
          </div>
        )}
      </div>
      <p className="pf-hero-greet"><em>{greeting()}, {firstName}.</em> <span>{ROLE_LABEL[role]}</span></p>
      {next && perms.has('alerts:view') && !prospect && (
        <a className="pf-hero-next" href="#ahead">
          <span className="pf-kicker">Next</span>
          <b>{next.title}</b>
          <span>{fmtDate(next.date, { month: 'long', day: 'numeric' })}</span>
          <small>{next.detail.split(':')[0]}</small>
        </a>
      )}
      <span className="pf-hero-scroll" aria-hidden>Scroll</span>
    </section>
  );
}

/* ── Manifesto: the whole portfolio in one sentence ───── */

function useScrollProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) { el.style.setProperty('--p', '1'); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const b = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.85 - b.top) / (b.height * 0.9)));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return ref;
}

type Piece = string | { em: string };

function Statement({ pieces }: { pieces: Piece[] }) {
  const ref = useScrollProgress<HTMLParagraphElement>();
  const words: { text: string; em: boolean }[] = [];
  pieces.forEach((pc) => {
    const em = typeof pc !== 'string';
    (em ? pc.em : pc).split(' ').filter(Boolean).forEach((text) => words.push({ text, em }));
  });
  return (
    <p ref={ref} className="pf-statement" style={{ ['--n' as string]: words.length }}>
      {words.map((w, i) => (
        <span key={i} className={w.em ? 'is-em' : ''} style={{ ['--w' as string]: i }}>{w.text} </span>
      ))}
    </p>
  );
}

export function Manifesto({ portfolio, perms }: { portfolio: Portfolio; perms: Perms }) {
  const doors = portfolio.homes.reduce((s, h) => s + h.units.length, 0);
  const counties = [...new Set(portfolio.homes.map((h) => h.county).filter(Boolean))];
  const cities = [...new Set(portfolio.homes.map((h) => h.city).filter(Boolean))];
  const rent = portfolio.homes.reduce((s, h) => s + homeRent(h), 0);
  const paid = portfolio.ledger.reduce((s, m) => s + m.paidCents, 0);
  const pieces: Piece[] = [
    `${NUM[portfolio.homes.length] ?? portfolio.homes.length} ${portfolio.homes.length === 1 ? 'home' : 'homes'}${doors !== portfolio.homes.length ? `, ${NUM[doors] ?? doors} doors,` : ''} across`,
    { em: counties.length === 1 ? `${counties[0]} County.` : counties.length > 1 ? `${counties.slice(0, 3).join(' & ')} counties.` : `${cities.slice(0, 3).join(' & ') || 'North Texas'}.` },
  ];
  if (perms.has('tenancy:view')) pieces.push({ em: money(rent) }, 'of rent every month.');
  if (perms.has('money:view') && portfolio.ledger.length) pieces.push('And', { em: money(paid) }, portfolio.ledger.length >= 12 ? 'paid to you this year.' : `paid to you in the last ${portfolio.ledger.length === 1 ? 'month' : `${portfolio.ledger.length} months`}.`);
  return (
    <section className="pf-manifesto" data-tone="navy" id="summary">
      <p className="pf-kicker">Your portfolio, in one sentence</p>
      <Statement pieces={pieces} />
    </section>
  );
}

export function ProspectManifesto({ portfolio }: { portfolio: Portfolio }) {
  const h = portfolio.homes[0];
  return (
    <section className="pf-manifesto" data-tone="navy" id="summary">
      <p className="pf-kicker">What we see</p>
      <Statement pieces={[
        `A ${h.beds != null ? `${NUM[h.beds] ?? h.beds}-bedroom ` : ''}home in`, { em: h.city }, 'that should lease for', { em: `${money(h.marketLowCents ?? 0)} to ${money(h.marketHighCents ?? 0)}` },
        'a month, in about', { em: 'three weeks.' },
      ]} />
    </section>
  );
}

/* ── Homes ───────────────────────────────────────────── */

function homeLine(h: Home, perms: Perms) {
  if (!perms.has('tenancy:view')) return [h.beds != null && `${h.beds} bedrooms`, h.sqft != null && `${h.sqft.toLocaleString()} sq ft`].filter(Boolean).join(' · ');
  const u = h.units.find((x) => x.lease) ?? h.units[0];
  if (h.units.length > 1) return h.units.map((x) => `${x.label} ${STATUS[x.status].toLowerCase()}`).join(' · ');
  if (u.lease) return u.lease.monthToMonth ? `Leased month to month · ${money(u.rentCents)}` : `Leased to ${tenantLabel(u.lease.tenants[0], perms)} until ${fmtDate(u.lease.end, { month: 'long', year: 'numeric' })}`;
  if (u.listing) return `For rent at ${money(u.listing.askingCents)} · ${u.listing.showings} showings so far`;
  return STATUS[u.status];
}

export function Homes({ portfolio, perms, onOpen }: { portfolio: Portfolio; perms: Perms; onOpen: (h: Home) => void }) {
  return (
    <Chapter id="homes" kicker="The homes" title={<>Every door, <em>in plain sight.</em></>}>
      <div className="pf-gallery">
        {portfolio.homes.map((h, i) => (
          <figure key={h.id} className={`pf-plate is-${i % 4}`}>
            <figcaption className="pf-plate-cap">{h.city}{h.yearBuilt ? `, ${h.yearBuilt}` : ''}</figcaption>
            <button className="pf-plate-btn" onClick={() => onOpen(h)} aria-label={`Open ${h.address}`}>
              <HomePicture home={h} perms={perms} className="pf-plate-pic" />
            </button>
            <h3 className="pf-plate-title">{h.address}</h3>
            <p className="pf-plate-line">{homeLine(h, perms)}</p>
            <button className="pf-link" onClick={() => onOpen(h)}>Open <ArrowUpRight aria-hidden /></button>
          </figure>
        ))}
      </div>
    </Chapter>
  );
}

function Payments({ unit }: { unit: Unit }) {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  return (
    <div className="pf-pay" aria-label="Rent, last six months">
      {unit.payments.map((p, i) => <span key={i} className={`is-${p}`} title={`${months[i]}: ${p === 'paid' ? 'on time' : p === 'late' ? 'late' : 'no lease'}`}><i />{months[i]}</span>)}
    </div>
  );
}

function MarketLine({ home }: { home: Home }) {
  const rent = home.units[0].rentCents;
  const low = home.marketLowCents ?? 0, high = home.marketHighCents ?? 0;
  const lo = low * 0.88, hi = high * 1.12;
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="pf-market">
      <div className="pf-market-track">
        <span className="pf-market-band" style={{ left: at(low), right: `calc(100% - ${at(high)})` }} />
        <span className="pf-market-pin" style={{ left: at(rent) }} />
      </div>
      <p><span>{money(low)}</span><b>{money(rent)} today</b><span>{money(high)}</span></p>
    </div>
  );
}

export function HomeDrawer({ home, portfolio, perms, onClose }: { home: Home; portfolio: Portfolio; perms: Perms; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [onClose]);
  const docs = portfolio.documents.filter((d) => d.home === home.address);
  return (
    <div className="pf-drawer-wrap" role="dialog" aria-modal="true" aria-label={home.address} onClick={onClose}>
      <aside className="pf-drawer" onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} className="pf-close" onClick={onClose} aria-label="Close"><X /></button>
        <HomePicture home={home} perms={perms} className="pf-drawer-pic" label="Move over the picture" />
        <div className="pf-drawer-body">
          <p className="pf-kicker">{home.city}, Texas · {home.county} County</p>
          <h3 className="pf-drawer-title">{home.address}</h3>
          <dl className="pf-facts">
            <div><dt>Bedrooms</dt><dd>{dash(home.beds)}</dd></div>
            <div><dt>Baths</dt><dd>{dash(home.baths)}</dd></div>
            <div><dt>Square feet</dt><dd>{dash(home.sqft, (n) => n.toLocaleString())}</dd></div>
            <div><dt>Built</dt><dd>{dash(home.yearBuilt)}</dd></div>
          </dl>
          {home.hoa && <p className="pf-note">In {home.hoa}.</p>}
          {home.yearBuilt != null && home.yearBuilt < 1978 && <p className="pf-note">Built before 1978, so the lead-based paint addendum applies.</p>}

          {perms.has('tenancy:view') && home.units.map((u, i) => (
            <div key={i} className="pf-block">
              <h4>{u.label ?? 'The lease'} <span>{STATUS[u.status]}</span></h4>
              {u.lease ? (
                <>
                  <p>{u.lease.tenants.map((t) => tenantLabel(t, perms)).join(' and ')} · {money(u.rentCents)} a month · deposit {money(u.lease.depositCents)}</p>
                  <p className="pf-muted">{u.lease.monthToMonth ? `Month to month since ${fmtDate(u.lease.end, { month: 'long', year: 'numeric' })}` : `${fmtDate(u.lease.start)} to ${fmtDate(u.lease.end)} · ${daysFromToday(u.lease.end)} days left`}</p>
                </>
              ) : u.listing && perms.has('showings:view') ? (
                <>
                  <p>Listed {u.listing.daysOnMarket} days at {money(u.listing.askingCents)}: {u.listing.showings} showings, {u.listing.applications} applications.</p>
                  <blockquote>“{u.listing.feedback}”</blockquote>
                </>
              ) : <p className="pf-muted">No lease yet.</p>}
              {u.payments.length > 0 && <Payments unit={u} />}
            </div>
          ))}

          {perms.has('market:view') && home.marketLowCents != null && (
            <div className="pf-block"><h4>Rent against the market</h4><MarketLine home={home} /></div>
          )}

          {perms.has('feed:view') && home.workOrders.length > 0 && (
            <div className="pf-block">
              <h4>Repairs and visits</h4>
              <ul className="pf-rows">{home.workOrders.map((w, i) => (
                <li key={i}><span>{w.title}</span><span className="pf-muted">{w.state === 'done' ? 'Done' : w.state === 'open' ? 'In progress' : 'Booked'} · {fmtDate(w.date, { month: 'short', day: 'numeric' })}</span><b>{w.costCents ? money(w.costCents) : '—'}</b></li>
              ))}</ul>
            </div>
          )}

          {perms.has('documents:view') && docs.length > 0 && (
            <div className="pf-block">
              <h4>Papers for this home</h4>
              <ul className="pf-rows">{docs.map((d) => <li key={d.name}><span>{d.name}</span><span className="pf-muted">{fmtDate(d.date)}</span><ArrowUpRight aria-hidden /></li>)}</ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ── Money ───────────────────────────────────────────── */

export function Money({ portfolio, perms }: { portfolio: Portfolio; perms: Perms }) {
  const rows = portfolio.ledger;
  const [sel, setSel] = useState(Math.max(0, rows.length - (portfolio.real ? 1 : 2)));
  const m = rows[sel];
  const max = Math.max(...rows.map((r) => r.paidCents));
  const min = Math.min(...rows.map((r) => r.paidCents));
  return (
    <Chapter id="money" kicker="The money" title={<>From rent collected <em>to your account.</em></>}>
      <div className="pf-money">
        <div className="pf-money-figure" key={m.month}>
          <p className="pf-kicker">Paid to you · {fmtMonth(m.month, true)}</p>
          <b className="pf-money-big">{money(m.paidCents)}</b>
          <p className="pf-money-math">
            <span>{money(m.rentCents)} collected</span>
            {m.expensesCents != null
              ? <span>− {money(m.expensesCents)} fees, repairs and bills</span>
              : <><span>− {money(m.feesCents)} management, 10%</span><span>− {money(m.repairsCents)} repairs</span></>}
          </p>
        </div>
        <div className="pf-months" role="tablist" aria-label="Month">
          {rows.map((r, i) => (
            <button key={r.month} role="tab" aria-selected={i === sel} className={i === sel ? 'is-on' : ''} onClick={() => setSel(i)}>
              <i style={{ height: `${28 + ((r.paidCents - min) / Math.max(1, max - min)) * 72}%` }} />
              <span>{fmtMonth(r.month).slice(0, 3)}</span>
            </button>
          ))}
        </div>
        <div className="pf-statements">
          <p className="pf-kicker">Owner statements</p>
          <ul className="pf-rows">
            {portfolio.statements.slice(0, 4).map((s) => (
              <li key={s.id}>
                <span>{fmtMonth(s.period, true)}</span>
                <b>{money(s.paidCents)}</b>
                {s.href
                  ? <a className="pf-icon" href={s.href} download aria-label={`Download ${fmtMonth(s.period, true)} statement`}><Download /></a>
                  : <button className="pf-icon" disabled={!perms.has('statements:download')} aria-label={`Download ${fmtMonth(s.period, true)} statement`}>
                      {perms.has('statements:download') ? <Download /> : <Lock />}
                    </button>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Chapter>
  );
}

/* ── Updates ─────────────────────────────────────────── */

export function Updates({ portfolio }: { portfolio: Portfolio }) {
  const [latest, ...rest] = portfolio.feed;
  return (
    <Chapter id="updates" kicker="This week" title={null}>
      <div className="pf-update">
        <p className="pf-update-date">{fmtDate(latest.date, { weekday: 'long', month: 'long', day: 'numeric' })}{latest.isNew && <span>New</span>}</p>
        <p className="pf-update-text">{latest.body}</p>
      </div>
      <ul className="pf-earlier">
        {rest.map((f, i) => (
          <li key={i}>
            <span className="pf-muted">{fmtDate(f.date, { month: 'short', day: 'numeric' })}</span>
            <b>{f.title}</b>
            <span>{f.body}</span>
          </li>
        ))}
      </ul>
    </Chapter>
  );
}

/* ── Ahead ───────────────────────────────────────────── */

export function Ahead({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Chapter id="ahead" kicker="Ahead" title={<>Dates that <em>cost money</em> when missed.</>}>
      <ol className="pf-ahead">
        {portfolio.keyDates.map((d, i) => {
          const body = (
            <>
              <b className="pf-ahead-days">{daysFromToday(d.date)}<small>days</small></b>
              <span className="pf-ahead-title">{d.title}</span>
              <span className="pf-muted">{fmtDate(d.date, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="pf-muted">{d.detail}</span>
            </>
          );
          return <li key={i}>{d.href ? <a href={d.href}>{body}<ArrowUpRight className="pf-ahead-go" aria-hidden /></a> : <div>{body}</div>}</li>;
        })}
      </ol>
    </Chapter>
  );
}

/* ── Papers ──────────────────────────────────────────── */

export function Papers({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Chapter id="papers" kicker="Papers" title={<>Every signature, <em>findable.</em></>}>
      <ul className="pf-papers">
        {portfolio.documents.map((d) => (
          <li key={d.href ?? d.name}>
            {(() => {
              const inner = (
                <>
                  <span className="pf-papers-name">{d.name}</span>
                  <span className="pf-muted">{d.home ?? 'Whole portfolio'}{d.date ? ` · ${fmtDate(d.date, { month: 'short', year: 'numeric' })}` : ''}</span>
                  {d.href ? <Download aria-hidden /> : <ArrowUpRight aria-hidden />}
                </>
              );
              return d.href ? <a href={d.href} download>{inner}</a> : <button>{inner}</button>;
            })()}
          </li>
        ))}
      </ul>
    </Chapter>
  );
}

/* ── Access ──────────────────────────────────────────── */

const MATRIX: { perm: Permission; label: string }[] = [
  { perm: 'homes:view', label: 'Homes and photos' },
  { perm: 'tenancy:view', label: 'Leases and rent status' },
  { perm: 'tenancy:names', label: 'Tenants’ full names' },
  { perm: 'money:view', label: 'Ledger and payouts' },
  { perm: 'statements:download', label: 'Download statements' },
  { perm: 'documents:view', label: 'Papers' },
  { perm: 'feed:view', label: 'Weekly updates and repairs' },
  { perm: 'showings:view', label: 'Showings and applications' },
  { perm: 'members:manage', label: 'Invite or remove people' },
  { perm: 'portfolio:any', label: 'Open other portfolios' },
];
const ROLES: Role[] = ['owner', 'accountant', 'prospect', 'staff'];

export function Access({ portfolio, members, perms, role }: { portfolio: Portfolio; members: Membership[]; perms: Perms; role: Role }) {
  const mine = members.filter((m) => m.portfolioId === portfolio.id);
  return (
    <Chapter id="access" kicker="Access" title={<>Who sees <em>what.</em></>}>
      <p className="pf-lede">Co-owners share one portfolio. An accountant sees the money and the papers, never the tenants. Nobody opens a portfolio they are not on.</p>
      <div className="pf-access">
        <ul className="pf-members">
          {mine.map((m) => <li key={m.email}><b>{m.email}</b><span>{ROLE_LABEL[m.role]}</span></li>)}
          <li><b>Your Westrom Group team</b><span>Staff</span></li>
          <li><button className="pf-btn" disabled={!perms.has('members:manage')}>{perms.has('members:manage') ? <><Mail aria-hidden /> Invite your accountant</> : <><Lock aria-hidden /> Owners invite people</>}</button></li>
        </ul>
        <div className="pf-matrix-wrap">
          <table className="pf-matrix">
            <thead><tr><th scope="col"><span className="pf-sr">Permission</span></th>{ROLES.map((r) => <th key={r} scope="col" className={r === role ? 'is-me' : ''}>{ROLE_LABEL[r]}</th>)}</tr></thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.perm}>
                  <th scope="row">{row.label}</th>
                  {ROLES.map((r) => <td key={r} className={r === role ? 'is-me' : ''}>{ROLE_PERMISSIONS[r].includes(row.perm) ? <Check aria-label="yes" /> : <span aria-label="no">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Chapter>
  );
}

/* ── Prospect ────────────────────────────────────────── */

const SIX = [
  ['The agreement', 'Read the whole management agreement before you sign, in plain words.'],
  ['One plan', '10% of rent collected, $135 monthly minimum, 75% of the first month for a new lease, $225 a renewal.'],
  ['Pets', 'Case by case, backed by a pet guarantee that covers damage beyond the deposit.'],
  ['Screening', 'Income, rental history, credit and background, the same for every applicant.'],
  ['Repairs', 'Anything over $350 waits for your OK, and every invoice lands on this page.'],
  ['Owners say', '“I check one page instead of chasing emails. My statement explains itself.”'],
];

export function SixThings() {
  return (
    <Chapter id="why" kicker="Working with Westrom Group" title={<>Six things <em>to know.</em></>}>
      <dl className="pf-six">{SIX.map(([t, b]) => <div key={t}><dt>{t}</dt><dd>{b}</dd></div>)}</dl>
    </Chapter>
  );
}

export function ProspectHome({ portfolio, perms, onOpen }: { portfolio: Portfolio; perms: Perms; onOpen: (h: Home) => void }) {
  const h = portfolio.homes[0];
  return (
    <Chapter id="homes" kicker="Your home" title={<>{h.address.split(' ').slice(1).join(' ')}, <em>priced.</em></>}>
      <div className="pf-prospect">
        <button className="pf-plate-btn" onClick={() => onOpen(h)} aria-label={`Open ${h.address}`}><HomePicture home={h} perms={perms} className="pf-plate-pic" /></button>
        <div>
          <p className="pf-lede">Homes like yours near {h.zip} lease for {money(h.marketLowCents ?? 0)} to {money(h.marketHighCents ?? 0)}. We would list it at {money(h.units[0].rentCents)}.</p>
          <MarketLine home={h} />
        </div>
      </div>
    </Chapter>
  );
}

export function ProspectCta({ portfolio }: { portfolio: Portfolio }) {
  return (
    <section className="pf-chapter pf-cta" data-tone="paper">
      <Reveal className="pf-chapter-in">
        <h2 className="pf-title">Sign once. <em>Keep this page.</em></h2>
        <p className="pf-lede">The day you sign, this page becomes your portfolio for {portfolio.homes[0].address}: the lease, the rent, every statement and update.</p>
        <div className="pf-cta-row"><button className="pf-btn is-red">Read the agreement</button><span className="pf-muted">or call {portfolio.manager.name} at {portfolio.manager.phone}</span></div>
      </Reveal>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────── */

export function Footer({ portfolio }: { portfolio: Portfolio }) {
  return (
    <footer className="pf-footer" data-tone="navy">
      <div className="pf-footer-row">
        <div><p className="pf-kicker">{portfolio.manager.title}</p><b>{portfolio.manager.name}</b></div>
        <div><p className="pf-kicker">Phone</p><b className="pf-select"><Phone aria-hidden /> {portfolio.manager.phone}</b></div>
        <div><p className="pf-kicker">Email</p><b className="pf-select"><Mail aria-hidden /> {portfolio.manager.email}</b></div>
      </div>
      <p className="pf-footer-mark" aria-hidden>Westrom <span>Group</span></p>
      <p className="pf-footer-small">Westrom Group · 1297 Avondale Haslet Road, Haslet, Texas · {portfolio.real ? 'Figures from Rentvine.' : 'Demo with invented figures.'}</p>
    </footer>
  );
}
