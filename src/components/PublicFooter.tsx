export function PublicFooter() {
  return (
    <footer className="bg-primary text-white py-12 mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="mb-4 inline-block rounded-xl bg-white px-3 py-2 shadow-sm">
              <img 
                src="/client-logo.png" 
                alt="Westrom Group Logo" 
                className="h-14 w-auto md:h-16"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-gray-300 text-sm max-w-xs">
              Professional property management serving Texas real estate investors.
            </p>
          </div>
          
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>Phone: <a href="tel:817-445-1108" className="hover:text-white transition-colors">(817) 445-1108</a></li>
              <li>Website: <a href="https://westromgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">westromgroup.com</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Affiliations</h3>
            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
              <span>NARPM</span>
              <span>•</span>
              <span>Realtor</span>
              <span>•</span>
              <span>Equal Housing</span>
              <span>•</span>
              <span>BBB Accredited</span>
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
