import { ResourceCard } from './ResourceCard';
import { TaxAnalysis } from './TaxAnalysis';
import { PageHero } from './PageHero';
import { ArrowRight, FileText, Users, Scale, ListChecks, Lock } from 'lucide-react';
import { COUNTIES } from '../lib/constants';

const EVIDENCE_TOOLS = [
  { name: 'Zillow', url: 'https://www.zillow.com', description: 'Check the estimated market value (Zestimate).' },
  { name: 'Realtor.com', url: 'https://www.realtor.com', description: 'Compare a second market value estimate.' },
];

const PROTEST_COMPANIES = [
  { name: 'Texas Tax Protest', website: 'https://www.texastaxprotest.com/' },
  { name: 'Ownwell', website: 'https://www.ownwell.com/' },
  { name: "O'Connor & Associates", website: 'https://www.poconnor.com/' },
];

function ToolGuidance() {
  return (
    <aside className="space-y-4" aria-label="Before you start">
      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
            <Scale className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="font-heading text-lg font-bold text-ink">The 20% rule</h3>
        </div>
        <p className="mt-4 leading-relaxed text-on-surface-variant">
          In Texas, the appraised value of a non-homestead property, like a rental, can rise by at most{' '}
          <strong className="text-ink">20% a year</strong>. If your notice shows a bigger jump, you are entitled to an
          automatic reduction.
        </p>
      </div>
      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <ListChecks className="h-5 w-5" aria-hidden="true" />
          </div>
          <h3 className="font-heading text-lg font-bold text-ink">What you&apos;ll need</h3>
        </div>
        <ul className="mt-4 space-y-2.5 text-on-surface-variant">
          <li className="flex gap-2"><span className="text-secondary" aria-hidden="true">•</span> Your {new Date().getFullYear()} Notice of Appraised Value (PDF or photo)</li>
          <li className="flex gap-2"><span className="text-secondary" aria-hidden="true">•</span> Or this year&apos;s and last year&apos;s appraised values</li>
          <li className="flex gap-2"><span className="text-secondary" aria-hidden="true">•</span> Optional: a Zillow or Realtor.com estimate</li>
        </ul>
        <p className="mt-5 flex items-start gap-2 border-t border-line pt-5 text-sm text-on-surface-variant">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          We don&apos;t store your documents. <a href="/privacy" className="text-link">Privacy notice</a>
        </p>
      </div>
    </aside>
  );
}

export function TaxView() {
  return (
    <div>
      <PageHero
        eyebrow="Property tax hub"
        title="Lower your property taxes"
        description="Check your appraisal notice, see whether to protest, and get everything you need to file."
        jumpLinks={[
          { label: 'Analyze my notice', href: '#tax-analysis' },
          { label: 'Protest options', href: '#protest-options' },
          { label: 'County websites', href: '#counties' },
        ]}
      />

      <div className="container-page space-y-20 py-14 md:space-y-24 md:py-20">
        <TaxAnalysis aside={<ToolGuidance />} />

        <section id="protest-options" aria-labelledby="protest-title" className="scroll-mt-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Next step</p>
            <h2 id="protest-title" className="section-title mt-3">Your protest options</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="card flex flex-col p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <FileText className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-xl font-bold text-ink">Do it yourself</h3>
              </div>
              <p className="mt-4 leading-relaxed text-on-surface-variant">
                Free and fully online in most counties. The analysis above gives you a step-by-step guide, then you file
                directly with your county&apos;s appraisal district.
              </p>
              <a href="#counties" className="mt-auto inline-flex items-center gap-2 pt-6 font-semibold text-primary transition-[gap] hover:gap-3">
                Find your county <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>

            <div className="card flex flex-col p-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-heading text-xl font-bold text-ink">Hire a protest firm</h3>
              </div>
              <p className="mt-4 leading-relaxed text-on-surface-variant">
                A firm handles everything, typically for 20–35% of your tax savings and only if they win. No upfront cost.
              </p>
              <ul className="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line">
                {PROTEST_COMPANIES.map((c) => (
                  <li key={c.name}>
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-12 items-center justify-between px-4 text-sm font-semibold text-ink transition-colors hover:bg-slate-50"
                    >
                      {c.name}
                      <ArrowRight className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="counties" aria-labelledby="counties-title" className="scroll-mt-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Look up or file</p>
            <h2 id="counties-title" className="section-title mt-3">County appraisal districts</h2>
            <p className="lead mt-3">Quick links to look up your value or file your protest.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COUNTIES.map((county) => (
              <ResourceCard key={county.name} title={county.name} url={county.url} description={county.description} />
            ))}
          </div>
          <p className="mt-6 text-on-surface-variant">
            Don&apos;t see your county? Email us at{' '}
            <a href="mailto:info@westromgroup.com" className="text-link">info@westromgroup.com</a>.
          </p>
        </section>

        <section id="resources" aria-labelledby="resources-title" className="scroll-mt-24">
          <div className="card flex flex-col gap-8 p-7 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="max-w-md">
              <p className="eyebrow">Build your case</p>
              <h2 id="resources-title" className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-ink">
                Gather market evidence
              </h2>
              <p className="mt-3 leading-relaxed text-on-surface-variant">
                Market estimates lower than your appraised value strengthen a protest. Compare at least two.
              </p>
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-2 md:max-w-lg">
              {EVIDENCE_TOOLS.map((t) => (
                <ResourceCard key={t.name} title={t.name} url={t.url} description={t.description} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
