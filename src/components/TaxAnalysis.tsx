import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runRuleEngine, type AnalysisResult, type PropertyData } from '../lib/ruleEngine';
import { generateTaxRecommendation, extractDataFromDocument, lookupProperty } from '../lib/ai';
import { COUNTIES, resolveCounty } from '../lib/constants';
import { useDocumentUpload } from '../hooks/useDocumentUpload';

function RecommendationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse mb-8" aria-label="Generating recommendation…" role="status">
      <div className="h-4 bg-gray-200 rounded-full w-full" />
      <div className="h-4 bg-gray-200 rounded-full w-11/12" />
      <div className="h-4 bg-gray-200 rounded-full w-10/12" />
      <div className="h-4 bg-gray-200 rounded-full w-full" />
      <div className="h-4 bg-gray-200 rounded-full w-8/12" />
      <div className="h-4 bg-gray-200 rounded-full w-9/12 mt-4" />
      <div className="h-4 bg-gray-200 rounded-full w-11/12" />
    </div>
  );
}

const DEFAULT_FORM: PropertyData = {
  address: '',
  zillowLink: '',
  currentValue: undefined,
  priorValue: undefined,
  zillowValue: undefined,
  realtorValue: undefined,
  county: '',
};

export function TaxAnalysis() {
  const [formData, setFormData] = useState<PropertyData>(DEFAULT_FORM);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [taxResult, setTaxResult] = useState<AnalysisResult | null>(null);
  const [recommendationHtml, setRecommendationHtml] = useState('');
  const [error, setError] = useState('');

  // Prior-year auto-fill state: 'idle' → 'searching' → 'found' | 'unavailable'
  type LookupState = 'idle' | 'searching' | 'found' | 'unavailable';
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lookupTaxYear, setLookupTaxYear] = useState<number | null>(null);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a ref so onFileProcessed can read current formData without a stale closure
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Debounced property lookup — triggers 800ms after address changes.
  // Only fires when address looks like a real street address (>15 chars, has a digit).
  // On success: auto-fills priorValue. On any failure: silently shows manual entry.
  useEffect(() => {
    const addr = formData.address ?? '';

    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

    if (addr.length < 15 || !/\d/.test(addr) || !formData.county) {
      setLookupState('idle');
      return;
    }

    let cancelled = false;
    setLookupState('searching');

    lookupTimeoutRef.current = setTimeout(() => {
      void lookupProperty(addr, formData.county).then(result => {
        if (cancelled) return;
        if (result !== null) {
          setFormData(prev => ({ ...prev, priorValue: result.priorValue }));
          setLookupTaxYear(result.taxYear);
          setLookupState('found');
        } else {
          setLookupTaxYear(null);
          setLookupState('unavailable');
        }
      });
    }, 800);

    return () => {
      cancelled = true;
      if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    };
  }, [formData.address, formData.county]);

  const runAnalysis = useCallback(async (data: PropertyData) => {
    if (!data.currentValue || !data.priorValue) return;
    setIsAnalyzing(true);
    setError('');
    setTaxResult(null);
    setRecommendationHtml('');
    try {
      const result = runRuleEngine(data);
      setTaxResult(result);
      const countyUrl =
        COUNTIES.find(c => c.name === data.county)?.url ??
        'https://comptroller.texas.gov/taxes/property-tax/';
      const rec = await generateTaxRecommendation(result, countyUrl);
      setRecommendationHtml(DOMPurify.sanitize(rec));
    } catch {
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const onFileProcessed = useCallback(async (base64: string, mimeType: string) => {
    setError('');
    const extracted = await extractDataFromDocument(base64, mimeType);
    if (!extracted) {
      setError('Could not extract data from the document. Please enter values manually.');
      return;
    }
    if (extracted.error) {
      setError(extracted.error);
      return;
    }
    if (!extracted.currentValue && !extracted.priorValue) {
      setError('Could not find appraised values. Please verify the document or enter manually.');
      return;
    }
    const newData: PropertyData = {
      ...formDataRef.current,
      address: extracted.address ?? formDataRef.current.address,
      // Map the AI-extracted county string to a canonical COUNTIES entry so the
      // correct portal URL and AI county rule are applied. Falls back to the
      // user's current selection when the document county is absent or unreadable.
      county: extracted.county
        ? resolveCounty(extracted.county)
        : formDataRef.current.county,
      currentValue: extracted.currentValue ?? formDataRef.current.currentValue,
      priorValue: extracted.priorValue ?? formDataRef.current.priorValue,
    };
    setFormData(newData);
    void runAnalysis(newData);
  }, [runAnalysis]);

  const { isExtracting, isDragging, setIsDragging, fileInputRef, handleFileChange, handleDrop } =
    useDocumentUpload({ isAnalyzing, onFileProcessed, onError: setError });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'address' || name === 'zillowLink' || name === 'county') {
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      const parsed = value ? parseInt(value.replace(/\D/g, ''), 10) : undefined;
      setFormData(prev => ({ ...prev, [name]: parsed }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.currentValue) {
      setError('Please enter the Current Appraised Value from your appraisal notice.');
      return;
    }
    void runAnalysis(formData);
  };

  const statusBorderColor = {
    AUTOMATIC_REDUCTION: 'border-secondary',
    PROTEST_RECOMMENDED: 'border-amber-500',
    CONTACT_WESTROM: 'border-tertiary',
    NO_ACTION: 'border-teal-500',
  } as const;

  const statusIconBg = {
    AUTOMATIC_REDUCTION: 'bg-secondary/10 text-secondary',
    PROTEST_RECOMMENDED: 'bg-amber-100 text-amber-600',
    CONTACT_WESTROM: 'bg-tertiary/10 text-tertiary',
    NO_ACTION: 'bg-teal-50 text-teal-600',
  } as const;

  const statusLabel = {
    AUTOMATIC_REDUCTION: 'Automatic Reduction Eligible',
    PROTEST_RECOMMENDED: 'Protest Recommended',
    CONTACT_WESTROM: 'Contact Westrom',
    NO_ACTION: 'No Action Needed',
  } as const;

  return (
    <section id="tax-analysis" className="mb-24">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h2 className="font-heading font-bold text-3xl text-primary mb-4 tracking-tight">
          Free Property Tax Analysis
        </h2>
        <p className="text-gray-600 text-lg">
          Enter your property details or upload your tax notice for AI-powered protest recommendations.
        </p>
      </div>

      <div className={`grid gap-8 ${taxResult ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
        {/* Input column */}
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
          {/* Upload zone */}
          <div className="mb-10">
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${
                isDragging
                  ? 'border-secondary bg-secondary/5 scale-[1.02]'
                  : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => { void handleDrop(e); }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label="Upload property tax notice"
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={e => { void handleFileChange(e); }}
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-2" aria-live="polite">
                  {isExtracting ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">Upload Tax Notice</h3>
                  <p className="text-gray-500">Drag and drop your PDF or image here</p>
                  <p className="text-xs text-gray-400 mt-1">PDF: page 1 only — ensure appraised values appear on the first page</p>
                </div>
                <button
                  type="button"
                  disabled={isExtracting}
                  className="mt-2 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-primary hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {isExtracting ? 'Extracting…' : 'Browse Files'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-10">
            <div className="h-px bg-gray-200 flex-grow" />
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">OR ENTER MANUALLY</span>
            <div className="h-px bg-gray-200 flex-grow" />
          </div>

          {error && (
            <div className="bg-red-50 text-red-900 p-4 rounded-xl mb-8 flex items-start gap-3 border border-red-100" aria-live="assertive">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={e => { void handleSubmit(e); }} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Property Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address ?? ''}
                onChange={handleInputChange}
                placeholder="e.g. 123 Main St, Fort Worth, TX 76102"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">County *</label>
                <select
                  name="county"
                  value={formData.county}
                  onChange={handleInputChange}
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none appearance-none"
                >
                  <option value="" disabled>Select a county…</option>
                  {COUNTIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Zillow Link (Opt)
                </label>
                <input
                  type="url"
                  name="zillowLink"
                  value={formData.zillowLink ?? ''}
                  onChange={handleInputChange}
                  placeholder="https://zillow.com/…"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Current Appraised Value *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    name="currentValue"
                    value={formData.currentValue ?? ''}
                    onChange={handleInputChange}
                    placeholder="From your 2026 notice"
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                  Prior Year Tax Value
                  {lookupState === 'searching' && (
                    <span className="flex items-center gap-1 text-gray-400 normal-case font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" /> Looking up…
                    </span>
                  )}
                  {lookupState === 'found' && (
                    <span className="flex items-center gap-1 text-green-600 normal-case font-normal">
                      <CheckCircle className="w-3 h-3" />
                      {lookupTaxYear ? `${lookupTaxYear} value found — verify with your notice` : 'Auto-filled — verify with your notice'}
                    </span>
                  )}
                  {lookupState === 'unavailable' && (
                    <span className="normal-case font-normal text-gray-400">Enter manually</span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    name="priorValue"
                    value={formData.priorValue ?? ''}
                    onChange={handleInputChange}
                    placeholder={lookupState === 'searching' ? 'Looking up…' : 'e.g. 350000'}
                    className={`w-full p-4 pl-8 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium border ${
                      lookupState === 'found'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Zillow Est. (Opt)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    name="zillowValue"
                    value={formData.zillowValue ?? ''}
                    onChange={handleInputChange}
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Realtor Est. (Opt)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    name="realtorValue"
                    value={formData.realtorValue ?? ''}
                    onChange={handleInputChange}
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isAnalyzing || isExtracting}
                className="flex-1 bg-primary text-white font-semibold py-3.5 px-6 rounded-xl hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-live="polite"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Analyzing Property…</>
                ) : (
                  'Get Free Analysis'
                )}
              </button>
              <p className="text-xs text-center text-gray-400 mt-6 max-w-md mx-auto">
                Informational only — not professional tax or legal advice.
              </p>
            </div>
          </form>
        </div>

        {/* Results column */}
        {taxResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className={`bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 ${statusBorderColor[taxResult.status]}`}>
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${statusIconBg[taxResult.status]}`}>
                    {taxResult.status === 'NO_ACTION' ? (
                      <CheckCircle className="w-7 h-7" />
                    ) : taxResult.status === 'CONTACT_WESTROM' ? (
                      <FileText className="w-7 h-7" />
                    ) : (
                      <AlertCircle className="w-7 h-7" />
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-gray-900 leading-tight">
                    {statusLabel[taxResult.status]}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">YoY Increase</div>
                    <div className="font-heading font-bold text-3xl text-primary">
                      {(taxResult.yoyIncreasePct * 100).toFixed(1)}%
                    </div>
                  </div>
                  {taxResult.marketGapPct !== null && (
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Market Gap</div>
                      <div className="font-heading font-bold text-3xl text-primary">
                        {(taxResult.marketGapPct * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* AI recommendation — skeleton while generating, content once ready */}
                {isAnalyzing ? (
                  <RecommendationSkeleton />
                ) : (
                  <div
                    className="text-gray-600 mb-8 text-base leading-relaxed
                      [&_strong]:font-semibold [&_strong]:text-gray-900
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-3
                      [&_li]:text-gray-700
                      [&_a]:text-secondary [&_a]:underline [&_a:hover]:text-secondary-container"
                    dangerouslySetInnerHTML={{ __html: recommendationHtml }}
                  />
                )}

                <div className="pt-8 border-t border-gray-100">
                  <a
                    href={COUNTIES.find(c => c.name === formData.county)?.url ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full py-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-primary font-bold rounded-xl transition-colors"
                  >
                    {formData.county === 'Other (Texas)'
                    ? 'Find Your County Appraisal District'
                    : `Visit ${formData.county} Website`}
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
