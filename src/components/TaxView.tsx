import { ResourceCard } from './ResourceCard';
import { TaxAnalysis } from './TaxAnalysis';
import { ArrowRight, FileText, Users, AlertTriangle } from 'lucide-react';
import { COUNTIES } from '../lib/constants';

const AI_TOOLS = [
  { name: 'Zillow Property Value', url: 'https://www.zillow.com', description: 'Check estimated market value (Zestimate)' },
  { name: 'Realtor.com Estimates', url: 'https://www.realtor.com', description: 'Compare market value estimates' },
];

const PROTEST_COMPANIES = [
  { name: 'Texas Tax Protest', website: 'https://www.texastaxprotest.com/' },
  { name: 'Ownwell', website: 'https://www.ownwell.com/' },
  { name: 'O\'Connor & Associates', website: 'https://www.poconnor.com/' },
];

export function TaxView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Banner */}
      <div className="bg-slate-50 border-b border-gray-200 py-12 mb-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl text-primary mb-4 tracking-tight">Property Tax Hub</h1>
          <p className="text-xl text-gray-600 max-w-2xl">Everything you need to review, protest, and reduce your property taxes.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        {/* Hot Tip Card */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-10 flex items-start gap-3 shadow-sm">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-amber-600 mt-0.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong className="text-amber-900">Hot Tip: The 20% Rule</strong> — In Texas, non-homestead properties (like rentals) are capped at a <strong>20% increase</strong> in appraised value year-over-year. If your notice shows an increase greater than 20%, you are legally entitled to an automatic reduction.
          </p>
        </div>

        {/* Tax Analysis Tool */}
        <TaxAnalysis />

        {/* Protest Options */}
        <section id="protest-options" className="mb-24">
          <div className="mb-10 text-center max-w-3xl mx-auto">
            <h2 className="font-heading font-bold text-3xl text-primary mb-0 tracking-tight">Your Protest Options</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* DIY Path */}
            <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-xl text-primary">Do It Yourself</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Free and fully online in most counties. Use the analysis tool above to get a personalized step-by-step guide, then file directly through your county's appraisal district.
              </p>
              <a href="#counties" className="mt-auto text-primary font-semibold text-sm flex items-center gap-1.5 hover:gap-3 transition-all">
                Find your county <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Pro Path */}
            <div className="bg-white rounded-2xl border border-gray-200 p-7 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-secondary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-secondary">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-xl text-primary">Get Professional Help</h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                A firm handles everything for you — typically charging 20–35% of your tax savings only if they win. No upfront cost.
              </p>
              <div className="flex flex-col gap-2 mt-auto">
                {PROTEST_COMPANIES.map((company) => (
                  <a
                    key={company.name}
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-300 transition-colors text-sm"
                  >
                    <span className="font-medium text-gray-900">{company.name}</span>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* County Directory */}
        <section id="counties" className="mb-24">
          <div className="mb-10">
            <h2 className="font-heading font-bold text-3xl text-primary mb-4 tracking-tight">County Appraisal Districts</h2>
            <p className="text-gray-600 text-lg">
              Quick links to file your protest or look up your property value.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {COUNTIES.map((county) => (
              <ResourceCard key={county.name} title={county.name} url={county.url} description={county.description} type="county" />
            ))}
          </div>
          <div className="mt-10 bg-gray-50 p-8 rounded-2xl border border-gray-200 text-center">
            <p className="text-gray-600 text-lg">
              Don't see your county? Contact Westrom at <a href="mailto:info@westromgroup.com" className="text-primary font-bold hover:text-primary-container transition-colors">info@westromgroup.com</a>
            </p>
          </div>
        </section>

        {/* AI Tools & Resources */}
        <section id="resources" className="mb-12">
          <div className="mb-10 text-center max-w-3xl mx-auto">
            <h2 className="font-heading font-bold text-3xl text-primary mb-4 tracking-tight">Tools & Resources</h2>
            <p className="text-gray-600 text-lg">
              Use these tools to gather evidence for your tax protest.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {AI_TOOLS.map((tool) => (
              <ResourceCard key={tool.name} title={tool.name} url={tool.url} description={tool.description} type="tool" />
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
