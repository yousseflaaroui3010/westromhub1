import type { AnalysisStatus } from '../lib/ruleEngine';
import { VideoEmbed } from './VideoEmbed';

const DIY_STEPS = [
  {
    step: 1,
    title: 'File a Notice of Protest',
    body: 'Fill out your county\'s Notice of Protest form and submit it to the Appraisal Review Board (ARB). The deadline is May 15 or 30 days after your notice was mailed — whichever is later.',
  },
  {
    step: 2,
    title: 'Gather Your Evidence',
    body: 'Collect recent comparable sales (comps) for similar nearby properties from sites like Zillow, Redfin, or HAR.com. Photos of property damage, deferred maintenance, or condition issues also count. A recent independent appraisal is the strongest evidence if you have one.',
  },
  {
    step: 3,
    title: 'Request an Informal Review',
    body: 'Most CADs offer a brief informal meeting with a staff appraiser before your formal hearing. Bring your evidence. Many reductions are settled here — no attorney or formal presentation required.',
  },
  {
    step: 4,
    title: 'Attend Your ARB Hearing',
    body: 'If the informal review doesn\'t resolve it, attend your Appraisal Review Board hearing (typically June–August). Present your evidence to a 3-person independent panel. The burden is on the CAD to justify their value — you only need to show yours is more reasonable.',
  },
  {
    step: 5,
    title: 'Further Appeal (If Needed)',
    body: 'If the ARB decision is still unsatisfactory, you may appeal to district court or binding arbitration (available for residential properties valued under $5M). Contact the Texas Comptroller\'s Office for guidance on the right path for your property.',
  },
] as const;


interface ProtestGuideProps {
  status: AnalysisStatus;
  county: string;
}

export function ProtestGuide({ status, county }: ProtestGuideProps) {
  if (status !== 'AUTOMATIC_REDUCTION' && status !== 'PROTEST_RECOMMENDED') return null;

  const formLink =
    county === 'Tarrant County'
      ? { href: 'https://www.tad.org/content/forms/notice-of-protest.pdf?1', label: 'Download the Tarrant Notice of Protest form (PDF)' }
      : county === 'Dallas County'
        ? { href: 'https://www.dallascad.org/webForms/UFILEONLINE/UFILE_ONLINE_PROTEST_2026.pdf', label: 'Dallas CAD: how to file your protest online (PDF)' }
        : null;

  return (
    <div className="card p-6 sm:p-8">
      <p className="eyebrow">Do it yourself</p>
      <h3 className="mt-2 font-heading text-xl font-bold text-ink">How to protest your taxes</h3>

      <ol className="mt-6 space-y-6">
        {DIY_STEPS.map(({ step, title, body }) => (
          <li key={step} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-white">
              {step}
            </span>
            <div>
              <p className="font-semibold text-ink">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{body}</p>
              {step === 1 && formLink && (
                <a href={formLink.href} target="_blank" rel="noopener noreferrer" className="text-link mt-2 inline-block text-sm">
                  {formLink.label}
                </a>
              )}
              {step === 1 && (
                <div className="mt-5 overflow-hidden rounded-xl border border-line">
                  <p className="border-b border-line bg-slate-50 py-2.5 text-center text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                    Watch: full protest walkthrough
                  </p>
                  <VideoEmbed title="Message from John: tax protest walkthrough" url="https://www.loom.com/embed/25d8f0f255b4435199f9a2ea61449f03" />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
