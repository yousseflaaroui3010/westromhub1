import { ShieldCheck, Home, Award, Building, Star, Facebook, Twitter, Globe } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer aria-label="Site footer" className="bg-primary text-white py-12 mt-20 border-t-4 border-secondary shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4 inline-block">
              <img
                src="/westrom-logo.webp"
                alt="Westrom Group Logo"
                className="h-16 w-auto bg-white p-2 rounded-xl border border-gray-200 shadow-md"
              />
            </div>
            <p className="text-gray-300 text-sm max-w-xs">
              Professional property management serving Texas real estate investors.
            </p>
          </div>
          
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>Email: <a href="mailto:info@westromgroup.com" className="hover:text-white transition-colors">info@westromgroup.com</a></li>
              <li>Website: <a href="https://westromgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">westromgroup.com</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Affiliations & Social</h3>
            <div className="flex flex-wrap gap-3">
              <a href="https://www.narpm.org/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <Building className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                NARPM
              </a>
              <a href="https://www.nar.realtor/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <Award className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                REALTOR®
              </a>
              <a href="https://www.texasrealestate.com/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <Star className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                Texas Realtors
              </a>
              <a href="https://www.hud.gov/program_offices/fair_housing_equal_opp" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <Home className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                Equal Housing
              </a>
              <a href="https://www.bbb.org/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <ShieldCheck className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                BBB Accredited
              </a>
              <a href="https://www.facebook.com/westromgroup" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <Facebook className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                Facebook
              </a>
              <a href="https://x.com/WestromGroup" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <Twitter className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                X (Twitter)
              </a>
              <a href="https://www.zillow.com/profile/WestromGroup" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-primary-container/20 hover:bg-primary-container/40 border border-primary-container/30 rounded-lg text-xs font-medium text-gray-200 hover:text-white transition-all flex items-center gap-2 group">
                <Globe className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                Zillow
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-primary-container text-xs text-gray-400 space-y-4">
          <p>
            <strong>Disclaimer:</strong> This information is provided as a courtesy for educational and informational purposes only. It is not a substitute for professional tax, legal, or insurance advice. Westrom Group does not provide tax or legal advice, nor do we file protests or take action on behalf of owners. Please consult a qualified professional for your specific situation.
          </p>
          <p>
            © {new Date().getFullYear()} Westrom Group. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
