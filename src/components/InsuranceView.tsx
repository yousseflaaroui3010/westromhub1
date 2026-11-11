import { InsuranceAnalysis } from './InsuranceAnalysis';
import { PageHero } from './PageHero';
import { Shield, FileWarning, TrendingDown, Mail, Phone, Globe, Info } from 'lucide-react';
import type { ReactNode } from 'react';

const RISKS = [
  {
    icon: Shield,
    tone: 'bg-primary-soft text-primary',
    title: 'Coverage gaps',
    body: 'Many landlord policies lack crucial coverage like Loss of Rent or Water Backup. We help you spot these hidden risks.',
  },
  {
    icon: FileWarning,
    tone: 'bg-secondary-soft text-secondary',
    title: 'Deductible traps',
    body: 'Percentage-based wind/hail deductibles can leave you with large out-of-pocket costs after a storm.',
  },
  {
    icon: TrendingDown,
    tone: 'bg-success-soft text-success',
    title: 'Premium savings',
    body: 'Structured correctly, a policy can often give you more protection for a lower annual premium.',
  },
];

function WhyReview() {
  return (
    <aside className="card p-6 sm:p-8" aria-label="Why review your insurance now">
      <h3 className="font-heading text-lg font-bold text-ink">Why review your policy now</h3>
      <p className="mt-2 text-on-surface-variant">
        Insurance markets are shifting fast. Make sure your investment is protected without overpaying.
      </p>
      <ul className="mt-6 space-y-5">
        {RISKS.map((r) => (
          <li key={r.title} className="flex gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.tone}`}>
              <r.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-ink">{r.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function ContactLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-on-surface-variant">
      <span className="text-primary">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </li>
  );
}

export function InsuranceView() {
  return (
    <div>
      <PageHero
        eyebrow="Insurance hub"
        title="Make sure your rental is covered"
        description="Analyze your coverage, find gaps, and lower your premium before renewal."
        jumpLinks={[
          { label: 'Analyze my policy', href: '#insurance-analysis' },
          { label: 'Shop your policy', href: '#brokers' },
        ]}
      />

      <div className="container-page space-y-20 py-14 md:space-y-24 md:py-20">
        <InsuranceAnalysis aside={<WhyReview />} />

        <section id="brokers" aria-labelledby="brokers-title" className="scroll-mt-24">
          <div className="max-w-2xl">
            <p className="eyebrow">Shop your policy</p>
            <h2 id="brokers-title" className="section-title mt-3">Brokers we work with</h2>
            <p className="lead mt-3">
              Reach out to them directly with your current quote to see if they can beat it.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="card flex flex-col p-7">
              <h3 className="font-heading text-xl font-bold text-ink">Gracie Davis</h3>
              <p className="mt-1 font-semibold text-secondary">Family First Insurance Agency</p>
              <p className="mt-4 flex-grow leading-relaxed text-on-surface-variant">
                Family First is an independent, family-owned agency offering access to over 30 carriers. They focus on
                providing fast, friendly service from local Texas agents to ensure your investments are insured properly
                with the best options and coverage.
              </p>
              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                <ContactLine icon={<Mail className="h-4 w-4" aria-hidden="true" />}>
                  <a className="text-link" href="mailto:gracie.davis@familyfirstinsurance.agency">gracie.davis@familyfirstinsurance.agency</a>
                </ContactLine>
                <ContactLine icon={<Phone className="h-4 w-4" aria-hidden="true" />}>Contact for phone number</ContactLine>
                <ContactLine icon={<Globe className="h-4 w-4" aria-hidden="true" />}>Contact for website</ContactLine>
              </ul>
            </article>

            <article className="card flex flex-col p-7">
              <h3 className="font-heading text-xl font-bold text-ink">Garret Nees</h3>
              <p className="mt-1 font-semibold text-secondary">Farmers Insurance</p>
              <p className="mt-4 flex-grow leading-relaxed text-on-surface-variant">
                As a dedicated Farmers Insurance agent, Garret specializes in helping property owners understand their
                coverage options. He works closely with investors to identify potential gaps and structure policies that
                protect their real estate portfolios effectively.
              </p>
              <ul className="mt-6 space-y-2.5 border-t border-line pt-5">
                <ContactLine icon={<Mail className="h-4 w-4" aria-hidden="true" />}>
                  <a className="text-link" href="mailto:gnees@farmersagent.com">gnees@farmersagent.com</a>
                </ContactLine>
                <ContactLine icon={<Phone className="h-4 w-4" aria-hidden="true" />}>Contact for phone number</ContactLine>
                <ContactLine icon={<Globe className="h-4 w-4" aria-hidden="true" />}>
                  <a
                    className="text-link"
                    href="https://agents.farmers.com/tx/n-richland-hills/garrett-nees/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    agents.farmers.com: Garret Nees
                  </a>
                </ContactLine>
              </ul>
            </article>
          </div>

          <p className="mt-6 flex items-start gap-2.5 rounded-xl bg-primary-soft p-4 text-sm leading-relaxed text-primary">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Disclaimer:</strong> Westrom Group has no official affiliation with these brokers and receives
              absolutely no kickbacks or compensation for these referrals. We are simply sharing contacts that we have
              worked with personally.
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
