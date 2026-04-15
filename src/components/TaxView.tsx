import React from 'react';
import { VideoEmbed } from './VideoEmbed';
import { ResourceCard } from './ResourceCard';
import { TaxAnalysis } from './TaxAnalysis';
import { ArrowRight, FileText, Users, AlertTriangle } from 'lucide-react';

const COUNTIES = [
  { name: 'Tarrant County', url: 'https://www.tad.org', description: 'Tarrant Appraisal District' },
  { name: 'Dallas County', url: 'https://www.dallascad.org', description: 'Dallas Central Appraisal District' },
  { name: 'Johnson County', url: 'https://www.johnsoncad.com', description: 'Johnson County Appraisal District' },
  { name: 'Denton County', url: 'https://www.dentoncad.com', description: 'Denton Central Appraisal District' },
  { name: 'Parker County', url: 'https://www.parkercad.org', description: 'Parker County Appraisal District' },
  { name: 'Ellis County', url: 'https://www.elliscad.com', description: 'Ellis Appraisal District' },
];

const AI_TOOLS = [
  { name: 'Zillow Property Value', url: 'https://www.zillow.com', description: 'Check estimated market value (Zestimate)' },
  { name: 'Realtor.com Estimates', url: 'https://www.realtor.com', description: 'Compare market value estimates' },
];

const PROTEST_COMPANIES = [
  { name: 'Texas Tax Protest', phone: '800-555-0101', website: 'https://www.texastaxprotest.com/' },
  { name: 'Ownwell', phone: '800-555-0102', website: 'https://www.ownwell.com/' },
  { name: 'O\'Connor & Associates', phone: '800-555-0103', website: 'https://www.poconnor.com/' },
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 mb-16 flex flex-col md:flex-row items-start gap-6 shadow-sm">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-xl text-amber-900 mb-2">Hot Tip: The 20% Rule</h3>
            <p className="text-amber-800 leading-relaxed">
              In Texas, non-homestead properties (like rentals) are capped at a <strong>20% increase</strong> in appraised value year-over-year. If your notice shows an increase greater than 20%, you are legally entitled to an automatic reduction.
            </p>
          </div>
        </div>

        {/* Tax Analysis Tool */}
        <TaxAnalysis />

        {/* Protest Options */}
        <section id="protest-options" className="mb-24">
          <div className="mb-10 text-center max-w-3xl mx-auto">
            <h2 className="font-heading font-bold text-3xl text-primary mb-4 tracking-tight">Your Protest Options</h2>
            <p className="text-gray-600 text-lg">
              <strong>You have 30 days from receiving your notice</strong> (or until May 15th) to file a protest. Choose the path that works best for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* DIY Path */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-8 md:p-10 flex flex-col">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-8 text-primary">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-2xl text-primary mb-4">Do It Yourself</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                File directly through your county's appraisal district website. It's free and can be done entirely online in most counties.
              </p>
              <ul className="space-y-4 mb-8 text-gray-600">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary mt-2 flex-shrink-0" />
                  <span>Find your property on your county website</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary mt-2 flex-shrink-0" />
                  <span>Click "File a Protest" or similar option</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary mt-2 flex-shrink-0" />
                  <span>Submit evidence (comps, photos of repairs needed)</span>
                </li>
              </ul>
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-100 mb-8 flex-grow">
                <VideoEmbed title="Tax Protest Walkthrough" url="https://www.youtube.com/embed/tt21f_mheH8" />
              </div>
              <a href="#counties" className="text-primary font-bold flex items-center gap-2 hover:gap-4 transition-all mt-auto">
                Find your county link <ArrowRight className="w-5 h-5" />
              </a>
            </div>

            {/* Pro Path */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-8 md:p-10 flex flex-col">
              <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center mb-8 text-secondary">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-2xl text-primary mb-4">Get Professional Help</h3>
              <p className="text-gray-600 mb-8 leading-relaxed">
                Hire a firm to handle the entire process. They typically charge a percentage of your tax savings (usually 20 to 35%, though some firms charge a flat fee), meaning no upfront cost.
              </p>
              <div className="space-y-4 mb-8 flex-grow">
                <h4 className="font-bold text-xs uppercase tracking-widest text-gray-400 mb-4">Recommended Firms</h4>
                {PROTEST_COMPANIES.map((company) => (
                  <div key={company.name} className="bg-gray-50 p-5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="font-bold text-primary mb-2">{company.name}</div>
                    <div className="flex items-center justify-between text-sm">
                      <a href={`tel:${company.phone}`} className="text-secondary font-semibold hover:text-secondary-container">{company.phone}</a>
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-primary font-medium">Visit Website</a>
                    </div>
                  </div>
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
