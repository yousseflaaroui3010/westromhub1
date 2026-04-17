import { Calculator, ShieldCheck, ArrowRight } from 'lucide-react';

interface HomeViewProps {
  onNavigate: (view: 'taxes' | 'insurance') => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  return (
    <div className="flex-grow flex flex-col animate-in fade-in zoom-in-95 duration-700">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-primary to-slate-800 text-white py-8 md:py-12 px-6 flex-grow flex flex-col justify-center relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-white/5 blur-[120px]"></div>
          <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px]"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center w-full relative z-10">
          <h1 className="font-heading font-extrabold text-3xl md:text-4xl lg:text-5xl mb-2 tracking-tight leading-tight drop-shadow-sm">
            Tools to Protect and Maximize Your Investment
          </h1>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 md:p-5 mb-6 border border-white/10 shadow-xl max-w-3xl mx-auto flex flex-col items-center">
            <p className="text-base md:text-lg text-gray-100 font-medium leading-relaxed text-center mb-3">
              Access expert resources and AI-driven analysis to optimize your rental property taxes and insurance.
            </p>
            <div className="inline-flex items-center gap-2 bg-amber-300/15 border border-amber-300/30 rounded-full px-3 py-1 text-xs md:text-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
              </span>
              <span className="text-white">
                This season's focus: <strong className="text-amber-300 font-bold">proactively protest your tax values and shop your insurance.</strong>
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-4 text-white/90 tracking-wide uppercase text-sm">Choose your path to get started</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Taxes Pathway */}
            <button 
              onClick={() => onNavigate('taxes')}
              aria-label="Enter Property Tax Hub"
              aria-describedby="tax-card-desc"
              className="group bg-white rounded-3xl p-10 text-left transition-all duration-300 hover:-translate-y-2 motion-reduce:hover:translate-y-0 hover:shadow-2xl border-2 border-transparent hover:border-secondary flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100"></div>
              <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center mb-8 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                <Calculator className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-bold text-3xl text-gray-900 mb-4">Property Taxes</h3>
              <p id="tax-card-desc" className="text-gray-600 text-lg flex-grow leading-relaxed">
                Review your appraisal notice, learn how to protest, and use our AI tool to see if you qualify for an automatic reduction.
              </p>
              <div className="mt-8 text-secondary font-bold flex items-center gap-2 group-hover:gap-4 transition-all text-lg">
                Enter Tax Hub <ArrowRight className="w-5 h-5" />
              </div>
            </button>

            {/* Insurance Pathway */}
            <button 
              onClick={() => onNavigate('insurance')}
              aria-label="Enter Insurance Hub"
              aria-describedby="insurance-card-desc"
              className="group bg-white rounded-3xl p-10 text-left transition-all duration-300 hover:-translate-y-2 motion-reduce:hover:translate-y-0 hover:shadow-2xl border-2 border-transparent hover:border-tertiary flex flex-col h-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 motion-reduce:group-hover:scale-100"></div>
              <div className="w-16 h-16 bg-tertiary/10 rounded-2xl flex items-center justify-center mb-8 text-tertiary group-hover:bg-tertiary group-hover:text-white transition-colors duration-300 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-bold text-3xl text-gray-900 mb-4">Insurance</h3>
              <p id="insurance-card-desc" className="text-gray-600 text-lg flex-grow leading-relaxed">
                Analyze your declaration page to find dangerous coverage gaps and optimize your premiums before renewal.
              </p>
              <div className="mt-8 text-tertiary font-bold flex items-center gap-2 group-hover:gap-4 transition-all text-lg">
                Enter Insurance Hub <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
