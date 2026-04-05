import { useState } from 'react';
import { ChevronDown, ShieldAlert, ShieldCheck, FileWarning, ExternalLink } from 'lucide-react';

interface AccordionItemProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
}

function AccordionItem({ title, icon, children, isOpen, onClick }: AccordionItemProps) {
  return (
    <div className="border border-gray-200 rounded-xl mb-4 overflow-hidden bg-white shadow-sm">
      <button
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="text-tertiary">{icon}</div>
          <h3 className="font-heading font-semibold text-lg text-primary">{title}</h3>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div 
        className={`transition-all duration-200 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}

export function InsuranceSection() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'policy-types': true,
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="insurance" className="mb-20 scroll-mt-24">
      <div className="mb-8">
        <h2 className="font-heading font-bold text-3xl text-primary mb-4">Insurance Optimization</h2>
        <p className="text-on-surface-variant text-lg">
          Protect your investment and optimize your premiums with our expert insurance guidance.
        </p>
      </div>

      <div className="max-w-4xl">
        <AccordionItem
          title="Policy Checker: Are You Covered?"
          icon={<ShieldAlert className="w-6 h-6" />}
          isOpen={!!openSections['policy-types']}
          onClick={() => toggleSection('policy-types')}
        >
          <div className="space-y-6">
            <div className="bg-secondary/10 border-l-4 border-secondary p-4 rounded-r-lg">
              <h4 className="font-bold text-secondary mb-2 flex items-center gap-2">
                <FileWarning className="w-5 h-5" /> WARNING: HO-3 Policies
              </h4>
              <p className="text-on-surface-variant text-sm">
                If your rental is on a standard Homeowners (HO-3) policy, you may have <strong>NO coverage</strong>. HO-3 excludes rental activity. Misclassification can lead to claim denial.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-heading font-semibold text-primary">Landlord Policy Types (DP)</h4>
              
              <div className="grid gap-4">
                <div className="border border-gray-200 p-4 rounded-lg">
                  <div className="font-bold text-primary mb-1">DP-1 (Basic)</div>
                  <p className="text-sm text-on-surface-variant mb-2">Named perils only, ACV settlement (depreciated payouts). Use with extreme caution.</p>
                  <p className="text-xs text-gray-500">Example: A 10-year-old roof destroyed by hail pays only remaining useful life.</p>
                </div>
                
                <div className="border border-gray-200 p-4 rounded-lg">
                  <div className="font-bold text-primary mb-1">DP-2 (Broad)</div>
                  <p className="text-sm text-on-surface-variant">~18 perils including wind/hail/water. RCV settlement (full replacement). Mid-market option.</p>
                </div>

                <div className="border-2 border-tertiary bg-tertiary/5 p-4 rounded-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-tertiary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
                  <div className="font-bold text-tertiary mb-1">DP-3 (Special)</div>
                  <p className="text-sm text-on-surface-variant">Open perils (covers everything not excluded). RCV settlement. <strong>The Gold Standard for Texas SFR investors.</strong></p>
                </div>
              </div>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Insurance Education & Coverage Gaps"
          icon={<ShieldCheck className="w-6 h-6" />}
          isOpen={!!openSections['education']}
          onClick={() => toggleSection('education')}
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-heading font-semibold text-primary mb-2">Deductible Optimization</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-on-surface-variant">
                <li><strong>2026 Shift:</strong> Flat-rate deductibles ($1k-$2.5k) are being replaced by percentage-based.</li>
                <li><strong>1% Wind/Hail:</strong> New standard for inland properties ($300K home = $3,000 out-of-pocket).</li>
                <li><strong>2% Wind/Hail:</strong> Standard for West Texas and storm-prone areas ($300K home = $6,000).</li>
                <li>Raising AOP (All Other Perils) deductible to $2,500-$5,000 can reduce premiums 15-25%.</li>
                <li><em>Warning:</em> Filing even small claims in Texas can lead to premium surcharges of 20%+.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-primary mb-2">Common Coverage Gaps</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-primary text-sm mb-1">Loss of Rental Income</div>
                  <p className="text-xs text-on-surface-variant">Default is 6 months. Recommend 12-month endorsement due to contractor/material shortages.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-semibold text-primary text-sm mb-1">Ordinance or Law</div>
                  <p className="text-xs text-on-surface-variant">Older properties may require bringing the entire structure to modern codes during repair. Standard policies only pay to repair as-is.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg sm:col-span-2">
                  <div className="font-semibold text-primary text-sm mb-1">Sewer & Drain Backup</div>
                  <p className="text-xs text-on-surface-variant">Excluded by default. Specific endorsement needed. Highly recommended given Texas water claim frequency.</p>
                </div>
              </div>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem
          title="Recommended Brokers & Tools"
          icon={<ExternalLink className="w-6 h-6" />}
          isOpen={!!openSections['brokers']}
          onClick={() => toggleSection('brokers')}
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-heading font-semibold text-primary mb-3">Recommended Brokers</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="border border-gray-200 p-4 rounded-lg">
                  <div className="font-bold text-primary">Gracie Davis</div>
                  <div className="text-sm text-on-surface-variant mb-2">Family First Insurance</div>
                  <a href="mailto:gracie.davis@familyfirstinsurance.agency?subject=Insurance Quote -- Westrom Owner" className="text-secondary hover:underline text-sm font-medium">Email Gracie</a>
                  <p className="text-xs text-gray-500 mt-2 italic">Mention you're with Westrom and email your current quote.</p>
                </div>
                <div className="border border-gray-200 p-4 rounded-lg">
                  <div className="font-bold text-primary">Garrett Nees</div>
                  <div className="text-sm text-on-surface-variant mb-2">Farmers Insurance</div>
                  <a href="mailto:gnees@farmersagent.com?subject=Insurance Quote -- Westrom Owner" className="text-secondary hover:underline text-sm font-medium">Email Garrett</a>
                  <p className="text-xs text-gray-500 mt-2 italic">Farmers broker, handles Westrom rentals.</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-heading font-semibold text-primary mb-3">External Tools</h4>
              <ul className="space-y-3">
                <li>
                  <a href="https://www.helpinsure.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline flex items-center gap-1">
                    HelpInsure.com <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-sm text-on-surface-variant">Official Texas state resource (TDI). Compare rates from top 25 insurance groups.</p>
                </li>
                <li>
                  <a href="https://www.steadily.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline flex items-center gap-1">
                    Steadily <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-sm text-on-surface-variant">Dedicated landlord insurance, instant estimates, specializes in Texas investors.</p>
                </li>
              </ul>
            </div>
          </div>
        </AccordionItem>
      </div>
    </section>
  );
}
