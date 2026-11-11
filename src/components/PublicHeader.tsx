import { Mail, Check, Menu, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ViewState } from '../App';

interface PublicHeaderProps {
  onNavigateHome?: () => void;
  currentView?: ViewState;
  onNavigate?: (view: ViewState) => void;
}

const EMAIL = 'info@westromgroup.com';

// SPA routes (client-side) and static nginx pages (real navigation) share one
// visual treatment so the nav reads as a single list.
type NavItem =
  | { name: string; kind: 'view'; id: ViewState }
  | { name: string; kind: 'page'; href: string };

const NAV: NavItem[] = [
  { name: 'Property Taxes', kind: 'view', id: 'taxes' },
  { name: 'Insurance', kind: 'view', id: 'insurance' },
  { name: 'Guarantees', kind: 'page', href: '/guarantees' },
];

export function PublicHeader({ onNavigateHome, currentView, onNavigate }: PublicHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the address stays visible so users can copy it.
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const go = (id: ViewState) => {
    onNavigate?.(id);
    setMenuOpen(false);
  };

  const linkBase =
    'relative inline-flex h-10 items-center rounded-lg px-3 text-[15px] font-semibold transition-colors';

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        <button
          type="button"
          aria-label="Westrom Group, go to homepage"
          onClick={onNavigateHome}
          className="flex shrink-0 items-center rounded-lg"
        >
          <img
            src="/westrom-logo.webp"
            alt=""
            width={2048}
            height={1186}
            fetchPriority="high"
            className="h-10 w-auto md:h-12"
          />
        </button>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            if (item.kind === 'view') {
              const active = currentView === item.id;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`${linkBase} ${
                    active
                      ? 'text-primary after:absolute after:inset-x-3 after:-bottom-[13px] after:h-0.5 after:rounded-full after:bg-secondary'
                      : 'text-on-surface-variant hover:bg-slate-100 hover:text-ink'
                  }`}
                >
                  {item.name}
                </button>
              );
            }
            return (
              <a key={item.name} href={item.href} className={`${linkBase} text-on-surface-variant hover:bg-slate-100 hover:text-ink`}>
                {item.name}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={copyEmail}
            aria-label={copied ? 'Email copied to clipboard' : `Copy email address ${EMAIL}`}
            title="Click to copy"
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-slate-100 hover:text-ink"
          >
            {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
            <span className={`hidden whitespace-nowrap lg:inline ${copied ? 'text-success' : ''}`}>{copied ? 'Copied!' : EMAIL}</span>
            <span className={`whitespace-nowrap lg:hidden ${copied ? 'text-success' : ''}`}>{copied ? 'Copied!' : 'Email'}</span>
          </button>
          <a href="/analysis" className="btn-accent min-h-10 px-4 text-sm">
            Free rental analysis <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-primary transition-colors hover:bg-slate-100 md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile navigation" className="border-t border-line bg-white md:hidden">
          <div className="container-page flex flex-col gap-1 py-3">
            {NAV.map((item) =>
              item.kind === 'view' ? (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => go(item.id)}
                  aria-current={currentView === item.id ? 'page' : undefined}
                  className={`flex min-h-12 w-full items-center rounded-xl px-4 text-left text-base font-semibold ${
                    currentView === item.id ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-slate-100'
                  }`}
                >
                  {item.name}
                </button>
              ) : (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-12 w-full items-center rounded-xl px-4 text-base font-semibold text-ink hover:bg-slate-100"
                >
                  {item.name}
                </a>
              ),
            )}
            <button
              type="button"
              onClick={copyEmail}
              aria-label={copied ? 'Email copied to clipboard' : `Copy email address ${EMAIL}`}
              className="flex min-h-12 w-full items-center gap-2 rounded-xl px-4 text-base font-semibold text-on-surface-variant hover:bg-slate-100"
            >
              {copied ? <Check className="h-5 w-5 text-success" aria-hidden="true" /> : <Mail className="h-5 w-5" aria-hidden="true" />}
              <span className={copied ? 'text-success' : ''}>{copied ? 'Copied!' : EMAIL}</span>
            </button>
            <a href="/analysis" onClick={() => setMenuOpen(false)} className="btn-accent mt-2 w-full">
              Free rental analysis <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
