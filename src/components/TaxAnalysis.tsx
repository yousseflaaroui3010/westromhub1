import React, { useState, useRef } from 'react';
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

export function TaxAnalysis() {
  const [formData, setFormData] = useState<PropertyData>({
    address: '',
    zillowLink: '',
    currentValue: 0,
    priorValue: 0,
    zillowValue: undefined,
    realtorValue: undefined,
    county: COUNTIES[0].name,
  });
  
  const [isExtractingTax, setIsExtractingTax] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [taxResult, setTaxResult] = useState<AnalysisResult | null>(null);
  const [taxRecommendationHtml, setTaxRecommendationHtml] = useState<string>('');
  
  const [error, setError] = useState<string>('');
  
  const taxInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'address' || name === 'zillowLink' || name === 'county') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value.replace(/\D/g, ''), 10) : undefined }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const handleTaxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsExtractingTax(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const extractedData = await extractDataFromDocument(base64String, file.type);
        
        if (extractedData) {
          if (extractedData.error) {
            setError(extractedData.error);
          } else if (!extractedData.currentValue && !extractedData.priorValue) {
            setError('Could not find current or prior values in this document. Please verify it is a complete tax notice or enter manually.');
          } else {
            setFormData(prev => ({
              ...prev,
              address: extractedData.address || prev.address,
              currentValue: extractedData.currentValue || prev.currentValue,
              priorValue: extractedData.priorValue || prev.priorValue,
            }));
            setError('');
          }
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

    try {
      const tResult = runRuleEngine(formData);
      setTaxResult(tResult);
      const countyUrl = COUNTIES.find(c => c.name === formData.county)?.url || 'https://comptroller.texas.gov/taxes/property-tax/';
      const tRec = await generateTaxRecommendation(tResult, countyUrl);
      setTaxRecommendationHtml(DOMPurify.sanitize(tRec));
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section id="tax-analysis" className="mb-24">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h2 className="font-heading font-bold text-3xl text-primary mb-4 tracking-tight">Free Property Tax Analysis</h2>
        <p className="text-gray-600 text-lg">
          Enter your property details or upload your tax notice to get instant, AI-powered recommendations on protesting your taxes.
        </p>
      </div>

      <div className={`grid gap-8 ${taxResult ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
        {/* Form Column */}
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
          
          <div className="mb-10">
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${
                isDragging 
                  ? 'border-secondary bg-secondary/5 scale-[1.02]' 
                  : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => taxInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                ref={taxInputRef}
                onChange={handleTaxUpload}
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-2">
                  {isExtractingTax ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">Upload Tax Notice</h3>
                  <p className="text-gray-500">Drag and drop your PDF or image here</p>
                </div>
                <button 
                  type="button"
                  disabled={isExtractingTax}
                  className="mt-2 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-primary hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {isExtractingTax ? 'Extracting...' : 'Browse Files'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-10">
            <div className="h-px bg-gray-200 flex-grow"></div>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">OR ENTER MANUALLY</span>
            <div className="h-px bg-gray-200 flex-grow"></div>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Property Address</label>
              <input 
                type="text" 
                name="address" 
                value={formData.address || ''} 
                onChange={handleInputChange}
                placeholder="e.g. 123 Main St, Fort Worth, TX 76102"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">County</label>
                <select 
                  name="county" 
                  value={formData.county} 
                  onChange={handleInputChange}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none appearance-none"
                >
                  {COUNTIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Zillow Link (Opt)</label>
                <input 
                  type="url" 
                  name="zillowLink" 
                  value={formData.zillowLink || ''} 
                  onChange={handleInputChange}
                  placeholder="https://zillow.com/..."
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2026 Appraised Value *</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input 
                    type="text" 
                    name="currentValue" 
                    value={formData.currentValue || ''} 
                    onChange={handleInputChange}
                    placeholder="e.g. 450000"
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2025 Tax Value *</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input 
                    type="text" 
                    name="priorValue" 
                    value={formData.priorValue || ''} 
                    onChange={handleInputChange}
                    placeholder="e.g. 350000"
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Zillow Est. (Opt)</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input 
                    type="text" 
                    name="zillowValue" 
                    value={formData.zillowValue || ''} 
                    onChange={handleInputChange}
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Realtor Est. (Opt)</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input 
                    type="text" 
                    name="realtorValue" 
                    value={formData.realtorValue || ''} 
                    onChange={handleInputChange}
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isAnalyzing}
              className="w-full py-4 mt-4 bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing Property...</>
              ) : (
                'Get Free Analysis'
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-6 max-w-md mx-auto">
              This is informational only and not professional tax or legal advice. Consult a tax professional for your specific situation.
            </p>
          </form>
        </div>

        {/* Results Column */}
        {taxResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className={`bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 ${
              taxResult.status === 'AUTOMATIC_REDUCTION' ? 'border-secondary' :
              taxResult.status === 'PROTEST_RECOMMENDED' ? 'border-amber-500' :
              taxResult.status === 'CONTACT_WESTROM' ? 'border-tertiary' :
              'border-teal-500'
            }`}>
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    taxResult.status === 'AUTOMATIC_REDUCTION' ? 'bg-secondary/10 text-secondary' :
                    taxResult.status === 'PROTEST_RECOMMENDED' ? 'bg-amber-100 text-amber-600' :
                    taxResult.status === 'CONTACT_WESTROM' ? 'bg-tertiary/10 text-tertiary' :
                    'bg-teal-50 text-teal-600'
                  }`}>
                    {taxResult.status === 'AUTOMATIC_REDUCTION' ? <AlertCircle className="w-7 h-7" /> :
                     taxResult.status === 'PROTEST_RECOMMENDED' ? <AlertCircle className="w-7 h-7" /> :
                     taxResult.status === 'CONTACT_WESTROM' ? <FileText className="w-7 h-7" /> :
                     <CheckCircle className="w-7 h-7" />}
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-gray-900 leading-tight">
                    {taxResult.status === 'AUTOMATIC_REDUCTION' ? 'Automatic Reduction Eligible' :
                     taxResult.status === 'PROTEST_RECOMMENDED' ? 'Protest Recommended' :
                     taxResult.status === 'CONTACT_WESTROM' ? 'Contact Westrom' :
                     'No Action Needed'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">YoY Increase</div>
                    <div className="font-heading font-bold text-3xl text-primary">{(taxResult.yoyIncreasePct * 100).toFixed(1)}%</div>
                  </div>
                  {taxResult.marketGapPct !== null && (
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Market Gap</div>
                      <div className="font-heading font-bold text-3xl text-primary">{(taxResult.marketGapPct * 100).toFixed(1)}%</div>
                    </div>
                  )}
                </div>

                <div className="prose prose-lg max-w-none text-gray-600 mb-8 prose-headings:font-heading prose-headings:text-gray-900 prose-a:text-secondary hover:prose-a:text-secondary-container" dangerouslySetInnerHTML={{ __html: taxRecommendationHtml }}></div>

                <div className="pt-8 border-t border-gray-100">
                  <a 
                    href={COUNTIES.find(c => c.name === formData.county)?.url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full py-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-primary font-bold rounded-xl transition-colors"
                  >
                    Visit {formData.county} Website
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
