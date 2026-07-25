import { Mail, Check, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ViewState } from '../App';

interface PublicHeaderProps {
  onNavigateHome?: () => void;
  currentView?: ViewState;
  onNavigate?: (view: ViewState) => void;
}

const EMAIL = 'info@westromgroup.com';

const NAV_LINKS: { name: string; id: ViewState }[] = [
  { name: 'Taxes', id: 'taxes' },
  { name: 'Insurance', id: 'insurance' },
];

// Static (nginx-served) pages reached by a real navigation, not the SPA router.
const PAGE_LINKS: { name: string; href: string }[] = [
  { name: 'Rental Analysis', href: '/analysis' },
  { name: 'Guarantees', href: '/guarantees' },
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
      // Clipboard blocked (older browser / non-HTTPS / permissions) — the
      // address is still visible as button text so users can long-press to copy.
    }
  };

  // Close the mobile menu on Escape for keyboard users.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Resource nav is persistent on every page (home included) so Taxes,
  // Insurance, Rental Analysis, and Guarantees are always reachable.
  const showNav = Boolean(onNavigate);

  const handleNav = (id: ViewState) => {
    onNavigate?.(id);
    setMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-16 sm:h-20">
          <button
            aria-label="Go to homepage"
            onClick={onNavigateHome}
            className="flex-shrink-0 cursor-pointer transition-transform hover:scale-105 motion-reduce:hover:scale-100 group"
          >
            <img
              src="/westrom-logo.webp"
              alt="Westrom Group Logo"
              width={2048}
              height={1186}
              fetchPriority="high"
              className="h-11 sm:h-16 w-[74px] sm:w-[110px] bg-white p-1 sm:p-1.5 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow"
            />
          </button>

          <nav aria-label="Main navigation" className="hidden sm:flex items-center gap-2">
            {showNav && (
              <div className="flex items-center bg-gray-100/80 p-1 rounded-full">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.name}
                    onClick={() => onNavigate!(link.id)}
                    className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-200 ${
                      currentView === link.id
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                    }`}
                    aria-current={currentView === link.id ? 'page' : undefined}
                  >
                    {link.name}
                  </button>
                ))}
              </div>
            )}
            <a
              href="/analysis"
              className="px-5 py-2 rounded-full font-semibold text-sm text-secondary bg-secondary/10 hover:bg-secondary hover:text-white transition-colors duration-200"
            >
              Rental Analysis
            </a>
            <a
              href="/guarantees"
              className="px-5 py-2 rounded-full font-semibold text-sm text-primary bg-primary/10 hover:bg-primary hover:text-white transition-colors duration-200"
            >
              Guarantees
            </a>
          </nav>

          <button
            type="button"
            onClick={copyEmail}
            aria-label={copied ? 'Email copied to clipboard' : `Copy email address ${EMAIL}`}
            title="Click to copy"
            className="hidden sm:flex flex-shrink-0 min-h-[44px] items-center gap-2 text-primary font-bold text-sm bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {copied ? (
              <Check className="w-4 h-4 flex-shrink-0 text-teal-600" aria-hidden="true" />
            ) : (
              <Mail className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            )}
            <span className={`whitespace-nowrap ${copied ? 'text-teal-600' : ''}`}>
              {copied ? 'Copied!' : EMAIL}
            </span>
          </button>

          {/* Mobile: single hamburger toggle instead of a wrapping button row. */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="sm:hidden flex-shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-xl text-primary bg-primary/5 hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {menuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="sm:hidden border-t border-gray-200 bg-white shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-3 py-3 flex flex-col gap-1">
            {showNav &&
              NAV_LINKS.map((link) => (
                <button
                  key={link.name}
                  onClick={() => handleNav(link.id)}
                  aria-current={currentView === link.id ? 'page' : undefined}
                  className={`w-full text-left min-h-[48px] px-4 rounded-xl font-semibold text-base transition-colors ${
                    currentView === link.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {link.name}
                </button>
              ))}
            {PAGE_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="w-full min-h-[48px] px-4 flex items-center rounded-xl font-semibold text-base text-gray-800 hover:bg-gray-100 transition-colors"
              >
                {link.name}
              </a>
            ))}

            <button
              type="button"
              onClick={copyEmail}
              aria-label={copied ? 'Email copied to clipboard' : `Copy email address ${EMAIL}`}
              className="mt-1 w-full min-h-[48px] px-4 flex items-center gap-2 rounded-xl font-bold text-base text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              {copied ? (
                <Check className="w-5 h-5 flex-shrink-0 text-teal-600" aria-hidden="true" />
              ) : (
                <Mail className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              )}
              <span className={copied ? 'text-teal-600' : ''}>{copied ? 'Copied!' : EMAIL}</span>
            </button>
          </div>
        </nav>
      )}
    </header>
  );
}
