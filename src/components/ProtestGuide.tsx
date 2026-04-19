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

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
      <div className="p-8 md:p-10">
        <h3 className="font-heading font-bold text-xl text-gray-900 mb-6">
          How to Protest Your Taxes (DIY)
        </h3>

        {/* Step 1 */}
        <div className="flex gap-4 mb-8">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-sm flex items-center justify-center">
            1
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">{DIY_STEPS[0].title}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{DIY_STEPS[0].body}</p>
            {county === 'Tarrant County' && (
              <a
                href="https://www.tad.org/content/forms/notice-of-protest.pdf?1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-secondary underline hover:opacity-80"
              >
                Download Tarrant Notice of Protest Form (PDF)
              </a>
            )}
            {county === 'Dallas County' && (
              <a
                href="https://www.dallascad.org/webForms/UFILEONLINE/UFILE_ONLINE_PROTEST_2026.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-secondary underline hover:opacity-80"
              >
                Dallas CAD: How to File Your Protest Online (Guide PDF)
              </a>
            )}
          </div>
        </div>

        {/* Walkthrough video */}
        <div className="mb-8 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-center text-gray-500 py-2.5 bg-gray-50 border-b border-gray-100">
            Watch: Full Protest Walkthrough
          </p>
          <VideoEmbed title="Message from John — Tax Protest Walkthrough" url="https://www.loom.com/embed/25d8f0f255b4435199f9a2ea61449f03" />
        </div>

        {/* Steps 2–5 */}
        <div className="space-y-5">
          {DIY_STEPS.slice(1).map(({ step, title, body }) => (
            <div key={step} className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-sm flex items-center justify-center">
                {step}
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{title}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
