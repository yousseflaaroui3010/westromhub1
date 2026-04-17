import { Menu, X, Mail } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ViewState } from '../App';

interface PublicHeaderProps {
  onNavigateHome?: () => void;
  currentView?: ViewState;
  onNavigate?: (view: ViewState) => void;
}

export function PublicHeader({ onNavigateHome, currentView, onNavigate }: PublicHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      // Focus first element slightly after render
      setTimeout(() => {
        const firstFocusable = drawerRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
        if (firstFocusable) firstFocusable.focus();
      }, 50);
    } else {
      document.body.style.overflow = '';
      if (document.activeElement && drawerRef.current?.contains(document.activeElement)) {
        toggleButtonRef.current?.focus();
      }
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMobileMenuOpen) return;
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        toggleButtonRef.current?.focus();
      }
      if (e.key === 'Tab') {
        const focusableElements = drawerRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as NodeListOf<HTMLElement>;
        if (!focusableElements || focusableElements.length === 0) return;
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: 'Taxes', id: 'taxes' as ViewState },
    { name: 'Insurance', id: 'insurance' as ViewState },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <button aria-label="Go to homepage" onClick={onNavigateHome} className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 group">
          <img
            src="/westrom-logo.webp"
            alt="Westrom Group Logo"
            width={2048}
            height={1186}
            fetchPriority="high"
            className="h-16 w-auto bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm group-hover:shadow-md transition-shadow"
          />
        </button>

        {/* Desktop Nav */}
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-4">
          {currentView && currentView !== 'home' && onNavigate && (
            <div className="flex items-center bg-gray-100/80 p-1 rounded-full mr-4">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => onNavigate(link.id)}
                  className={`px-5 py-2 rounded-full font-semibold text-sm transition-all duration-200 ${
                    currentView === link.id 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  {link.name}
                </button>
              ))}
            </div>
          )}
          <a
            href="mailto:info@westromgroup.com"
            className="flex items-center gap-2 text-primary font-bold hover:text-primary-container transition-colors bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-full"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">info@westromgroup.com</span>
            <span className="sm:hidden">Email Us</span>
          </a>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          ref={toggleButtonRef}
          className="md:hidden flex items-center justify-center text-gray-500 hover:text-primary bg-gray-50 rounded-full min-h-[44px] min-w-[44px]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {isMobileMenuOpen && (
        <div ref={drawerRef} className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-200 shadow-xl animate-in slide-in-from-top-2">
          <nav aria-label="Mobile navigation" className="flex flex-col px-6 py-6 gap-2">
            {currentView && currentView !== 'home' && onNavigate && (
              <div className="flex flex-col gap-2 mb-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Workspaces</div>
                {navLinks.map((link) => (
                  <button
                    key={link.name}
                    className={`text-left font-semibold text-lg py-3 px-4 rounded-xl transition-colors ${
                      currentView === link.id 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      onNavigate(link.id);
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    {link.name}
                  </button>
                ))}
              </div>
            )}
            <div className="h-px bg-gray-100 my-2"></div>
            <a
              href="mailto:info@westromgroup.com"
              className="flex items-center justify-center gap-2 bg-primary text-white font-bold text-lg py-4 rounded-xl mt-2"
            >
              <Mail className="w-5 h-5" />
              <span>Email Us</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
