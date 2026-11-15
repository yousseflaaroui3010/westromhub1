import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ArrowUpRight, Bell, CalendarDays, Check, Download, Eye, FileText, KeyRound, Lock, Mail, PawPrint, Phone,
  Quote, Receipt, ScanSearch, ShieldCheck, Sparkles, TrendingUp, Wallet, Wrench, X,
} from 'lucide-react';
import { ROLE_LABEL, ROLE_PERMISSIONS, tenantLabel, type Membership, type Permission, type Role } from './access';
import type { Doc, FeedItem, Home, Portfolio, Unit, UnitStatus } from './data';
import { HouseArt, HouseBlueprint, XRay } from './HouseArt';
import {
  CountUp, Reveal, SectionHead, daysFromToday, fmtDate, fmtMonth, leaseEndShort, leaseProgress, money, shortMoney,
} from './ui';

type Perms = ReadonlySet<Permission>;

const STATUS: Record<UnitStatus, { label: string; tone: string }> = {
  occupied: { label: 'Occupied', tone: 'ok' },
  renewal: { label: 'Renewal out', tone: 'warn' },
  vacant: { label: 'For rent', tone: 'live' },
  'make-ready': { label: 'Make-ready', tone: 'warn' },
};

const homeRent = (h: Home) => h.units.reduce((s, u) => s + u.rentCents, 0);
const leasedUnits = (h: Home) => h.units.filter((u) => u.lease);

function factsFor(h: Home, perms: Perms) {
  const u = h.units[0];
  const lease = u.lease;
  return {
    beds: h.beds, baths: h.baths, sqft: h.sqft, yearBuilt: h.yearBuilt,
    rent: perms.has('tenancy:view') || perms.has('market:view') ? shortMoney(homeRent(h)) : undefined,
    leaseEnd: perms.has('tenancy:view') && lease ? (lease.monthToMonth ? 'MONTH-TO-MONTH' : leaseEndShort(lease.end)) : undefined,
  };
}

/* ───────────────────────────── Hero ───────────────────────────── */

export function Hero({ portfolio, firstName, perms, role }: { portfolio: Portfolio; firstName: string; perms: Perms; role: Role }) {
  const ref = useRef<HTMLElement>(null);
  const featured = portfolio.homes[0];
  const doors = portfolio.homes.reduce((s, h) => s + h.units.length, 0);
  const occupied = portfolio.homes.reduce((s, h) => s + leasedUnits(h).length, 0);
  const rent = portfolio.homes.reduce((s, h) => s + homeRent(h), 0);
  const paidYear = portfolio.ledger.reduce((s, m) => s + m.paidCents, 0);
  const hour = 19;
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const prospect = portfolio.stage === 'prospect';
  const words = (prospect ? featured.address.split(' ').slice(1, 3).join(' ') : portfolio.shortName).toUpperCase().split(' ');
  const offsets = words.map((_, i) => words.slice(0, i).join('').length);

  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const b = ref.current?.getBoundingClientRect();
    if (!b || !ref.current) return;
    ref.current.style.setProperty('--mx', `${((e.clientX - b.left) / b.width) * 100}%`);
    ref.current.style.setProperty('--my', `${((e.clientY - b.top) / b.height) * 100}%`);
  };

  return (
    <section ref={ref} className="pf-hero" onPointerMove={move} id="top">
      <div className="pf-hero-grid" aria-hidden />
      <div className="pf-hero-inner">
        <div className="pf-hero-copy">
          <p className="pf-eyebrow">
            <span className="pf-dot" /> {prospect ? 'Prepared for you' : `Owner portfolio · since ${portfolio.since}`}
            <span className="pf-eyebrow-role">{ROLE_LABEL[role]}</span>
          </p>
          <p className="pf-greet">{greet}, {firstName}.</p>
          <h1 className="pf-mega" aria-label={prospect ? featured.address : portfolio.name}
            style={{ ['--len' as string]: Math.max(...words.map((w) => w.length)) }}>
            {words.map((w, wi) => (
              <span key={wi} className="pf-word" aria-hidden>
                {w.split('').map((ch, ci) => <span key={ci} style={{ ['--i' as string]: offsets[wi] + ci }}>{ch}</span>)}
              </span>
            ))}
          </h1>
          <p className="pf-hero-sub">
            {prospect
              ? <>This is the page you would keep for as long as we manage <b>{featured.address}</b>. Look around: the numbers below are for your home.</>
              : <>{portfolio.name}: {portfolio.homes.length} {portfolio.homes.length === 1 ? 'property' : 'properties'}, {doors} doors. Everything we do for you, in one place.</>}
          </p>
          {!prospect && (
            <dl className="pf-stats">
              {perms.has('homes:view') && <div><dt>Doors</dt><dd><CountUp value={doors} format={(n) => String(Math.round(n))} /></dd></div>}
              {perms.has('tenancy:view') && <div><dt>Leased</dt><dd><CountUp value={occupied} format={(n) => `${Math.round(n)}/${doors}`} /></dd></div>}
              {perms.has('tenancy:view') && <div><dt>Monthly rent</dt><dd><CountUp value={rent} format={(n) => money(n)} /></dd></div>}
              {perms.has('money:view') && <div><dt>Paid to you · 1 yr</dt><dd><CountUp value={paidYear} format={(n) => money(n)} /></dd></div>}
            </dl>
          )}
          {prospect && (
            <dl className="pf-stats">
              <div><dt>Estimated rent</dt><dd>{shortMoney(featured.marketLowCents)}–{shortMoney(featured.marketHighCents).replace('$', '')}</dd></div>
              <div><dt>Our fee</dt><dd>10%</dd></div>
              <div><dt>Typical days to lease</dt><dd>21</dd></div>
            </dl>
          )}
        </div>
        {perms.has('homes:view') ? (
          <div className="pf-hero-visual">
            <XRay
              className="pf-hero-xray"
              hint="Hover the house · tap on mobile"
              art={<HouseArt style={featured.style} palette={featured.palette} />}
              blueprint={<HouseBlueprint style={featured.style} facts={factsFor(featured, perms)} />}
            />
            <p className="pf-hero-caption"><span>{featured.address}</span><span>{featured.city}, TX {featured.zip}</span></p>
          </div>
        ) : (
          <div className="pf-hero-visual pf-hero-ledger">
            <Receipt aria-hidden />
            <p>Statements, ledger and tax documents for <b>{portfolio.name}</b>.</p>
            <p className="pf-muted">Your access covers the money and the paperwork, not the tenants.</p>
          </div>
        )}
      </div>
      <a href="#homes" className="pf-scrollcue" aria-label="Scroll down"><span /></a>
    </section>
  );
}

/* ───────────────────────────── Homes ───────────────────────────── */

function TiltCard({ home, perms, onOpen, i }: { home: Home; perms: Perms; onOpen: () => void; i: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const b = ref.current.getBoundingClientRect();
    const x = (e.clientX - b.left) / b.width - 0.5;
    const y = (e.clientY - b.top) / b.height - 0.5;
    ref.current.style.setProperty('--ry', `${x * 10}deg`);
    ref.current.style.setProperty('--rx', `${-y * 8}deg`);
    ref.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const reset = () => { ref.current?.style.setProperty('--ry', '0deg'); ref.current?.style.setProperty('--rx', '0deg'); };
  const lead = home.units.find((u) => u.lease) ?? home.units[0];
  const worst = home.units.find((u) => u.status !== 'occupied') ?? home.units[0];
  const st = STATUS[worst.status];
  return (
    <button ref={ref} className="pf-card" style={{ ['--i' as string]: i }} onPointerMove={move} onPointerLeave={reset} onClick={onOpen}
      aria-label={`Open ${home.address}`}>
      <div className="pf-card-media">
        <HouseArt style={home.style} palette={home.palette} className="pf-card-art" />
        <div className="pf-card-bp"><HouseBlueprint style={home.style} facts={factsFor(home, perms)} /></div>
        <span className="pf-card-scan" aria-hidden />
        {perms.has('tenancy:view') && <span className={`pf-pill pf-tone-${st.tone}`}>{home.units.length > 1 ? `${worst.label}: ` : ''}{st.label}</span>}
      </div>
      <div className="pf-card-body">
        <p className="pf-card-city">{home.city} · {home.zip}</p>
        <h3 className="pf-card-title">{home.address}</h3>
        <p className="pf-card-facts">{home.beds} bd · {home.baths} ba · {home.sqft.toLocaleString()} sq ft{home.units.length > 1 ? ` · ${home.units.length} units` : ''}</p>
        {perms.has('tenancy:view') && (
          <div className="pf-card-foot">
            <div>
              <span className="pf-label">Rent</span>
              <b className="pf-mono">{money(homeRent(home))}</b>
            </div>
            {lead.lease ? (
              <div className="pf-ring-wrap">
                <svg viewBox="0 0 36 36" className="pf-ring" aria-hidden>
                  <circle cx="18" cy="18" r="15.5" className="pf-ring-bg" />
                  <circle cx="18" cy="18" r="15.5" className="pf-ring-fg" style={{ strokeDasharray: `${(lead.lease.monthToMonth ? 1 : leaseProgress(lead.lease.start, lead.lease.end)) * 97.4} 97.4` }} />
                </svg>
                <span><span className="pf-label">Lease</span>{lead.lease.monthToMonth ? 'Month to month' : `Ends ${fmtDate(lead.lease.end, { month: 'short', year: 'numeric' })}`}</span>
              </div>
            ) : (
              <div><span className="pf-label">Listing</span>{lead.listing ? `${lead.listing.showings} showings` : 'Getting ready'}</div>
            )}
          </div>
        )}
        <span className="pf-card-open" aria-hidden><ArrowUpRight /></span>
      </div>
    </button>
  );
}

export function Homes({ portfolio, perms, index, onOpen }: { portfolio: Portfolio; perms: Perms; index: number; onOpen: (h: Home) => void }) {
  return (
    <Reveal as="section" className="pf-section" id="homes">
      <SectionHead index={index} kicker="Homes" title={<>Your <em>portfolio</em>, door by door.</>}>
        Hover a home to see its blueprint. Open it for the lease, payments and paperwork.
      </SectionHead>
      <div className="pf-track" role="list">
        {portfolio.homes.map((h, i) => <div role="listitem" key={h.id}><TiltCard home={h} perms={perms} i={i} onOpen={() => onOpen(h)} /></div>)}
      </div>
    </Reveal>
  );
}

function Payments({ unit }: { unit: Unit }) {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  return (
    <div className="pf-paydots" aria-label="Rent paid, last six months">
      {unit.payments.map((p, i) => (
        <span key={i} className={`pf-paydot is-${p}`} title={`${months[i]}: ${p === 'paid' ? 'paid on time' : p === 'late' ? 'paid late' : 'no lease'}`}>
          <i />{months[i]}
        </span>
      ))}
    </div>
  );
}

function MarketBar({ home }: { home: Home }) {
  const rent = home.units[0].rentCents;
  const lo = home.marketLowCents * 0.9;
  const hi = home.marketHighCents * 1.1;
  const pos = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  const verdict = rent < home.marketLowCents ? `Below market by ${money(home.marketLowCents - rent)}`
    : rent > home.marketHighCents ? `Above market by ${money(rent - home.marketHighCents)}` : 'In the market range';
  return (
    <div className="pf-mbar">
      <div className="pf-mbar-track">
        <span className="pf-mbar-band" style={{ left: pos(home.marketLowCents), width: `calc(${pos(home.marketHighCents)} - ${pos(home.marketLowCents)})` }} />
        <span className="pf-mbar-pin" style={{ left: pos(rent) }}><b>{money(rent)}</b></span>
      </div>
      <div className="pf-mbar-legend"><span>{money(home.marketLowCents)}</span><span className="pf-mbar-verdict">{verdict}</span><span>{money(home.marketHighCents)}</span></div>
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
        <button ref={closeRef} className="pf-iconbtn pf-drawer-close" onClick={onClose} aria-label="Close"><X /></button>
        <XRay
          className="pf-drawer-xray"
          hint="Move over the photo"
          art={<HouseArt style={home.style} palette={home.palette} />}
          blueprint={<HouseBlueprint style={home.style} facts={factsFor(home, perms)} />}
        />
        <div className="pf-drawer-body">
          <p className="pf-card-city">{home.city}, TX {home.zip} · {home.county} County</p>
          <h3 className="pf-drawer-title">{home.address}</h3>
          <dl className="pf-facts">
            <div><dt>Beds / baths</dt><dd>{home.beds} / {home.baths}</dd></div>
            <div><dt>Size</dt><dd>{home.sqft.toLocaleString()} sq ft</dd></div>
            <div><dt>Built</dt><dd>{home.yearBuilt}{home.yearBuilt < 1978 && <small> · lead paint addendum</small>}</dd></div>
            <div><dt>HOA</dt><dd>{home.hoa ?? 'None'}</dd></div>
          </dl>

          {perms.has('tenancy:view') && home.units.map((u, i) => (
            <div key={i} className="pf-unit">
              <div className="pf-unit-head">
                <h4>{u.label ?? 'The lease'}</h4>
                <span className={`pf-pill pf-tone-${STATUS[u.status].tone}`}>{STATUS[u.status].label}</span>
              </div>
              {u.lease ? (
                <>
                  <p className="pf-unit-who">{u.lease.tenants.map((t) => tenantLabel(t, perms)).join(' & ')} · {money(u.rentCents)}/mo · deposit {money(u.lease.depositCents)}</p>
                  <div className="pf-timeline">
                    <span style={{ width: `${(u.lease.monthToMonth ? 1 : leaseProgress(u.lease.start, u.lease.end)) * 100}%` }} />
                  </div>
                  <div className="pf-timeline-legend">
                    <span>{fmtDate(u.lease.start)}</span>
                    <span>{u.lease.monthToMonth ? 'Month to month since ' + fmtDate(u.lease.end, { month: 'short', year: 'numeric' }) : `${fmtDate(u.lease.end)} · ${daysFromToday(u.lease.end)} days left`}</span>
                  </div>
                </>
              ) : u.listing && perms.has('showings:view') ? (
                <div className="pf-listing">
                  <div><b className="pf-mono">{u.listing.daysOnMarket}</b><span>days listed</span></div>
                  <div><b className="pf-mono">{u.listing.showings}</b><span>showings</span></div>
                  <div><b className="pf-mono">{u.listing.applications}</b><span>applications</span></div>
                  <div><b className="pf-mono">{money(u.listing.askingCents)}</b><span>asking</span></div>
                  <p className="pf-quote"><Quote aria-hidden /> {u.listing.feedback}</p>
                </div>
              ) : <p className="pf-muted">No lease yet. We will post here when it is listed.</p>}
              {u.payments.length > 0 && <Payments unit={u} />}
            </div>
          ))}

          {perms.has('market:view') && (
            <div className="pf-block">
              <h4><TrendingUp aria-hidden /> Rent vs the market</h4>
              <MarketBar home={home} />
            </div>
          )}

          {perms.has('feed:view') && home.workOrders.length > 0 && (
            <div className="pf-block">
              <h4><Wrench aria-hidden /> Repairs and visits</h4>
              <ul className="pf-wo">
                {home.workOrders.map((w, i) => (
                  <li key={i}><span className={`pf-wo-state is-${w.state}`}>{w.state}</span><span>{w.title}</span><span className="pf-mono">{w.costCents ? money(w.costCents) : '—'}</span><span className="pf-muted">{fmtDate(w.date, { month: 'short', day: 'numeric' })}</span></li>
                ))}
              </ul>
            </div>
          )}

          {perms.has('documents:view') && docs.length > 0 && (
            <div className="pf-block">
              <h4><FileText aria-hidden /> Paperwork for this home</h4>
              <ul className="pf-doclist">{docs.map((d) => <li key={d.name}><FileText aria-hidden /> {d.name}<span className="pf-muted">{fmtDate(d.date)}</span></li>)}</ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

/* ───────────────────────────── Money ───────────────────────────── */

export function Money({ portfolio, perms, index }: { portfolio: Portfolio; perms: Perms; index: number }) {
  const rows = portfolio.ledger;
  const [sel, setSel] = useState(rows.length - 2); // the last full month
  const m = rows[sel];
  const max = Math.max(...rows.map((r) => r.rentCents));
  const total = rows.reduce((s, r) => s + r.paidCents, 0);
  const W = 720, H = 220, bw = W / rows.length;
  const steps = [
    { label: 'Rent collected', v: m.rentCents, tone: 'in' },
    { label: 'Management fee', v: -m.feesCents, tone: 'out' },
    { label: 'Repairs & bills', v: -m.repairsCents, tone: 'out' },
    { label: 'Paid to you', v: m.paidCents, tone: 'net' },
  ];
  let run = 0;
  return (
    <Reveal as="section" className="pf-section" id="money">
      <SectionHead index={index} kicker="Money" title={<>Where every <em>dollar</em> went.</>}>
        From rent collected to the deposit in your account. Pick a month.
      </SectionHead>
      <div className="pf-money">
        <div className="pf-panel pf-chart">
          <div className="pf-chart-top">
            <div><span className="pf-label">Paid to you, last 12 months</span><b className="pf-big"><CountUp value={total} format={(n) => money(n)} /></b></div>
            <div className="pf-legend"><span className="is-paid">Paid to you</span><span className="is-cost">Fees & repairs</span></div>
          </div>
          <svg viewBox={`0 0 ${W} ${H + 28}`} className="pf-bars" role="img" aria-label="Monthly payouts">
            {rows.map((r, i) => {
              const hRent = (r.rentCents / max) * H;
              const hPaid = (r.paidCents / max) * H;
              const x = i * bw + bw * 0.18;
              const w = bw * 0.64;
              return (
                <g key={r.month} className={`pf-bar ${i === sel ? 'is-sel' : ''}`} onClick={() => setSel(i)} style={{ ['--i' as string]: i }}>
                  <rect x={i * bw} y={0} width={bw} height={H + 28} fill="transparent" />
                  <rect x={x} y={H - hRent} width={w} height={hRent - hPaid} className="pf-bar-cost" rx="3" />
                  <rect x={x} y={H - hPaid} width={w} height={hPaid} className="pf-bar-paid" rx="3" />
                  <text x={x + w / 2} y={H + 20} textAnchor="middle" className="pf-bar-label">{fmtMonth(r.month).slice(0, 3)}</text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="pf-panel pf-flow" key={m.month}>
          <span className="pf-label">{fmtMonth(m.month, true)}</span>
          <ol>
            {steps.map((s, i) => {
              const start = s.tone === 'net' ? 0 : s.v < 0 ? run + s.v : run;
              if (s.tone !== 'net') run += s.v;
              const width = (Math.abs(s.v) / m.rentCents) * 100;
              return (
                <li key={s.label} style={{ ['--i' as string]: i }}>
                  <span className="pf-flow-label">{s.label}</span>
                  <span className="pf-flow-track"><span className={`pf-flow-bar is-${s.tone}`} style={{ left: `${(start / m.rentCents) * 100}%`, width: `${Math.max(width, 0.6)}%` }} /></span>
                  <b className={`pf-mono is-${s.tone}`}>{s.v < 0 ? '−' : ''}{money(Math.abs(s.v))}</b>
                </li>
              );
            })}
          </ol>
          <p className="pf-muted pf-small">Fees follow your agreement: 10% of rent collected. Repairs over $350 are approved by you first.</p>
        </div>
        <div className="pf-panel pf-statements">
          <div className="pf-panel-head"><h3><Receipt aria-hidden /> Owner statements</h3>{!perms.has('statements:download') && <Lock aria-label="Locked" />}</div>
          <ul>
            {portfolio.statements.map((s) => (
              <li key={s.id}>
                <span>{fmtMonth(s.period, true)}</span>
                <span className="pf-muted pf-mono">in {shortMoney(s.incomeCents)} · out {shortMoney(s.expenseCents)}</span>
                <b className="pf-mono">{money(s.paidCents)}</b>
                <button className="pf-iconbtn" disabled={!perms.has('statements:download')} aria-label={`Download ${fmtMonth(s.period, true)} statement`}><Download /></button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Reveal>
  );
}

/* ───────────────────────────── Updates ───────────────────────────── */

const FEED_ICON: Record<FeedItem['kind'], typeof Bell> = { update: Sparkles, payment: Wallet, repair: Wrench, showing: Eye, renewal: KeyRound, document: FileText };

export function Updates({ portfolio, index }: { portfolio: Portfolio; index: number }) {
  return (
    <Reveal as="section" className="pf-section" id="updates">
      <SectionHead index={index} kicker="Updates" title={<>The week, <em>without</em> the emails.</>}>
        Your weekly owner update lands here too, with every repair, showing and renewal. You get a ping when something is new.
      </SectionHead>
      <ol className="pf-feed">
        {portfolio.feed.map((f, i) => {
          const Icon = FEED_ICON[f.kind];
          return (
            <li key={i} style={{ ['--i' as string]: i }} className={f.isNew ? 'is-new' : ''}>
              <span className="pf-feed-icon"><Icon aria-hidden /></span>
              <div>
                <p className="pf-feed-meta">{fmtDate(f.date, { weekday: 'short', month: 'short', day: 'numeric' })}{f.isNew && <span className="pf-new">New</span>}</p>
                <h4>{f.title}</h4>
                <p>{f.body}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Reveal>
  );
}

/* ───────────────────────────── Key dates ───────────────────────────── */

export function KeyDates({ portfolio, index }: { portfolio: Portfolio; index: number }) {
  const span = Math.max(...portfolio.keyDates.map((d) => daysFromToday(d.date)), 1);
  return (
    <Reveal as="section" className="pf-section" id="dates">
      <SectionHead index={index} kicker="Ahead" title={<>Dates that <em>cost money</em> if missed.</>}>
        Lease ends, inspections, insurance renewals and the May 15 tax protest deadline, counted down.
      </SectionHead>
      <div className="pf-panel pf-dates">
        <div className="pf-dates-line" aria-hidden>
          <span className="pf-dates-today">Today</span>
          {portfolio.keyDates.map((d, i) => (
            <span key={i} className={`pf-dates-mark is-${d.kind}`} style={{ left: `${(daysFromToday(d.date) / span) * 100}%` }} />
          ))}
        </div>
        <ul>
          {portfolio.keyDates.map((d, i) => {
            const inner = (
              <>
                <span className={`pf-dates-chip is-${d.kind}`}>{daysFromToday(d.date)} days</span>
                <span className="pf-dates-when">{fmtDate(d.date, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="pf-dates-what"><b>{d.title}</b>{d.detail}</span>
                {d.href && <ArrowUpRight className="pf-dates-go" aria-hidden />}
              </>
            );
            return <li key={i} style={{ ['--i' as string]: i }}>{d.href ? <a href={d.href}>{inner}</a> : <div>{inner}</div>}</li>;
          })}
        </ul>
      </div>
    </Reveal>
  );
}

/* ───────────────────────────── Market ───────────────────────────── */

export function Market({ portfolio, index }: { portfolio: Portfolio; index: number }) {
  return (
    <Reveal as="section" className="pf-section" id="market">
      <SectionHead index={index} kicker="Market" title={<>Is your rent <em>right</em>?</>}>
        Each home against what similar homes nearby lease for, from our own data across the doors we manage.
      </SectionHead>
      <div className="pf-panel pf-market">
        {portfolio.homes.map((h) => (
          <div key={h.id} className="pf-market-row">
            <div><b>{h.address}</b><span className="pf-muted">{h.beds} bd · {h.sqft.toLocaleString()} sq ft · {h.zip}</span></div>
            <MarketBar home={h} />
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ───────────────────────────── Documents ───────────────────────────── */

const DOC_TONE: Record<Doc['kind'], string> = { agreement: 'red', addendum: 'blue', lease: 'blue', inspection: 'amber', tax: 'green', statement: 'green', sample: 'blue' };

export function Documents({ portfolio, index }: { portfolio: Portfolio; index: number }) {
  return (
    <Reveal as="section" className="pf-section" id="documents">
      <SectionHead index={index} kicker="Documents" title={<>Every <em>signature</em>, findable.</>}>
        Agreements, addenda, leases, inspections and tax forms, pulled from the Files we keep for you.
      </SectionHead>
      <div className="pf-docs">
        {portfolio.documents.map((d, i) => (
          <button key={d.name} className={`pf-doc is-${DOC_TONE[d.kind]}`} style={{ ['--i' as string]: i }}>
            <span className="pf-doc-kind">{d.kind}</span>
            <FileText className="pf-doc-icon" aria-hidden />
            <b>{d.name}</b>
            <span className="pf-muted">{d.home ?? 'Whole portfolio'} · {fmtDate(d.date)}</span>
            <ArrowUpRight className="pf-doc-go" aria-hidden />
          </button>
        ))}
      </div>
    </Reveal>
  );
}

/* ───────────────────────────── People & access ───────────────────────────── */

const MATRIX: { perm: Permission; label: string }[] = [
  { perm: 'homes:view', label: 'Homes & photos' },
  { perm: 'tenancy:view', label: 'Leases & rent status' },
  { perm: 'tenancy:names', label: 'Tenants’ full names' },
  { perm: 'money:view', label: 'Ledger & cash flow' },
  { perm: 'statements:download', label: 'Download statements' },
  { perm: 'documents:view', label: 'Documents' },
  { perm: 'feed:view', label: 'Weekly updates & repairs' },
  { perm: 'showings:view', label: 'Showings & applications' },
  { perm: 'alerts:view', label: 'Tax & insurance dates' },
  { perm: 'members:manage', label: 'Invite or remove people' },
  { perm: 'portfolio:any', label: 'Open other portfolios' },
];
const ROLES: Role[] = ['owner', 'accountant', 'prospect', 'staff'];

export function People({ portfolio, members, perms, role, index }: { portfolio: Portfolio; members: Membership[]; perms: Perms; role: Role; index: number }) {
  const mine = members.filter((m) => m.portfolioId === portfolio.id);
  return (
    <Reveal as="section" className="pf-section" id="people">
      <SectionHead index={index} kicker="Access" title={<>Who sees <em>what</em>.</>}>
        Co-owners share one portfolio. Add your accountant and they see the money and the paperwork, never your tenants. Nobody sees a portfolio they are not on.
      </SectionHead>
      <div className="pf-people">
        <div className="pf-panel">
          <div className="pf-panel-head"><h3><ShieldCheck aria-hidden /> On this portfolio</h3></div>
          <ul className="pf-members">
            {mine.map((m) => (
              <li key={m.email}>
                <span className="pf-avatar">{m.email[0].toUpperCase()}</span>
                <span><b>{m.email}</b><span className="pf-muted">{ROLE_LABEL[m.role]}</span></span>
              </li>
            ))}
            <li className="pf-muted"><span className="pf-avatar is-w">W</span><span><b>Westrom team</b><span>Staff, as your manager</span></span></li>
          </ul>
          <button className="pf-btn" disabled={!perms.has('members:manage')}>
            {perms.has('members:manage') ? <><Mail aria-hidden /> Invite your accountant</> : <><Lock aria-hidden /> Only owners can invite</>}
          </button>
        </div>
        <div className="pf-panel pf-matrix-wrap">
          <table className="pf-matrix">
            <thead><tr><th scope="col">Can…</th>{ROLES.map((r) => <th key={r} scope="col" className={r === role ? 'is-me' : ''}>{ROLE_LABEL[r]}{r === role && <small>you</small>}</th>)}</tr></thead>
            <tbody>
              {MATRIX.map((row) => (
                <tr key={row.perm}>
                  <th scope="row">{row.label}</th>
                  {ROLES.map((r) => (
                    <td key={r} className={r === role ? 'is-me' : ''}>{ROLE_PERMISSIONS[r].includes(row.perm) ? <Check aria-label="yes" /> : <span className="pf-no" aria-label="no">·</span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Reveal>
  );
}

/* ───────────────────────────── Prospect ───────────────────────────── */

const SIX = [
  { icon: FileText, title: 'The agreement', body: 'Read the full management agreement before you sign. No surprises, plain words.' },
  { icon: Receipt, title: 'One simple plan', body: '10% of rent collected, $135 monthly minimum, 75% of first month for a new lease, $225 per renewal.' },
  { icon: PawPrint, title: 'Pets', body: 'Pets are allowed case by case, with a pet guarantee that covers damage beyond the deposit.' },
  { icon: ScanSearch, title: 'Screening', body: 'Income, rental history, credit and background, the same for every applicant.' },
  { icon: Wrench, title: 'Repairs', body: 'Anything over $350 waits for your OK. Every invoice and photo lands on this page.' },
  { icon: Quote, title: 'Owners say', body: '“I check one page instead of chasing emails. My statement explains itself.”' },
];

export function ProspectIntro({ portfolio, index }: { portfolio: Portfolio; index: number }) {
  const home = portfolio.homes[0];
  return (
    <>
      <Reveal as="section" className="pf-section" id="homes">
        <SectionHead index={index} kicker="Your home" title={<>What <em>{home.address.split(' ').slice(1).join(' ')}</em> could earn.</>}>
          Based on homes we lease near {home.zip} with {home.beds} bedrooms and about {home.sqft.toLocaleString()} sq ft.
        </SectionHead>
        <div className="pf-panel pf-market"><div className="pf-market-row"><div><b>{home.address}</b><span className="pf-muted">Suggested list price {money(home.units[0].rentCents)}</span></div><MarketBar home={home} /></div></div>
      </Reveal>
      <Reveal as="section" className="pf-section" id="why">
        <SectionHead index={index + 1} kicker="Working with us" title={<>Six things <em>to know</em>.</>} />
        <div className="pf-six">
          {SIX.map((s, i) => (
            <article key={s.title} className="pf-six-card" style={{ ['--i' as string]: i }}>
              <s.icon aria-hidden />
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </Reveal>
    </>
  );
}

export function ProspectCta({ portfolio }: { portfolio: Portfolio }) {
  return (
    <Reveal as="section" className="pf-section pf-cta">
      <h2 className="pf-h2">Sign once. <em>Keep this page.</em></h2>
      <p className="pf-lede">The day you sign, this page turns into your owner portfolio for {portfolio.homes[0].address}: lease, rent, statements and every update.</p>
      <div className="pf-cta-row">
        <button className="pf-btn pf-btn-red"><FileText aria-hidden /> Review the agreement</button>
        <a className="pf-btn" href={`tel:${portfolio.manager.phone}`}><Phone aria-hidden /> Call {portfolio.manager.name}</a>
      </div>
    </Reveal>
  );
}

export function Contact({ portfolio }: { portfolio: Portfolio }) {
  return (
    <footer className="pf-footer">
      <div className="pf-footer-card">
        <span className="pf-avatar is-big">{portfolio.manager.name[0]}</span>
        <div>
          <span className="pf-label">{portfolio.manager.title}</span>
          <b>{portfolio.manager.name}</b>
        </div>
        <a className="pf-btn" href={`tel:${portfolio.manager.phone}`}><Phone aria-hidden /> {portfolio.manager.phone}</a>
        <a className="pf-btn" href={`mailto:${portfolio.manager.email}`}><Mail aria-hidden /> Email</a>
      </div>
      <p className="pf-muted pf-small"><CalendarDays aria-hidden /> Westrom Group Company · Haslet, TX · Data refreshed from Rentvine every morning.</p>
    </footer>
  );
}
