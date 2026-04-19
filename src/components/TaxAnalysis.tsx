import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runRuleEngine, type AnalysisResult, type PropertyData } from '../lib/ruleEngine';
import { generateTaxRecommendation, extractDataFromDocument, lookupProperty } from '../lib/ai';
import { COUNTIES, resolveCounty } from '../lib/constants';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { ProtestGuide } from './ProtestGuide';
import { useScrollIntoViewOnFocus } from '../hooks/useScrollIntoViewOnFocus';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { getDeviceCapabilities } from '../hooks/useDeviceCapabilities';

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

const DIRECTIONALS = new Set(['N', 'S', 'E', 'W', 'NE', 'NW', 'SE', 'SW']);

function CountySteps({ county, searchUrl, countyLabel, houseNumber, streetName, addrHint, year }: {
  county: string; searchUrl: string; countyLabel: string;
  houseNumber: string | null; streetName: string | null;
  addrHint: string | null; year: number;
}) {
  const link = (
    <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-amber-800">
      {countyLabel}
    </a>
  );
  const hn  = houseNumber ? <strong>{houseNumber}</strong> : <>your house number</>;
  const sn  = streetName  ? <strong>{streetName.charAt(0).toUpperCase() + streetName.slice(1).toLowerCase()}</strong> : <>street name only</>;
  const up  = <>— upload it above and the AI will check your values automatically</>;

  if (county === 'Tarrant County') return (
    <>
      <li>Go to {link} and click <strong>Property Search</strong></li>
      <li>Enter your house number and street name: {addrHint ? <strong>{addrHint}</strong> : <em>&ldquo;7612 Dover&rdquo;</em>}</li>
      <li>Click <strong>Search</strong>, then click your property&apos;s <strong>Account #</strong> in the results</li>
      <li>Click the <strong>Documents</strong> tab, open the <strong>{year} Value Notice</strong> {up}</li>
    </>
  );

  if (county === 'Dallas County') return (
    <>
      <li>Go to {link} and open <strong>Property Search</strong></li>
      <li>In the <strong>House Number</strong> field enter: {hn}</li>
      <li>In the <strong>Street Name</strong> field enter: {sn} <em>(no Rd, St, Ave, etc.)</em></li>
      <li>Click <strong>Search</strong>, then click on your property in the results</li>
      <li>Click the <strong>Appraisal Notice</strong> link {up}</li>
    </>
  );

  if (county === 'Johnson County') return (
    <>
      <li>Go to {link}</li>
      <li>In the <strong>Street #</strong> field enter: {hn}</li>
      <li>In the <strong>Street Name</strong> field enter: {sn} <em>(no Rd, St, Ave, etc.)</em></li>
      <li>Click <strong>Search</strong>, then click your property&apos;s <strong>Account Number</strong></li>
      <li>Find the <strong>Appraisal Notice</strong> link {up}</li>
    </>
  );

  if (county === 'Denton County') return (
    <>
      <li>Go to {link}</li>
      <li>In the <strong>Property Address</strong> box, enter your full street address{addrHint ? <> (e.g. <em>{addrHint}</em>)</> : null}</li>
      <li>Click <strong>Search</strong>, then click your <strong>Property ID</strong> in the results</li>
      <li><strong>Note:</strong> Denton&apos;s portal may require a PIN from your mailed notice. Easiest path: find your mailed <strong>Notice of Appraised Value</strong> and upload it directly above.</li>
    </>
  );

  if (county === 'Parker County') return (
    <>
      <li>Go to {link} and click <strong>Search Our Data</strong></li>
      <li>In the <strong>Street No.</strong> field enter: {hn}</li>
      <li>In the <strong>Street Name</strong> field enter: {sn}</li>
      <li>Click <strong>Search</strong>, then click your property&apos;s <strong>Account No</strong></li>
      <li>Find the <strong>Appraisal Notice</strong> under the &ldquo;Notices&rdquo; section {up}</li>
    </>
  );

  if (county === 'Ellis County') return (
    <>
      <li>Go to {link} and click <strong>Property Search</strong></li>
      <li>In the <strong>Address</strong> box, enter your full street address{addrHint ? <> (e.g. <em>{addrHint}</em>)</> : null}</li>
      <li>Click <strong>Search</strong>, then click on your property in the results</li>
      <li>Find the <strong>Documents</strong> or <strong>Notices</strong> tab and locate your appraisal notice {up}</li>
    </>
  );

  // Other (Texas) — generic fallback
  return (
    <>
      <li>Go to {link} to find your county&apos;s appraisal district</li>
      <li>Search for your property by address</li>
      <li>Locate your <strong>{year} appraisal notice</strong> and upload it above</li>
    </>
  );
}

export function TaxAnalysis() {
  const [formData, setFormData] = useState<PropertyData>(DEFAULT_FORM);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [taxResult, setTaxResult] = useState<AnalysisResult | null>(null);
  const [recommendationHtml, setRecommendationHtml] = useState('');
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

  // Single lookup state drives both value fields.
  // 'both_found'  = CAD returned current + prior year (ideal)
  // 'prior_only'  = only prior year available (ATTOM fallback)
  // 'not_found'   = no data — both fields manual
  type LookupState = 'idle' | 'searching' | 'both_found' | 'prior_only' | 'not_found';
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Set to true by onFileProcessed so the address-change lookup doesn't
  // overwrite values that were just extracted from an uploaded document.
  const suppressLookupRef = useRef(false);

  // Keep a ref so onFileProcessed can read current formData without a stale closure
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Debounced property lookup — fires 800ms after address or county changes.
  // Requires address ≥15 chars with a digit (filters out partial typing).
  useEffect(() => {
    const addr = formData.address ?? '';

    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

    // PDF upload already provided values — skip this lookup to avoid overwriting them.
    if (suppressLookupRef.current) {
      suppressLookupRef.current = false;
      setLookupState('idle');
      return;
    }

    if (addr.length < 15 || !/\d/.test(addr) || !formData.county) {
      setLookupState('idle');
      return;
    }

    let cancelled = false;
    setLookupState('searching');

    lookupTimeoutRef.current = setTimeout(() => {
      void lookupProperty(addr, formData.county).then(result => {
        if (cancelled) return;

        if (result === null) {
          setLookupState('not_found');
          return;
        }

        const expectedPriorYear = new Date().getFullYear() - 1;
        const hasCurrent = result.currentValue !== null && result.currentValue > 0;
        const hasPrior   = result.priorValue  !== null && result.priorValue  > 0
                           && result.priorYear === expectedPriorYear;

        if (hasCurrent && hasPrior) {
          setFormData(prev => ({
            ...prev,
            currentValue: result.currentValue ?? prev.currentValue,
            priorValue:   result.priorValue   ?? prev.priorValue,
          }));
          setLookupState('both_found');
        } else if (hasPrior) {
          setFormData(prev => ({ ...prev, priorValue: result.priorValue ?? prev.priorValue }));
          setLookupState('prior_only');
        } else {
          setLookupState('not_found');
        }
      });
    }, 800);

    return () => {
      cancelled = true;
      if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    };
  }, [formData.address, formData.county]);

  const runAnalysis = useCallback(async (data: PropertyData) => {
    if (!data.currentValue) return;
    setIsAnalyzing(true);
    setError('');
    setRetryAction(null);
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
      setError('Could not generate recommendation');
      setRetryAction(() => () => void runAnalysis(data));
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const onFileProcessed = useCallback(async (base64: string, mimeType: string) => {
    setError('');
    setRetryAction(null);
    const extracted = await extractDataFromDocument(base64, mimeType);
    if (extracted === null) {
      setError('Unable to reach the analysis service. Check your internet connection and try again.');
      setRetryAction(() => () => void onFileProcessed(base64, mimeType));
      return;
    }
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
    suppressLookupRef.current = true; // prevent the address-change lookup from overwriting these values
    setFormData(newData);
    setLookupState('idle');
    void runAnalysis(newData);
  }, [runAnalysis]);

  const { isExtracting, isDragging, setIsDragging, fileInputRef, handleFileChange, handleDrop } =
    useDocumentUpload({ isAnalyzing, onFileProcessed, onError: setError });

  const formRef = useScrollIntoViewOnFocus<HTMLFormElement>();
  const resultRef = useScrollToResult<HTMLDivElement>(taxResult);
  const { isTouch, isIOS } = getDeviceCapabilities();

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
    AMBIGUOUS: 'border-gray-300',
  } as const;

  const statusIconBg = {
    AUTOMATIC_REDUCTION: 'bg-secondary/10 text-secondary',
    PROTEST_RECOMMENDED: 'bg-amber-100 text-amber-600',
    CONTACT_WESTROM: 'bg-tertiary/10 text-tertiary',
    NO_ACTION: 'bg-teal-50 text-teal-600',
    AMBIGUOUS: 'bg-gray-100 text-gray-500',
  } as const;

  const statusLabel = {
    AUTOMATIC_REDUCTION: 'Automatic Reduction Eligible',
    PROTEST_RECOMMENDED: 'Protest Recommended',
    CONTACT_WESTROM: 'Contact Westrom',
    NO_ACTION: 'No Action Needed',
    AMBIGUOUS: "We Can't Fully Assess This",
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
        <div className="bg-white p-5 md:p-10 rounded-3xl shadow-lg border border-gray-100">
          {/* Upload zone */}
          <div className="mb-10">
            <div
              className={`border-2 border-dashed rounded-2xl p-10 min-h-[120px] text-center transition-all duration-300 cursor-pointer ${
                isDragging
                  ? 'border-secondary bg-secondary/5 scale-[1.02]'
                  : 'border-gray-300 hover:border-primary hover:bg-gray-50'
              }`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => { void handleDrop(e); }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label="Upload Tax Notice"
              aria-describedby={isIOS ? "upload-helper" : undefined}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,image/*"
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
                  <p className="text-gray-500">{isTouch ? "Tap to upload your PDF or image" : "Drag and drop your PDF or image here"}</p>
                  <p className="text-xs text-gray-500 mt-1">PDF: page 1 only — ensure appraised values appear on the first page</p>
                </div>
                <button
                  type="button"
                  disabled={isExtracting}
                  className="mt-2 px-6 py-2.5 min-h-[44px] min-w-[44px] bg-white border border-gray-200 rounded-full text-sm font-bold text-primary hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {isExtracting ? 'Extracting…' : 'Browse Files'}
                </button>
                {isIOS && (
                  <p id="upload-helper" className="text-sm text-gray-500 mt-2">
                    On iPhone, tap 'Browse' to find PDFs in your Files app
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-10">
            <div className="h-px bg-gray-200 flex-grow" />
            <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">OR ENTER MANUALLY</span>
            <div className="h-px bg-gray-200 flex-grow" />
          </div>

          {error && (
            <div className="bg-red-50 text-red-900 p-4 rounded-xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-red-100" aria-live="assertive">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              {retryAction && (
                <button
                  onClick={retryAction}
                  disabled={isAnalyzing || isExtracting}
                  className="whitespace-nowrap px-4 py-2.5 min-h-[44px] bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed text-red-700 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          )}

          <form ref={formRef} onSubmit={e => { void handleSubmit(e); }} className="space-y-6">
            <div>
              <label htmlFor="tax-address" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Property Address
              </label>
              <input
                id="tax-address"
                type="text"
                name="address"
                value={formData.address ?? ''}
                onChange={handleInputChange}
                placeholder="e.g. 123 Main St, Fort Worth, TX 76102"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="tax-county" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">County *</label>
                <select
                  id="tax-county"
                  name="county"
                  value={formData.county}
                  onChange={handleInputChange}
                  required
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all appearance-none"
                >
                  <option value="" disabled>Select a county…</option>
                  {COUNTIES.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tax-zillow-link" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Zillow Link (Opt)
                </label>
                <input
                  id="tax-zillow-link"
                  type="url"
                  name="zillowLink"
                  value={formData.zillowLink ?? ''}
                  onChange={handleInputChange}
                  placeholder="https://zillow.com/…"
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Lookup status banner — shown while searching or after result */}
            {lookupState === 'searching' && (
              <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                Looking up your appraisal values…
              </div>
            )}
            {lookupState === 'both_found' && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Found your {new Date().getFullYear()} and {new Date().getFullYear() - 1} values — verify with your appraisal notice then click Analyze.
              </div>
            )}
            {lookupState === 'prior_only' && (
              <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Found your {new Date().getFullYear() - 1} value — enter your {new Date().getFullYear()} value from your appraisal notice below.
              </div>
            )}
            {lookupState === 'not_found' && formData.county && (() => {
              const countyEntry  = COUNTIES.find(c => c.name === formData.county);
              const searchUrl    = countyEntry?.searchUrl ?? countyEntry?.url ?? '#';
              const countyLabel  = countyEntry?.description ?? formData.county;
              const year         = new Date().getFullYear();

              // Address parsing — skip directional prefixes (N/S/E/W etc.) when extracting street name
              const tokens      = (formData.address ?? '').trim().toUpperCase().replace(/,/g, '').split(/\s+/).filter(Boolean);
              const hasHouseNum = tokens.length > 0 && /^\d/.test(tokens[0]);
              const houseNumber = hasHouseNum ? tokens[0] : null;
              let snIdx = hasHouseNum ? 1 : 0;
              if (hasHouseNum && tokens[snIdx] && DIRECTIONALS.has(tokens[snIdx])) snIdx++;
              const streetName  = tokens[snIdx] ?? null;
              const addrHint    = houseNumber ? `${houseNumber} ${streetName ?? ''}`.trim() : streetName;

              return (
                <div className="text-sm text-amber-700 bg-amber-50 px-4 py-3 rounded-xl border border-amber-200 space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    We couldn&apos;t auto-fill your values — find them on the {countyLabel} website:
                  </div>
                  <ol className="pl-6 text-amber-600 space-y-1 list-decimal list-inside">
                    <CountySteps
                      county={formData.county}
                      searchUrl={searchUrl}
                      countyLabel={countyLabel}
                      houseNumber={houseNumber}
                      streetName={streetName}
                      addrHint={addrHint}
                      year={year}
                    />
                  </ol>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="tax-current-value" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {new Date().getFullYear()} Appraised Value *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="currentValue"
                    value={formData.currentValue ?? ''}
                    onChange={handleInputChange}
                    id="tax-current-value"
                    placeholder={lookupState === 'searching' ? 'Looking up…' : `From your ${new Date().getFullYear()} notice`}
                    className={`w-full p-4 pl-8 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium border ${
                      lookupState === 'both_found'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="tax-prior-value" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  {new Date().getFullYear() - 1} Appraised Value
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="priorValue"
                    value={formData.priorValue ?? ''}
                    onChange={handleInputChange}
                    id="tax-prior-value"
                    placeholder={lookupState === 'searching' ? 'Looking up…' : 'e.g. 350000'}
                    className={`w-full p-4 pl-8 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium border ${
                      lookupState === 'both_found' || lookupState === 'prior_only'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="tax-zillow-value" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Zillow Est. (Opt)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    id="tax-zillow-value"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="zillowValue"
                    value={formData.zillowValue ?? ''}
                    onChange={handleInputChange}
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="tax-realtor-value" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Realtor Est. (Opt)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-4 text-gray-400 font-medium">$</span>
                  <input
                    id="tax-realtor-value"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    name="realtorValue"
                    value={formData.realtorValue ?? ''}
                    onChange={handleInputChange}
                    className="w-full p-4 pl-8 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-4 items-center">
              <button
                type="submit"
                disabled={isAnalyzing || isExtracting}
                className="w-full bg-primary text-white font-semibold py-3.5 px-6 min-h-[44px] rounded-xl hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-live="polite"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Analyzing Property…</>
                ) : (
                  'Get Free Analysis'
                )}
              </button>
              <p className="text-xs text-center text-gray-500 max-w-md mx-auto">
                Informational only — not professional tax or legal advice.
              </p>
            </div>
          </form>
        </div>

        {/* Results column */}
        {taxResult && (
          <div ref={resultRef} className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 scroll-mt-24">
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
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">YoY Increase</div>
                    <div className="font-heading font-bold text-3xl text-primary">
                      {(taxResult.yoyIncreasePct * 100).toFixed(1)}%
                    </div>
                  </div>
                  {taxResult.marketGapPct !== null && (
                    <div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Market Gap</div>
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
            <ProtestGuide status={taxResult.status} county={formData.county} />
          </div>
        )}
      </div>
    </section>
  );
}
