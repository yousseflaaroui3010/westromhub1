import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, FileText, ChevronDown } from 'lucide-react';
import { sanitizeRecommendation } from '../lib/sanitize';
import { runRuleEngine, type AnalysisResult, type PropertyData } from '../lib/ruleEngine';
import { ApiError, generateTaxRecommendation, extractDataFromDocument, lookupProperty } from '../lib/ai';
import { COUNTIES, resolveCounty } from '../lib/constants';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { ProtestGuide } from './ProtestGuide';
import { useScrollIntoViewOnFocus } from '../hooks/useScrollIntoViewOnFocus';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { getDeviceCapabilities } from '../hooks/useDeviceCapabilities';

function RecommendationSkeleton() {
  return (
    <div className="space-y-3 animate-pulse" aria-label="Generating recommendation…" role="status">
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
    <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
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

export function TaxAnalysis({ aside }: { aside?: ReactNode } = {}) {
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
      const rec = await generateTaxRecommendation(result);
      setRecommendationHtml(sanitizeRecommendation(rec));
    } catch (e) {
      setError(e instanceof ApiError ? e.display : 'Could not generate a recommendation.');
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




  const statusTone = {
    AUTOMATIC_REDUCTION: { bar: 'bg-secondary', icon: 'bg-secondary-soft text-secondary' },
    PROTEST_RECOMMENDED: { bar: 'bg-amber-500', icon: 'bg-warning-soft text-warning' },
    CONTACT_WESTROM: { bar: 'bg-primary', icon: 'bg-primary-soft text-primary' },
    NO_ACTION: { bar: 'bg-success', icon: 'bg-success-soft text-success' },
    AMBIGUOUS: { bar: 'bg-slate-300', icon: 'bg-slate-100 text-on-surface-variant' },
  } as const;

  const statusLabel = {
    AUTOMATIC_REDUCTION: 'Automatic reduction eligible',
    PROTEST_RECOMMENDED: 'Protest recommended',
    CONTACT_WESTROM: 'Worth a second opinion',
    NO_ACTION: 'No action needed',
    AMBIGUOUS: "We can't fully assess this yet",
  } as const;

  const year = new Date().getFullYear();
  const lookupFilled = (field: 'current' | 'prior') =>
    lookupState === 'both_found' || (field === 'prior' && lookupState === 'prior_only');

  return (
    <section id="tax-analysis" aria-labelledby="tax-analysis-title" className="scroll-mt-24">
      <div className="max-w-2xl">
        <p className="eyebrow">Free analysis</p>
        <h2 id="tax-analysis-title" className="section-title mt-3">Check your appraisal notice</h2>
        <p className="lead mt-3">
          Upload your county notice or enter the values yourself. You&apos;ll see whether to protest, and why.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Input */}
        <div className="card p-5 sm:p-8">
          <div
            className={`group rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-8 ${
              isDragging ? 'border-secondary bg-secondary-soft' : 'cursor-pointer border-slate-300 hover:border-primary hover:bg-slate-50'
            }`}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
            onDrop={e => { void handleDrop(e); }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Upload tax notice"
            aria-describedby={isIOS ? 'upload-helper' : 'upload-hint'}
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={e => { void handleFileChange(e); }}
            />
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary" aria-live="polite">
              {isExtracting ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
            <p className="mt-4 font-heading text-lg font-bold text-ink">
              {isExtracting ? 'Reading your notice…' : 'Upload your appraisal notice'}
            </p>
            <p id="upload-hint" className="mt-1 text-sm text-on-surface-variant">
              {isTouch ? 'Tap to choose a PDF or photo.' : 'Drag a PDF or photo here, or browse.'} For PDFs, page 1 should show the values.
            </p>
            <span className="btn-secondary mt-5 min-h-10 px-5 text-sm" aria-hidden="true">
              {isExtracting ? 'Extracting…' : 'Browse files'}
            </span>
            {isIOS && (
              <p id="upload-helper" className="mt-3 text-sm text-on-surface-variant">
                On iPhone, tap Browse to find PDFs in your Files app.
              </p>
            )}
          </div>
          <p className="mt-3 text-center text-xs text-on-surface-variant">
            Most accurate option: it removes typing errors.
          </p>

          <div className="my-8 flex items-center gap-4" aria-hidden="true">
            <div className="h-px flex-grow bg-line" />
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">or enter manually</span>
            <div className="h-px flex-grow bg-line" />
          </div>

          {error && (
            <div className="mb-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center" aria-live="assertive">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <p className="text-sm font-medium">{error}</p>
              </div>
              {retryAction && (
                <button
                  onClick={retryAction}
                  disabled={isAnalyzing || isExtracting}
                  className="btn min-h-10 whitespace-nowrap bg-red-100 px-4 text-sm text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          <form ref={formRef} onSubmit={e => { void handleSubmit(e); }} className="space-y-5">
            <div>
              <label htmlFor="tax-address" className="field-label">Property address</label>
              <input
                id="tax-address"
                type="text"
                name="address"
                autoComplete="street-address"
                value={formData.address ?? ''}
                onChange={handleInputChange}
                placeholder="123 Main St, Fort Worth, TX 76102"
                className="field"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="tax-county" className="field-label">County</label>
                <div className="relative">
                  <select
                    id="tax-county"
                    name="county"
                    value={formData.county}
                    onChange={handleInputChange}
                    required
                    className="field appearance-none pr-10"
                  >
                    <option value="" disabled>Select a county…</option>
                    {COUNTIES.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
                </div>
              </div>
              <div>
                <label htmlFor="tax-zillow-link" className="field-label">
                  Zillow link<span className="field-optional">optional</span>
                </label>
                <input
                  id="tax-zillow-link"
                  type="url"
                  name="zillowLink"
                  value={formData.zillowLink ?? ''}
                  onChange={handleInputChange}
                  placeholder="https://zillow.com/…"
                  className="field"
                />
              </div>
            </div>

            {lookupState === 'searching' && (
              <div className="flex items-center gap-2 rounded-xl border border-line bg-slate-50 px-4 py-3 text-sm text-on-surface-variant" role="status">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                Looking up your appraisal values…
              </div>
            )}
            {lookupState === 'both_found' && (
              <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-success-soft px-4 py-3 text-sm text-success" role="status">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Found your {year} and {year - 1} values. Check them against your notice, then analyze.
              </div>
            )}
            {lookupState === 'prior_only' && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-warning-soft px-4 py-3 text-sm text-warning" role="status">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Found your {year - 1} value. Enter your {year} value from your notice below.
              </div>
            )}
            {lookupState === 'not_found' && formData.county && (() => {
              const countyEntry  = COUNTIES.find(c => c.name === formData.county);
              const searchUrl    = countyEntry?.searchUrl ?? '#';
              const countyLabel  = countyEntry?.description ?? formData.county;

              // Address parsing: skip directional prefixes (N/S/E/W etc.) when extracting the street name.
              const tokens      = (formData.address ?? '').trim().toUpperCase().replace(/,/g, '').split(/\s+/).filter(Boolean);
              const hasHouseNum = tokens.length > 0 && /^\d/.test(tokens[0]);
              const houseNumber = hasHouseNum ? tokens[0] : null;
              let snIdx = hasHouseNum ? 1 : 0;
              if (hasHouseNum && tokens[snIdx] && DIRECTIONALS.has(tokens[snIdx])) snIdx++;
              const streetName  = tokens[snIdx] ?? null;
              const addrHint    = houseNumber ? `${houseNumber} ${streetName ?? ''}`.trim() : streetName;

              return (
                <div className="space-y-2 rounded-xl border border-amber-200 bg-warning-soft px-4 py-3 text-sm text-warning">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    We couldn&apos;t auto-fill your values. Find them on the {countyLabel} website:
                  </div>
                  <ol className="list-inside list-decimal space-y-1 pl-6">
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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {([
                { id: 'tax-current-value', name: 'currentValue', label: `${year} appraised value`, required: true, filled: lookupFilled('current'), placeholder: lookupState === 'searching' ? 'Looking up…' : `From your ${year} notice` },
                { id: 'tax-prior-value', name: 'priorValue', label: `${year - 1} appraised value`, required: false, filled: lookupFilled('prior'), placeholder: lookupState === 'searching' ? 'Looking up…' : 'e.g. 350000' },
                { id: 'tax-zillow-value', name: 'zillowValue', label: 'Zillow estimate', required: false, filled: false, placeholder: '' },
                { id: 'tax-realtor-value', name: 'realtorValue', label: 'Realtor.com estimate', required: false, filled: false, placeholder: '' },
              ] as const).map(f => (
                <div key={f.id}>
                  <label htmlFor={f.id} className="field-label">
                    {f.label}
                    {!f.required && f.name !== 'priorValue' && <span className="field-optional">optional</span>}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">$</span>
                    <input
                      id={f.id}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      name={f.name}
                      value={formData[f.name] ?? ''}
                      onChange={handleInputChange}
                      placeholder={f.placeholder}
                      required={f.required}
                      className={`field pl-8 font-medium tabular-nums ${f.filled ? 'border-teal-300 bg-success-soft' : ''}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isAnalyzing || isExtracting}
                className="btn-primary w-full"
                aria-live="polite"
              >
                {isAnalyzing ? (<><Loader2 className="h-5 w-5 animate-spin" /> Analyzing property…</>) : 'Get my free analysis'}
              </button>
              <p className="mt-3 text-center text-xs text-on-surface-variant">
                Informational only, not professional tax or legal advice.
              </p>
            </div>
          </form>
        </div>

        {/* Result, or guidance until there is one */}
        {taxResult ? (
          <div ref={resultRef} className="rise-in space-y-6 scroll-mt-24">
            <div className="card overflow-hidden">
              <div className={`h-1.5 ${statusTone[taxResult.status].bar}`} />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${statusTone[taxResult.status].icon}`}>
                    {taxResult.status === 'NO_ACTION' ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : taxResult.status === 'CONTACT_WESTROM' ? (
                      <FileText className="h-6 w-6" />
                    ) : (
                      <AlertCircle className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Your result</p>
                    <h3 className="font-heading text-2xl font-bold leading-tight text-ink">{statusLabel[taxResult.status]}</h3>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-5">
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant">Change from last year</dt>
                    <dd className="mt-1 font-heading text-3xl font-extrabold tabular-nums text-ink">
                      {(taxResult.yoyIncreasePct * 100).toFixed(1)}%
                    </dd>
                  </div>
                  {taxResult.marketGapPct !== null && (
                    <div>
                      <dt className="text-xs font-semibold text-on-surface-variant">Above market estimate</dt>
                      <dd className="mt-1 font-heading text-3xl font-extrabold tabular-nums text-ink">
                        {(taxResult.marketGapPct * 100).toFixed(1)}%
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="mt-6">
                  {isAnalyzing ? (
                    <RecommendationSkeleton />
                  ) : (
                    <div className="prose-rec" dangerouslySetInnerHTML={{ __html: recommendationHtml }} />
                  )}
                </div>

                <a
                  href={COUNTIES.find(c => c.name === formData.county)?.url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary mt-8 w-full"
                >
                  {formData.county === 'Other (Texas)' ? 'Find your county appraisal district' : `Visit ${formData.county} website`}
                </a>
              </div>
            </div>
            <ProtestGuide status={taxResult.status} county={formData.county} />
          </div>
        ) : (
          aside ?? null
        )}
      </div>
    </section>
  );
}
