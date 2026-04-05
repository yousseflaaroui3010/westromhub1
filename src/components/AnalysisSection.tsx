import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runRuleEngine, AnalysisResult, PropertyData } from '../lib/ruleEngine';
import { generateTaxRecommendation, extractDataFromDocument } from '../lib/ai';

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
    currentValue: 0,
    priorValue: 0,
    zillowValue: undefined,
    realtorValue: undefined,
    county: COUNTIES[0].name,
  });
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [recommendationHtml, setRecommendationHtml] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'county' ? value : (value ? parseInt(value.replace(/\D/g, ''), 10) : undefined)
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const extractedData = await extractDataFromDocument(base64String, file.type);
        
        if (extractedData) {
          setFormData(prev => ({
            ...prev,
            currentValue: extractedData.currentValue || prev.currentValue,
            priorValue: extractedData.priorValue || prev.priorValue,
          }));
        } else {
          setError('Could not extract data from the document. Please enter it manually.');
        }
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setError('An error occurred during file upload.');
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentValue || !formData.priorValue) {
      setError('Current and Prior values are required.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setResult(null);
    setRecommendationHtml('');

    try {
      // 1. Run deterministic rule engine
      const analysisResult = runRuleEngine(formData);
      setResult(analysisResult);

      // 2. Get county URL
      const countyUrl = COUNTIES.find(c => c.name === formData.county)?.url || 'https://comptroller.texas.gov/taxes/property-tax/';

      // 3. Generate LLM recommendation
      const recommendationText = await generateTaxRecommendation(analysisResult, countyUrl);
      
      // 4. Sanitize output
      const cleanHtml = DOMPurify.sanitize(recommendationText.replace(/\n/g, '<br/>'));
      setRecommendationHtml(cleanHtml);
      
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (val?: number) => val ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val) : '';

  return (
    <section id="analysis" className="mb-20 scroll-mt-24">
      <div className="mb-8">
        <h2 className="font-heading font-bold text-3xl text-primary mb-4">Free Tax Analysis</h2>
        <p className="text-on-surface-variant text-lg">
          Enter your property details or upload your tax notice to get an instant, AI-powered recommendation on whether you should protest.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form Column */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200">
          
          {/* PDF Upload */}
          <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-xl text-center hover:bg-gray-50 transition-colors">
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                {isExtracting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-medium text-primary">Upload Notice of Appraised Value</p>
                <p className="text-sm text-gray-500 mt-1">We'll automatically extract the numbers for you.</p>
              </div>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtracting}
                className="mt-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {isExtracting ? 'Extracting...' : 'Select File'}
              </button>
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

          <form onSubmit={handleSubmit} className="space-y-5">
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
        <div>
          {result ? (
            <div className={`bg-white rounded-xl shadow-[0_12px_32px_-4px_rgba(0,32,69,0.08)] overflow-hidden border-l-8 ${
              result.status === 'AUTOMATIC_REDUCTION' ? 'border-secondary' :
              result.status === 'PROTEST_RECOMMENDED' ? 'border-amber-500' :
              result.status === 'CONTACT_WESTROM' ? 'border-tertiary' :
              'border-teal-600'
            }`}>
              <div className="p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  {result.status === 'AUTOMATIC_REDUCTION' ? <AlertCircle className="w-8 h-8 text-secondary" /> :
                   result.status === 'PROTEST_RECOMMENDED' ? <AlertCircle className="w-8 h-8 text-amber-500" /> :
                   result.status === 'CONTACT_WESTROM' ? <FileText className="w-8 h-8 text-tertiary" /> :
                   <CheckCircle className="w-8 h-8 text-teal-600" />}
                  <h3 className="font-heading font-bold text-2xl text-primary">
                    {result.status === 'AUTOMATIC_REDUCTION' ? 'Automatic Reduction Eligible' :
                     result.status === 'PROTEST_RECOMMENDED' ? 'Protest Recommended' :
                     result.status === 'CONTACT_WESTROM' ? 'Contact Westrom' :
                     'No Action Needed'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-500">YoY Increase</div>
                    <div className="font-bold text-lg text-primary">{(result.yoyIncreasePct * 100).toFixed(1)}%</div>
                  </div>
                  {result.marketGapPct !== null && (
                    <div>
                      <div className="text-sm text-gray-500">Market Gap</div>
                      <div className="font-bold text-lg text-primary">{(result.marketGapPct * 100).toFixed(1)}%</div>
                    </div>
                  )}
                </div>

                <div className="prose prose-sm max-w-none text-on-surface-variant mb-6" dangerouslySetInnerHTML={{ __html: recommendationHtml }}></div>

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
          ) : (
            <div className="h-full bg-gray-50 rounded-xl border border-gray-200 border-dashed flex flex-col items-center justify-center p-8 text-center text-gray-400 min-h-[400px]">
              <FileText className="w-16 h-16 mb-4 opacity-20" />
              <p>Fill out the form or upload your notice to see your analysis results here.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
