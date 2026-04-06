import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { CTABanner } from './components/CTABanner';
import { ResourceCard } from './components/ResourceCard';
import { VideoEmbed } from './components/VideoEmbed';
import { InsuranceSection } from './components/InsuranceSection';
import { AnalysisSection } from './components/AnalysisSection';
import { ArrowRight, FileText, Users } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

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
  { name: 'Texas Comptroller', url: 'https://comptroller.texas.gov/taxes/property-tax/', description: 'State property tax resources and forms' },
];

const PROTEST_COMPANIES = [
  { name: 'Texas Tax Protest', phone: '800-555-0101', website: 'https://example.com' },
  { name: 'Ownwell', phone: '800-555-0102', website: 'https://example.com' },
  { name: 'O\'Connor & Associates', phone: '800-555-0103', website: 'https://example.com' },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary to-primary-container text-white py-20 px-6">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="font-heading font-extrabold text-4xl md:text-5xl lg:text-6xl mb-6 tracking-tight">
              Westrom Owner Advisory Hub
            </h1>
            <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto mb-10">
              Self-service resources to help you optimize your rental property taxes and insurance. Maximize your ROI with expert guidance.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#protest-options" className="bg-secondary hover:bg-secondary-container text-white font-semibold py-3 px-8 rounded-md transition-colors w-full sm:w-auto text-center">
                Start Tax Protest
              </a>
              <a href="#resources" className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-8 rounded-md backdrop-blur-sm transition-colors w-full sm:w-auto text-center">
                View Resources
              </a>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 py-12">
          
          <div id="taxes" className="scroll-mt-24">
            {/* 20% Rule Callout */}
            <CTABanner />

            {/* Video Section */}
            <section id="video" className="mb-20">
              <div className="mb-8">
                <h2 className="font-heading font-bold text-3xl text-primary mb-4">Tax Protest Walkthrough</h2>
                <p className="text-on-surface-variant text-lg">
                  Watch our step-by-step guide on how to successfully protest your property taxes in Texas.
                </p>
              </div>
              <VideoEmbed title="Tax Protest Walkthrough" url="https://www.youtube.com/embed/tt21f_mheH8" />
            </section>

            {/* Protest Options */}
            <section id="protest-options" className="mb-20 scroll-mt-24">
              <div className="mb-8 text-center max-w-3xl mx-auto">
                <h2 className="font-heading font-bold text-3xl text-primary mb-4">Your Protest Options</h2>
                <p className="text-on-surface-variant text-lg">
                  You have 30 days from receiving your notice (or until May 15th) to file a protest. Choose the path that works best for you.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* DIY Path */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6 text-primary">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-primary mb-4">Do It Yourself</h3>
                  <p className="text-on-surface-variant mb-6 flex-grow">
                    File directly through your county's appraisal district website. It's free and can be done entirely online in most counties.
                  </p>
                  <ul className="space-y-3 mb-8 text-on-surface-variant">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
                      <span>Find your property on your county website</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
                      <span>Click "File a Protest" or similar option</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
                      <span>Submit evidence (comps, photos of repairs needed)</span>
                    </li>
                  </ul>
                  <a href="#counties" className="text-primary font-semibold flex items-center gap-2 hover:text-primary-container transition-colors">
                    Find your county link <ArrowRight className="w-4 h-4" />
                  </a>
                </div>

                {/* Pro Path */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-6 text-secondary">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-primary mb-4">Get Professional Help</h3>
                  <p className="text-on-surface-variant mb-6">
                    Hire a firm to handle the entire process. They typically charge a percentage of your tax savings (usually 30-50%), meaning no upfront cost.
                  </p>
                  <div className="space-y-4 mb-8 flex-grow">
                    <h4 className="font-semibold text-sm uppercase tracking-wider text-primary">Recommended Firms:</h4>
                    {PROTEST_COMPANIES.map((company) => (
                      <div key={company.name} className="bg-background p-4 rounded-lg border border-gray-100">
                        <div className="font-semibold text-primary mb-1">{company.name}</div>
                        <div className="flex items-center justify-between text-sm">
                          <a href={`tel:${company.phone}`} className="text-secondary hover:underline">{company.phone}</a>
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary">Visit Website</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* County Directory */}
            <section id="counties" className="mb-20 scroll-mt-24">
              <div className="mb-8">
                <h2 className="font-heading font-bold text-3xl text-primary mb-4">County Appraisal Districts</h2>
                <p className="text-on-surface-variant text-lg">
                  Quick links to file your protest or look up your property value.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {COUNTIES.map((county) => (
                  <ResourceCard key={county.name} title={county.name} url={county.url} description={county.description} type="county" />
                ))}
              </div>
              <div className="mt-8 bg-background p-6 rounded-xl border border-gray-200 text-center">
                <p className="text-on-surface-variant">
                  Don't see your county? Contact Westrom at <a href="tel:817-445-1108" className="text-primary font-semibold hover:underline">(817) 445-1108</a>
                </p>
              </div>
            </section>

            {/* AI Tools & Resources */}
            <section id="resources" className="mb-20 scroll-mt-24">
              <div className="mb-8">
                <h2 className="font-heading font-bold text-3xl text-primary mb-4">Tools & Resources</h2>
                <p className="text-on-surface-variant text-lg">
                  Use these tools to gather evidence for your tax protest.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {AI_TOOLS.map((tool) => (
                  <ResourceCard key={tool.name} title={tool.name} url={tool.url} description={tool.description} type="tool" />
                ))}
              </div>
            </section>
          </div>

          <InsuranceSection />
          
          <AnalysisSection />

        </div>
      </main>

      <PublicFooter />
      <Analytics />
    </div>
  );
}
