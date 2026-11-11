import type { ReactNode } from 'react';

interface JumpLink {
  label: string;
  href: string;
}

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  jumpLinks?: JumpLink[];
}

/**
 * Navy page header shared by the tool hubs. One h1 per page lives here; the
 * optional jump links double as an at-a-glance outline of the page.
 */
export function PageHero({ eyebrow, title, description, jumpLinks }: PageHeroProps) {
  return (
    <header className="relative overflow-hidden bg-primary text-white">
      {/* Fine grid texture: depth without decoration that competes with content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="container-page relative py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">{eyebrow}</p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">{description}</p>
        {jumpLinks && jumpLinks.length > 0 && (
          <nav aria-label="On this page" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {jumpLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-flex min-h-10 items-center rounded-full border border-white/20 px-4 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
