import React, { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText, ShieldAlert, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runRuleEngine, AnalysisResult, PropertyData, runInsuranceRuleEngine, InsuranceAnalysisResult, InsuranceData } from '../lib/ruleEngine';
import { generateTaxRecommendation, extractDataFromDocument, extractInsuranceData, generateInsuranceRecommendation } from '../lib/ai';

const COUNTIES = [
  { name: 'Tarrant County', url: 'https://www.tad.org' },
  { name: 'Dallas County', url: 'https://www.dallascad.org' },
  { name: 'Johnson County', url: 'https://www.johnsoncad.com' },
  { name: 'Denton County', url: 'https://www.dentoncad.com' },
  { name: 'Parker County', url: 'https://www.parkercad.org' },
  { name: 'Ellis County', url: 'https://www.elliscad.com' },
];

export function AnalysisSection() {
  const [formData, setFormData] = useState<PropertyData>({
    address: '',
    zillowLink: '',
    currentValue: 0,
    priorValue: 0,
    zillowValue: undefined,
    realtorValue: undefined,
    county: COUNTIES[0].name,
  });
  
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);

  const [isExtractingTax, setIsExtractingTax] = useState(false);
  const [isExtractingIns, setIsExtractingIns] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [taxResult, setTaxResult] = useState<AnalysisResult | null>(null);
  const [taxRecommendationHtml, setTaxRecommendationHtml] = useState<string>('');
  
  const [insResult, setInsResult] = useState<InsuranceAnalysisResult | null>(null);
  const [insRecommendationHtml, setInsRecommendationHtml] = useState<string>('');

  const [error, setError] = useState<string>('');
  
  const taxInputRef = useRef<HTMLInputElement>(null);
  const insInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'address' || name === 'zillowLink' || name === 'county') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value.replace(/\D/g, ''), 10) : undefined }));
    }
  };

  const handleTaxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingTax(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const extractedData = await extractDataFromDocument(base64String, file.type);
        
        if (extractedData) {
          setFormData(prev => ({
            ...prev,
            address: extractedData.address || prev.address,
            currentValue: extractedData.currentValue || prev.currentValue,
            priorValue: extractedData.priorValue || prev.priorValue,
          }));
        } else {
          setError('Could not extract data from the tax document. Please enter it manually.');
        }
        setIsExtractingTax(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError('An error occurred during tax file upload.');
      setIsExtractingTax(false);
    }
  };

  const handleInsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtractingIns(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const extractedData = await extractInsuranceData(base64String, file.type);
        
        if (extractedData) {
          setInsuranceData(extractedData);
        } else {
          setError('Could not extract data from the insurance document.');
        }
        setIsExtractingIns(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError('An error occurred during insurance file upload.');
      setIsExtractingIns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentValue || !formData.priorValue) {
      setError('Current and Prior values are required for tax analysis.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setTaxResult(null);
    setTaxRecommendationHtml('');
    setInsResult(null);
    setInsRecommendationHtml('');

    try {
      // --- TAX ANALYSIS ---
      const tResult = runRuleEngine(formData);
      setTaxResult(tResult);
      const countyUrl = COUNTIES.find(c => c.name === formData.county)?.url || 'https://comptroller.texas.gov/taxes/property-tax/';
      const tRec = await generateTaxRecommendation(tResult, countyUrl);
      setTaxRecommendationHtml(DOMPurify.sanitize(tRec.replace(/\n/g, '<br/>')));

      // --- INSURANCE ANALYSIS ---
      if (insuranceData) {
        const iResult = runInsuranceRuleEngine(insuranceData);
        setInsResult(iResult);
        const iRec = await generateInsuranceRecommendation(iResult);
        setInsRecommendationHtml(DOMPurify.sanitize(iRec.replace(/\n/g, '<br/>')));
      }
      
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasResults = taxResult || insResult;

  return (
    <section id="analysis" className="mb-20 scroll-mt-24">
      <div className="mb-8">
        <h2 className="font-heading font-bold text-3xl text-primary mb-4">Free Property Analysis</h2>
        <p className="text-on-surface-variant text-lg">
          Enter your property details, upload your tax notice, and upload your insurance declaration page to get instant, AI-powered recommendations on protesting taxes and closing insurance gaps.
        </p>
      </div>

      <div className={`grid gap-8 ${hasResults ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
        {/* Form Column */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Tax PDF Upload */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center hover:bg-gray-50 transition-colors">
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                ref={taxInputRef}
                onChange={handleTaxUpload}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  {isExtractingTax ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-primary text-sm">Upload Tax Notice</p>
                </div>
                <button 
                  type="button"
                  onClick={() => taxInputRef.current?.click()}
                  disabled={isExtractingTax}
                  className="mt-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {isExtractingTax ? 'Extracting...' : 'Select File'}
                </button>
              </div>
            </div>

            {/* Insurance PDF Upload */}
            <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center hover:bg-gray-50 transition-colors">
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                ref={insInputRef}
                onChange={handleInsUpload}
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary">
                  {isExtractingIns ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-tertiary text-sm">Upload Insurance Dec Page</p>
                </div>
                <button 
                  type="button"
                  onClick={() => insInputRef.current?.click()}
                  disabled={isExtractingIns}
                  className="mt-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  {isExtractingIns ? 'Extracting...' : 'Select File'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="h-px bg-gray-200 flex-grow"></div>
            <span className="text-sm text-gray-400 font-medium uppercase tracking-wider">OR ENTER MANUALLY</span>
            <div className="h-px bg-gray-200 flex-grow"></div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-start gap-3 text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {insuranceData && (
            <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-lg flex items-start gap-3 text-teal-800">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Insurance Data Extracted Successfully</p>
                <p className="text-xs mt-1">Policy: {insuranceData.policyType || 'Unknown'} | Premium: ${insuranceData.annualPremium || 'Unknown'}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-1">Property Address</label>
              <input 
                type="text" 
                name="address" 
                value={formData.address || ''} 
                onChange={handleInputChange}
                placeholder="e.g. 123 Main St, Fort Worth, TX 76102"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-1">County</label>
                <select 
                  name="county" 
                  value={formData.county} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                >
                  {COUNTIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-1">Zillow Link (Opt)</label>
                <input 
                  type="url" 
                  name="zillowLink" 
                  value={formData.zillowLink || ''} 
                  onChange={handleInputChange}
                  placeholder="https://zillow.com/..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-1">Current Value *</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input 
                    type="text" 
                    name="currentValue" 
                    value={formData.currentValue || ''} 
                    onChange={handleInputChange}
                    placeholder="e.g. 450000"
                    className="w-full p-3 pl-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-1">Prior Value *</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input 
                    type="text" 
                    name="priorValue" 
                    value={formData.priorValue || ''} 
                    onChange={handleInputChange}
                    placeholder="e.g. 350000"
                    className="w-full p-3 pl-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-1">Zillow Est. (Opt)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input 
                    type="text" 
                    name="zillowValue" 
                    value={formData.zillowValue || ''} 
                    onChange={handleInputChange}
                    className="w-full p-3 pl-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-primary uppercase tracking-wider mb-1">Realtor Est. (Opt)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input 
                    type="text" 
                    name="realtorValue" 
                    value={formData.realtorValue || ''} 
                    onChange={handleInputChange}
                    className="w-full p-3 pl-8 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isAnalyzing}
              className="w-full py-4 bg-primary hover:bg-primary-container text-white font-bold rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
              ) : (
                'Get Free Analysis'
              )}
            </button>
            <p className="text-xs text-center text-gray-500 mt-4">
              This is informational only and not professional tax or legal advice. Consult a tax professional for your specific situation.
            </p>
          </form>
        </div>

        {/* Results Column */}
        {hasResults && (
          <div className="space-y-6">
            {/* Tax Results */}
            {taxResult && (
              <div className={`bg-white rounded-xl shadow-[0_12px_32px_-4px_rgba(0,32,69,0.08)] overflow-hidden border-l-8 ${
                taxResult.status === 'AUTOMATIC_REDUCTION' ? 'border-secondary' :
                taxResult.status === 'PROTEST_RECOMMENDED' ? 'border-amber-500' :
                taxResult.status === 'CONTACT_WESTROM' ? 'border-tertiary' :
                'border-teal-600'
              }`}>
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    {taxResult.status === 'AUTOMATIC_REDUCTION' ? <AlertCircle className="w-8 h-8 text-secondary" /> :
                     taxResult.status === 'PROTEST_RECOMMENDED' ? <AlertCircle className="w-8 h-8 text-amber-500" /> :
                     taxResult.status === 'CONTACT_WESTROM' ? <FileText className="w-8 h-8 text-tertiary" /> :
                     <CheckCircle className="w-8 h-8 text-teal-600" />}
                    <h3 className="font-heading font-bold text-2xl text-primary">
                      {taxResult.status === 'AUTOMATIC_REDUCTION' ? 'Automatic Reduction Eligible' :
                       taxResult.status === 'PROTEST_RECOMMENDED' ? 'Protest Recommended' :
                       taxResult.status === 'CONTACT_WESTROM' ? 'Contact Westrom' :
                       'No Action Needed'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-500">YoY Increase</div>
                      <div className="font-bold text-lg text-primary">{(taxResult.yoyIncreasePct * 100).toFixed(1)}%</div>
                    </div>
                    {taxResult.marketGapPct !== null && (
                      <div>
                        <div className="text-sm text-gray-500">Market Gap</div>
                        <div className="font-bold text-lg text-primary">{(taxResult.marketGapPct * 100).toFixed(1)}%</div>
                      </div>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none text-on-surface-variant mb-6" dangerouslySetInnerHTML={{ __html: taxRecommendationHtml }}></div>

                  <div className="pt-6 border-t border-gray-100">
                    <a 
                      href={COUNTIES.find(c => c.name === formData.county)?.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-full py-3 bg-gray-100 hover:bg-gray-200 text-primary font-semibold rounded-md transition-colors"
                    >
                      Visit {formData.county} Website
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Insurance Results */}
            {insResult && (
              <div className={`bg-white rounded-xl shadow-[0_12px_32px_-4px_rgba(0,32,69,0.08)] overflow-hidden border-l-8 ${
                insResult.status === 'CRITICAL_WARNING' ? 'border-secondary' :
                insResult.status === 'UPGRADE_RECOMMENDED' ? 'border-amber-500' :
                insResult.status === 'OPTIMIZATION_POSSIBLE' ? 'border-tertiary' :
                'border-teal-600'
              }`}>
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    {insResult.status === 'CRITICAL_WARNING' ? <ShieldAlert className="w-8 h-8 text-secondary" /> :
                     insResult.status === 'UPGRADE_RECOMMENDED' ? <ShieldAlert className="w-8 h-8 text-amber-500" /> :
                     insResult.status === 'OPTIMIZATION_POSSIBLE' ? <ShieldCheck className="w-8 h-8 text-tertiary" /> :
                     <CheckCircle className="w-8 h-8 text-teal-600" />}
                    <h3 className="font-heading font-bold text-2xl text-primary">
                      {insResult.status === 'CRITICAL_WARNING' ? 'Critical Insurance Warning' :
                       insResult.status === 'UPGRADE_RECOMMENDED' ? 'Coverage Upgrade Recommended' :
                       insResult.status === 'OPTIMIZATION_POSSIBLE' ? 'Premium Optimization Possible' :
                       'Insurance Looks Good'}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-500">Policy Type</div>
                      <div className="font-bold text-lg text-primary">{insResult.data.policyType || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Wind/Hail Deductible</div>
                      <div className="font-bold text-lg text-primary">{insResult.data.windHailDeductible || 'Unknown'}</div>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none text-on-surface-variant mb-6" dangerouslySetInnerHTML={{ __html: insRecommendationHtml }}></div>

                  <div className="pt-6 border-t border-gray-100">
                    <a 
                      href="#insurance" 
                      className="inline-flex items-center justify-center w-full py-3 bg-gray-100 hover:bg-gray-200 text-primary font-semibold rounded-md transition-colors"
                    >
                      View Recommended Brokers
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}