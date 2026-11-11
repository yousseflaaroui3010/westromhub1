import { Link } from 'react-router-dom';

// SPA routes use <Link>; the static nginx pages (/analysis, /guarantees) use a
// plain <a> so they do a real navigation.
const TOOLS: { name: string; to: string; external: boolean }[] = [
  { name: 'Property taxes', to: '/taxes', external: false },
  { name: 'Insurance', to: '/insurance', external: false },
  { name: 'Rental analysis', to: '/analysis', external: true },
  { name: 'Guarantees', to: '/guarantees', external: true },
];

const AFFILIATIONS: { name: string; href: string }[] = [
  { name: 'NARPM', href: 'https://www.narpm.org/' },
  { name: 'REALTOR®', href: 'https://www.nar.realtor/' },
  { name: 'Texas Realtors', href: 'https://www.texasrealestate.com/' },
  { name: 'BBB Accredited', href: 'https://www.bbb.org/' },
  { name: 'Equal Housing', href: 'https://www.hud.gov/program_offices/fair_housing_equal_opp' },
];

const SOCIAL: { name: string; href: string }[] = [
  { name: 'Facebook', href: 'https://www.facebook.com/westromgroup' },
  { name: 'X (Twitter)', href: 'https://x.com/WestromGroup' },
  { name: 'Zillow', href: 'https://www.zillow.com/profile/WestromGroup' },
];

const linkCls = 'text-white/75 transition-colors hover:text-white';
const headCls = 'text-xs font-bold uppercase tracking-[0.14em] text-white/50';

export function PublicFooter() {
  return (
    <footer aria-label="Site footer" className="mt-auto bg-ink text-white">
      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            {/* The official westromgroup.com logo (same file as the header). Its
                lettering is black, so it sits on a white tile on the dark footer
                rather than being recolored. */}
            <div className="inline-flex rounded-xl bg-white px-4 py-3">
              <img
                src="/westrom-logo.webp"
                alt="Westrom Group, Real Estate & Property Management"
                width={2048}
                height={1186}
                loading="lazy"
                className="h-[4.5rem] w-auto"
              />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Family-owned property management for Dallas–Fort Worth rental owners.
            </p>
            <p className="mt-4 text-sm">
              <a href="mailto:info@westromgroup.com" className={linkCls}>info@westromgroup.com</a>
            </p>
            <p className="mt-1 text-sm">
              <a href="https://westromgroup.com" target="_blank" rel="noopener noreferrer" className={linkCls}>westromgroup.com</a>
            </p>
          </div>

          <nav aria-label="Footer tools">
            <h2 className={headCls}>Tools</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {TOOLS.map((l) => (
                <li key={l.name}>
                  {l.external ? <a href={l.to} className={linkCls}>{l.name}</a> : <Link to={l.to} className={linkCls}>{l.name}</Link>}
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className={headCls}>Affiliations</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {AFFILIATIONS.map((l) => (
                <li key={l.name}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{l.name}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={headCls}>Follow</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {SOCIAL.map((l) => (
                <li key={l.name}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>{l.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 text-xs leading-relaxed text-white/55">
          <p>
            <strong className="text-white/75">Disclaimer:</strong> This information is provided as a courtesy for
            educational and informational purposes only. It is not a substitute for professional tax, legal, or
            insurance advice. Westrom Group does not provide tax or legal advice, nor do we file protests or take action
            on behalf of owners. Please consult a qualified professional for your specific situation.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p>© {new Date().getFullYear()} Westrom Group. All rights reserved.</p>
            <Link to="/privacy" className={linkCls}>Privacy notice</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
