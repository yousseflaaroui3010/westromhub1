import { useCallback, useState, type ReactNode } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { sanitizeRecommendation } from '../lib/sanitize';
import { runInsuranceRuleEngine, type InsuranceAnalysisResult, type InsuranceData } from '../lib/ruleEngine';
import { ApiError, extractInsuranceData, generateInsuranceRecommendation } from '../lib/api';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
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

export function InsuranceAnalysis({ aside }: { aside?: ReactNode } = {}) {
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insResult, setInsResult] = useState<InsuranceAnalysisResult | null>(null);
  const [recommendationHtml, setRecommendationHtml] = useState('');
  const [error, setError] = useState('');
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);

  const runAnalysis = useCallback(async (data: InsuranceData) => {
    setIsAnalyzing(true);
    setError('');
    setRetryAction(null);
    setInsResult(null);
    setRecommendationHtml('');
    try {
      const result = runInsuranceRuleEngine(data);
      setInsResult(result);
      const rec = await generateInsuranceRecommendation(result);
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
    const extracted = await extractInsuranceData(base64, mimeType);
    if (extracted === null) {
      setError('Unable to reach the analysis service. Check your internet connection and try again.');
      setRetryAction(() => () => void onFileProcessed(base64, mimeType));
      setInsuranceData(null);
      return;
    }
    if (!extracted) {
      setError('Could not extract data from the document.');
      setInsuranceData(null);
      return;
    }
    if (extracted.error) {
      setError(extracted.error);
      setInsuranceData(null);
      return;
    }
    if (!extracted.policyType && !extracted.annualPremium) {
      setError('Could not find policy details. Please verify it is a complete declaration page.');
      setInsuranceData(null);
      return;
    }
    setInsuranceData(extracted);
    void runAnalysis(extracted);
  }, [runAnalysis]);

  const { isExtracting, isDragging, setIsDragging, fileInputRef, handleFileChange, handleDrop } =
    useDocumentUpload({ isAnalyzing, onFileProcessed, onError: setError });

  const resultRef = useScrollToResult<HTMLDivElement>(insResult);
  const { isTouch, isIOS } = getDeviceCapabilities();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceData) {
      setError('Please upload an insurance declaration page first.');
      return;
    }
    void runAnalysis(insuranceData);
  };

  const statusTone = {
    CRITICAL_WARNING: { bar: 'bg-secondary', icon: 'bg-secondary-soft text-secondary' },
    UPGRADE_RECOMMENDED: { bar: 'bg-amber-500', icon: 'bg-warning-soft text-warning' },
    OPTIMIZATION_POSSIBLE: { bar: 'bg-primary', icon: 'bg-primary-soft text-primary' },
    GOOD_STANDING: { bar: 'bg-success', icon: 'bg-success-soft text-success' },
  } as const;

  const statusLabel = {
    CRITICAL_WARNING: 'Critical coverage warning',
    UPGRADE_RECOMMENDED: 'Coverage upgrade recommended',
    OPTIMIZATION_POSSIBLE: 'You may be able to save',
    GOOD_STANDING: 'Your policy looks good',
  } as const;

  const premium = insuranceData?.annualPremium != null
    ? '$' + insuranceData.annualPremium.toLocaleString('en-US')
    : 'unknown';

  return (
    <section id="insurance-analysis" aria-labelledby="ins-analysis-title" className="scroll-mt-24">
      <div className="max-w-2xl">
        <p className="eyebrow">Free analysis</p>
        <h2 id="ins-analysis-title" className="section-title mt-3">Check your policy</h2>
        <p className="lead mt-3">
          Upload your insurance declarations page. We&apos;ll flag coverage gaps and ways to lower your premium.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="card p-5 sm:p-8">
          <div
            className={'rounded-2xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ' + (
              isDragging ? 'border-secondary bg-secondary-soft' : 'cursor-pointer border-slate-300 hover:border-primary hover:bg-slate-50'
            )}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
            onDrop={e => { void handleDrop(e); }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Upload insurance declarations page"
            aria-describedby={isIOS ? 'ins-upload-helper' : 'ins-upload-hint'}
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
              {isExtracting ? 'Reading your policy…' : 'Upload your declarations page'}
            </p>
            <p id="ins-upload-hint" className="mt-1 text-sm text-on-surface-variant">
              {isTouch ? 'Tap to choose a PDF or photo.' : 'Drag a PDF or photo here, or browse.'}
            </p>
            <span className="btn-secondary mt-5 min-h-10 px-5 text-sm" aria-hidden="true">
              {isExtracting ? 'Extracting…' : 'Browse files'}
            </span>
            {isIOS && (
              <p id="ins-upload-helper" className="mt-3 text-sm text-on-surface-variant">
                On iPhone, tap Browse to find PDFs in your Files app.
              </p>
            )}
          </div>

          {error && (
            <div className="mt-6 flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center" aria-live="assertive">
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

          {insuranceData && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-teal-200 bg-success-soft p-4 text-success" role="status">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">We read your policy</p>
                <p className="mt-1 text-ink">
                  Policy <strong>{insuranceData.policyType ?? 'unknown'}</strong> · Premium <strong>{premium}</strong>
                </p>
              </div>
            </div>
          )}

          <form onSubmit={e => { void handleSubmit(e); }} className="mt-6">
            <button type="submit" disabled={isAnalyzing || isExtracting} className="btn-primary w-full" aria-live="polite">
              {isAnalyzing ? (<><Loader2 className="h-5 w-5 animate-spin" /> Analyzing policy…</>) : 'Get my free analysis'}
            </button>
            <p className="mt-3 text-center text-xs text-on-surface-variant">
              Informational only, not professional legal or insurance advice.
            </p>
          </form>
        </div>

        {insResult ? (
          <div ref={resultRef} className="rise-in scroll-mt-24">
            <div className="card overflow-hidden">
              <div className={'h-1.5 ' + statusTone[insResult.status].bar} />
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-4">
                  <div className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ' + statusTone[insResult.status].icon}>
                    {insResult.status === 'GOOD_STANDING' ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : insResult.status === 'OPTIMIZATION_POSSIBLE' ? (
                      <ShieldCheck className="h-6 w-6" />
                    ) : (
                      <ShieldAlert className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">Your result</p>
                    <h3 className="font-heading text-2xl font-bold leading-tight text-ink">{statusLabel[insResult.status]}</h3>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-5">
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant">Policy type</dt>
                    <dd className="mt-1 font-heading text-xl font-extrabold text-ink">{insResult.data.policyType ?? 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-on-surface-variant">Wind/hail deductible</dt>
                    <dd className="mt-1 font-heading text-xl font-extrabold text-ink">{insResult.data.windHailDeductible ?? 'Unknown'}</dd>
                  </div>
                </dl>

                <div className="mt-6">
                  {isAnalyzing ? (
                    <RecommendationSkeleton />
                  ) : (
                    <div className="prose-rec" dangerouslySetInnerHTML={{ __html: recommendationHtml }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          aside ?? null
        )}
      </div>
    </section>
  );
}
