import { Calculator, ShieldCheck, ArrowRight, KeyRound, Upload, ScanSearch, ClipboardCheck, BadgeCheck } from 'lucide-react';
import type { ReactNode } from 'react';

interface HomeViewProps {
  onNavigate: (view: 'taxes' | 'insurance') => void;
}

const GUARANTEES = [
  '12-Month Placement',
  'Eviction Protection',
  '$3,000 Pet',
  'Happiness',
  '90-Day Money-Back',
  'No-Markup Maintenance',
];

const STEPS = [
  {
    icon: Upload,
    title: 'Upload or type it in',
    body: 'Your appraisal notice or insurance declarations page, or just the key numbers. PDFs are converted in your browser.',
  },
  {
    icon: ScanSearch,
    title: 'Get a plain-English read',
    body: 'We check the numbers against Texas rules and market data, then explain what they mean for your property.',
  },
  {
    icon: ClipboardCheck,
    title: 'Act with confidence',
    body: 'Protest it yourself with our step-by-step guide, hire a firm, or ask the Westrom team for a second opinion.',
  },
];

function PathCard(props: {
  icon: ReactNode;
  title: string;
  body: string;
  cta: string;
  accent?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          props.accent ? 'bg-secondary-soft text-secondary' : 'bg-primary-soft text-primary'
        }`}
      >
        {props.icon}
      </div>
      <h3 className="mt-6 font-heading text-xl font-bold text-ink">{props.title}</h3>
      <p className="mt-2 flex-grow leading-relaxed text-on-surface-variant">{props.body}</p>
      <span
        className={`mt-6 inline-flex items-center gap-2 font-semibold transition-[gap] group-hover:gap-3 ${
          props.accent ? 'text-secondary' : 'text-primary'
        }`}
      >
        {props.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </>
  );
  const cls = 'card-link group flex h-full flex-col p-7 text-left';
  return props.href ? (
    <a href={props.href} className={cls}>{inner}</a>
  ) : (
    <button type="button" onClick={props.onClick} className={cls}>{inner}</button>
  );
}

export function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="flex-grow">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]"
        />
        <div className="container-page relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85">
              <span className="h-2 w-2 rounded-full bg-amber-300" aria-hidden="true" />
              This season: protest your tax value and shop your insurance
            </p>
            <h1 className="mt-6 font-heading text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
              Tools to protect and maximize your investment
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">
              Free, expert-built tools for Texas rental owners. Check your property tax notice, find gaps in your
              insurance, and see what your property could rent for.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => onNavigate('taxes')} className="btn-on-dark">
                Check my property taxes <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => onNavigate('insurance')} className="btn-ghost-dark">
                Review my insurance
              </button>
            </div>
          </div>

          {/* At-a-glance panel: the 20% rule is the single most valuable fact
              on the site, so it gets the hero's second column. */}
          <aside className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-sm md:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">Texas rental owners</p>
            <p className="mt-3 font-heading text-6xl font-extrabold tracking-tight">20%</p>
            <p className="mt-2 text-lg font-semibold">Cap on yearly appraisal increases for rentals</p>
            <p className="mt-3 leading-relaxed text-white/75">
              If your notice jumped by more than 20% from last year, you may be owed an automatic reduction. Our tax
              tool checks this for you.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('taxes')}
              className="mt-6 inline-flex items-center gap-2 font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
            >
              Check my notice <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </aside>
        </div>
      </section>

      {/* Paths */}
      <section className="container-page py-16 md:py-20" aria-labelledby="paths-title">
        <div className="max-w-2xl">
          <p className="eyebrow">Choose your path</p>
          <h2 id="paths-title" className="section-title mt-3">Three free tools, one goal: a better return</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <PathCard
            icon={<Calculator className="h-6 w-6" aria-hidden="true" />}
            title="Property taxes"
            body="Review your appraisal notice, see if you qualify for an automatic reduction, and learn how to protest."
            cta="Open the tax hub"
            onClick={() => onNavigate('taxes')}
          />
          <PathCard
            icon={<ShieldCheck className="h-6 w-6" aria-hidden="true" />}
            title="Insurance"
            body="Upload your declarations page to find dangerous coverage gaps and ways to lower your premium before renewal."
            cta="Open the insurance hub"
            onClick={() => onNavigate('insurance')}
          />
          {/* /analysis is a static nginx page, not a react-router route. */}
          <PathCard
            icon={<KeyRound className="h-6 w-6" aria-hidden="true" />}
            title="Rental analysis"
            body="See an instant rent estimate for your property, plus a free expert analysis from our team."
            cta="Get my free analysis"
            href="/analysis"
            accent
          />
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-white" aria-labelledby="how-title">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-2xl">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title" className="section-title mt-3">From paperwork to a clear next step</h2>
          </div>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <s.icon className="h-5 w-5 text-on-surface-variant" aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-heading text-lg font-bold text-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-on-surface-variant">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Guarantees */}
      <section className="container-page py-16 md:py-20" aria-labelledby="guarantees-title">
        <div className="card flex flex-col gap-8 p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-xl">
            <p className="eyebrow">Managed by Westrom</p>
            <h2 id="guarantees-title" className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
              Every owner is backed by six guarantees
            </h2>
            <ul className="mt-5 flex flex-wrap gap-2">
              {GUARANTEES.map((g) => (
                <li key={g} className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-sm font-medium text-primary">
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
          <a href="/guarantees" className="btn-primary shrink-0">
            See our guarantees <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
