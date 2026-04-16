import { InsuranceAnalysis } from './InsuranceAnalysis';
import { Shield, FileWarning, TrendingDown, Mail, Phone, Globe } from 'lucide-react';

export function InsuranceView() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Banner */}
      <div className="bg-slate-50 border-b border-gray-200 py-12 mb-12">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl text-primary mb-4 tracking-tight">Insurance Hub</h1>
          <p className="text-xl text-gray-600 max-w-2xl">Analyze your coverage, find gaps, and optimize your premiums.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-24">
        {/* Why Review — shown first so users understand the "why" before acting */}
        <section className="mb-12">
          <div className="mb-6">
            <h2 className="font-heading font-bold text-2xl text-primary mb-2 tracking-tight">Why Review Your Insurance Now?</h2>
            <p className="text-gray-600 max-w-3xl">
              Insurance markets are shifting rapidly. Ensure your investment is fully protected without overpaying.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
              <div className="w-10 h-10 bg-tertiary/10 rounded-xl flex items-center justify-center mb-4 text-tertiary">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-2">Coverage Gaps</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Many landlord policies lack crucial coverages like Loss of Rent or Water Backup. We help identify these hidden risks.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center mb-4 text-secondary">
                <FileWarning className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-2">Deductible Traps</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Percentage-based Wind/Hail deductibles can leave you with massive out-of-pocket costs during a storm.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-2">Premium Optimization</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                By structuring your policy correctly, you can often increase your protection while lowering your annual premium.
              </p>
            </div>
          </div>
        </section>

        {/* Insurance Analysis Tool */}
        <InsuranceAnalysis />

        <section id="brokers" className="mb-12">
          <div className="bg-gradient-to-br from-primary to-slate-800 text-white rounded-3xl p-10 md:p-12 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full -ml-32 -mb-32"></div>

            <div className="relative z-10">
              <div className="text-center mb-10">
                <h2 className="font-heading font-bold text-3xl md:text-4xl mb-4 tracking-tight">Need to Shop Your Policy?</h2>
                <p className="text-lg text-gray-200 max-w-2xl mx-auto leading-relaxed">
                  Here are two brokers we frequently work with. Feel free to reach out to them directly with your current quote to see if they can beat it.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Gracie Davis */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 text-left flex flex-col">
                  <h3 className="font-heading font-bold text-2xl text-white mb-1">Gracie Davis</h3>
                  <p className="text-amber-300 font-medium mb-4">Family First Insurance Agency</p>
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed flex-grow">
                    Family First is an independent, family-owned agency offering access to over 30 carriers. They focus on providing fast, friendly service from local Texas agents to ensure your investments are insured properly with the best options and coverage.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-200">
                      <Mail className="w-4 h-4 flex-shrink-0 text-amber-300" />
                      <span>gracie.davis@familyfirstinsurance.agency</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-200">
                      <Phone className="w-4 h-4 flex-shrink-0 text-amber-300" />
                      <span>Contact for phone number</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-200">
                      <Globe className="w-4 h-4 flex-shrink-0 text-amber-300" />
                      <span>Contact for website</span>
                    </div>
                  </div>
                </div>

                {/* Garret Nees */}
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 md:p-8 text-left flex flex-col">
                  <h3 className="font-heading font-bold text-2xl text-white mb-1">Garret Nees</h3>
                  <p className="text-amber-300 font-medium mb-4">Farmers Insurance</p>
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed flex-grow">
                    As a dedicated Farmers Insurance agent, Garret specializes in helping property owners understand their coverage options. He works closely with investors to identify potential gaps and structure policies that protect their real estate portfolios effectively.
                  </p>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-200">
                      <Mail className="w-4 h-4 flex-shrink-0 text-amber-300" />
                      <span>gnees@farmersagent.com</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-200">
                      <Phone className="w-4 h-4 flex-shrink-0 text-amber-300" />
                      <span>Contact for phone number</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-200">
                      <Globe className="w-4 h-4 flex-shrink-0 text-amber-300" />
                      <a
                        href="https://agents.farmers.com/tx/n-richland-hills/garrett-nees/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors"
                      >
                        agents.farmers.com — Garret Nees
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black/20 rounded-xl p-5 border border-white/10 text-center">
                <p className="text-sm text-gray-300">
                  <strong>Disclaimer:</strong> Westrom Group has no official affiliation with these brokers and receives absolutely no kickbacks or compensation for these referrals. We are simply sharing contacts that we have worked with personally.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
