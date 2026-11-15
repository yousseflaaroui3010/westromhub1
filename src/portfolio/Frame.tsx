import { useEffect, useRef, useState, type ReactNode } from 'react';
import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import '@fontsource-variable/archivo/wdth.css';
import './portfolio.css';
import { PlatLines } from './PlatLines';

export interface MenuItem { label: string; href?: string; onClick?: () => void; quiet?: boolean }

/**
 * The portfolio pages' frame: the plat ground, the Westrom Group logo, the
 * menu, and the page tone (paper or navy, following the chapter in the middle
 * of the screen). Used by the demo and by the real, signed-in page.
 */
export function Frame({ label, who, menu, footnote, tone = 'paper', children, watchKey }: {
  label: string;
  who?: { name: string; role?: string };
  menu?: MenuItem[];
  footnote?: string;
  tone?: 'paper' | 'navy';
  children: ReactNode;
  /** Changes when the page content changes, so the tone watcher picks up new chapters. */
  watchKey?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('pf-html');
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
    meta.content = 'noindex, nofollow';
    return () => document.documentElement.classList.remove('pf-html');
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    el.dataset.tone = tone;
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) el.dataset.tone = (e.target as HTMLElement).dataset.tone ?? 'paper'; });
    }, { rootMargin: '-50% 0px -50% 0px' });
    el.querySelectorAll('[data-tone]').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [watchKey, tone]);

  return (
    <div className="pf-root" ref={root} data-tone={tone}>
      <PlatLines />
      <header className="pf-bar">
        <a href="#top" className="pf-logo" aria-label="Westrom Group, top of page">
          <img src="/westrom-logo.webp" alt="" width={2048} height={1186} />
          <span>{label}</span>
        </a>
        <div className="pf-bar-right">
          {who && <span className="pf-bar-me">{who.name}{who.role && <small>{who.role}</small>}</span>}
          {menu && menu.length > 0 && (
            <button className="pf-menu-btn" aria-expanded={open} aria-controls="pf-menu" onClick={() => setOpen((m) => !m)}>
              <span /><span /><b className="pf-sr">Menu</b>
            </button>
          )}
        </div>
      </header>
      {open && menu && (
        <nav className="pf-menu" id="pf-menu" aria-label="Menu">
          <ol>
            {menu.map((m, i) => (
              <li key={m.label} style={{ ['--i' as string]: i }} className={m.quiet ? 'is-quiet' : ''}>
                {m.href
                  ? <a href={m.href} onClick={() => { setOpen(false); m.onClick?.(); }}>{m.label}</a>
                  : <button onClick={() => { setOpen(false); m.onClick?.(); }}>{m.label}</button>}
              </li>
            ))}
          </ol>
          {footnote && <p className="pf-muted">{footnote}</p>}
        </nav>
      )}
      {children}
    </div>
  );
}
