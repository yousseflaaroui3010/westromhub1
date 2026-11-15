import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

export const TODAY = new Date('2026-11-15T12:00:00');

export const money = (cents: number, opts: { cents?: boolean } = {}) =>
  (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: opts.cents ? 2 : 0 });

export const shortMoney = (cents: number) => {
  const d = cents / 100;
  return d >= 1000 ? `$${(d / 1000).toFixed(d >= 10_000 ? 0 : 1)}k` : `$${Math.round(d)}`;
};

const parse = (iso: string) => new Date(`${iso.length === 7 ? `${iso}-01` : iso}T12:00:00`);

export const fmtDate = (iso: string, o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) =>
  parse(iso).toLocaleDateString('en-US', o);

export const fmtMonth = (ym: string, long = false) =>
  parse(ym).toLocaleDateString('en-US', { month: long ? 'long' : 'short', year: long ? 'numeric' : undefined });

export const daysFromToday = (iso: string) => Math.round((parse(iso).getTime() - TODAY.getTime()) / 86_400_000);

export const leaseEndShort = (iso: string) => parse(iso).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase().replace(' ', ' ’');

/** Share of the lease already lived, 0..1. */
export const leaseProgress = (start: string, end: string) => {
  const a = parse(start).getTime();
  const b = parse(end).getTime();
  return Math.min(1, Math.max(0, (TODAY.getTime() - a) / (b - a)));
};

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Adds `is-in` once the element scrolls into view; children stagger with --i. */
export function Reveal({ as: Tag = 'div', className = '', children, style, id }: {
  as?: ElementType; className?: string; children: ReactNode; style?: CSSProperties; id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion() || typeof IntersectionObserver === 'undefined') { requestAnimationFrame(() => setInView(true)); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin: '0px 0px -12% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} id={id} style={style} className={`pf-reveal ${inView ? 'is-in' : ''} ${className}`}>{children}</Tag>;
}

/** Counts from 0 to `target` the first time it is visible. */
export function CountUp({ value, format, duration = 1400 }: { value: number; format: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const run = () => {
      if (reducedMotion()) { setShown(value); return; }
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / duration);
        setShown(value * (1 - Math.pow(1 - k, 4)));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    if (typeof IntersectionObserver === 'undefined') { run(); return () => cancelAnimationFrame(raf); }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref} className="pf-num">{format(shown)}</span>;
}

/** Section heading with a running index, e.g. "02 / HOMES". */
export function SectionHead({ index, kicker, title, children }: { index: number; kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="pf-sechead">
      <span className="pf-kicker"><b>{String(index).padStart(2, '0')}</b> / {kicker}</span>
      <h2 className="pf-h2">{title}</h2>
      {children && <p className="pf-lede">{children}</p>}
    </header>
  );
}
