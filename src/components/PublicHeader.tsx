import { Mail, Check } from 'lucide-react';
import { useState } from 'react';
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

export function PublicHeader({ onNavigateHome, currentView, onNavigate }: PublicHeaderProps) {
  const [copied, setCopied] = useState(false);

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

  const showToggle = Boolean(currentView && currentView !== 'home' && onNavigate);

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

          {showToggle && (
            <nav aria-label="Main navigation" className="hidden sm:flex items-center bg-gray-100/80 p-1 rounded-full">
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
            </nav>
          )}

          <button
            type="button"
            onClick={copyEmail}
            aria-label={copied ? 'Email copied to clipboard' : `Copy email address ${EMAIL}`}
            title="Click to copy"
            className="flex-shrink-0 min-h-[44px] flex items-center gap-1.5 sm:gap-2 text-primary font-bold text-[11px] sm:text-sm bg-primary/5 hover:bg-primary/10 px-2.5 sm:px-4 py-2 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-teal-600" aria-hidden="true" />
            ) : (
              <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" aria-hidden="true" />
            )}
            <span className={`whitespace-nowrap ${copied ? 'text-teal-600' : ''}`}>
              {copied ? 'Copied!' : EMAIL}
            </span>
          </button>
        </div>

        {showToggle && (
          <nav aria-label="Main navigation" className="sm:hidden pb-2 -mt-1">
            <div className="flex items-center bg-gray-100/80 p-1 rounded-full">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.name}
                  onClick={() => onNavigate!(link.id)}
                  className={`flex-1 min-h-[40px] px-4 py-1.5 rounded-full font-semibold text-sm transition-all ${
                    currentView === link.id
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-current={currentView === link.id ? 'page' : undefined}
                >
                  {link.name}
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
