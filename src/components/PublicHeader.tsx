import { Menu, X, Phone } from 'lucide-react';
import { useState } from 'react';

export function PublicHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Taxes', href: '#taxes' },
    { name: 'Insurance', href: '#insurance' },
    { name: 'Analysis', href: '#analysis' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center shrink-0">
          <img 
            src="/logo.svg" 
            alt="Westrom Group Logo" 
            className="h-12 w-auto md:h-14"
            referrerPolicy="no-referrer"
          />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-on-surface-variant hover:text-primary font-medium transition-colors"
            >
              {link.name}
            </a>
          ))}
          <a
            href="tel:817-445-1108"
            className="flex items-center gap-2 text-primary font-semibold hover:text-primary-container transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span>(817) 445-1108</span>
          </a>
        </nav>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-on-surface-variant hover:text-primary"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Nav Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-200 shadow-lg">
          <nav className="flex flex-col px-6 py-4 gap-4">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-on-surface hover:text-primary font-medium text-lg py-2 border-b border-gray-100 last:border-0"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <a
              href="tel:817-445-1108"
              className="flex items-center gap-2 text-primary font-semibold text-lg py-2"
            >
              <Phone className="w-5 h-5" />
              <span>(817) 445-1108</span>
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
