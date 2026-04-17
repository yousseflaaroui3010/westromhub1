import { useCallback, useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runInsuranceRuleEngine, type InsuranceAnalysisResult, type InsuranceData } from '../lib/ruleEngine';
import { extractInsuranceData, generateInsuranceRecommendation } from '../lib/ai';
import { useDocumentUpload } from '../hooks/useDocumentUpload';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';

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

export function InsuranceAnalysis() {
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

  const { isTouch, isIOS } = useDeviceCapabilities();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceData) {
      setError('Please upload an insurance declaration page first.');
      return;
    }
    void runAnalysis(insuranceData);
  };

  const statusBorderColor = {
    CRITICAL_WARNING: 'border-secondary',
    UPGRADE_RECOMMENDED: 'border-amber-500',
    OPTIMIZATION_POSSIBLE: 'border-tertiary',
    GOOD_STANDING: 'border-teal-500',
  } as const;

  const statusIconBg = {
    CRITICAL_WARNING: 'bg-secondary/10 text-secondary',
    UPGRADE_RECOMMENDED: 'bg-amber-100 text-amber-600',
    OPTIMIZATION_POSSIBLE: 'bg-tertiary/10 text-tertiary',
    GOOD_STANDING: 'bg-teal-50 text-teal-600',
  } as const;

  const statusLabel = {
    CRITICAL_WARNING: 'Critical Insurance Warning',
    UPGRADE_RECOMMENDED: 'Coverage Upgrade Recommended',
    OPTIMIZATION_POSSIBLE: 'Premium Optimization Possible',
    GOOD_STANDING: 'Insurance Looks Good',
  } as const;

  return (
    <section id="insurance-analysis" className="mb-24">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h2 className="font-heading font-bold text-3xl text-primary mb-4 tracking-tight">
          Free Insurance Analysis
        </h2>
        <p className="text-gray-600 text-lg">
          Upload your insurance declaration page for AI-powered coverage gap and premium optimization recommendations.
        </p>
      </div>

      <div className={`grid gap-8 ${insResult ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
        {/* Input column */}
        <div className="bg-white p-5 md:p-10 rounded-3xl shadow-lg border border-gray-100">
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
              aria-label="Upload insurance policy"
              aria-describedby={isIOS ? "ins-upload-helper" : undefined}
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
                  <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">Upload Insurance Dec Page</h3>
                  <p className="text-gray-500">{isTouch ? "Tap to upload your PDF or image" : "Drag and drop your PDF or image here"}</p>
                </div>
                <button
                  type="button"
                  disabled={isExtracting}
                  className="mt-2 px-6 py-2.5 min-h-[44px] min-w-[44px] bg-white border border-gray-200 rounded-full text-sm font-bold text-tertiary hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {isExtracting ? 'Extracting…' : 'Browse Files'}
                </button>
                {isIOS && (
                  <p id="ins-upload-helper" className="text-sm text-gray-500 mt-2">
                    On iPhone, tap 'Browse' to find PDFs in your Files app
                  </p>
                )}
              </div>
            </div>
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
                  className="whitespace-nowrap px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  Retry Analysis
                </button>
              )}
            </div>
          )}

          {insuranceData && (
            <div className="mb-8 p-6 bg-teal-50 border border-teal-100 rounded-2xl flex items-start gap-4 text-teal-900 shadow-sm">
              <CheckCircle className="w-6 h-6 flex-shrink-0 mt-1 text-teal-600" />
              <div>
                <p className="font-bold text-lg mb-1">Insurance Data Extracted</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-teal-800">
                  <span className="bg-teal-100/50 px-3 py-1 rounded-md">
                    Policy: <strong>{insuranceData.policyType ?? 'Unknown'}</strong>
                  </span>
                  <span className="bg-teal-100/50 px-3 py-1 rounded-md">
                    Premium: <strong>${insuranceData.annualPremium ?? 'Unknown'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={e => { void handleSubmit(e); }}>
            <div className="flex flex-col gap-4 pt-4 items-center">
              <button
                type="submit"
                disabled={isAnalyzing || isExtracting}
                className="w-full bg-primary text-white font-semibold py-3.5 px-6 min-h-[44px] rounded-xl hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-live="polite"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Analyzing Policy…
                  </>
                ) : (
                  'Get Free Analysis'
                )}
              </button>
              <p className="text-xs text-center text-gray-400 max-w-md mx-auto">
                Informational only — not professional legal or insurance advice.
              </p>
            </div>
          </form>
        </div>

        {/* Results column */}
        {insResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className={`bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 ${statusBorderColor[insResult.status]}`}>
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${statusIconBg[insResult.status]}`}>
                    {insResult.status === 'GOOD_STANDING' ? (
                      <CheckCircle className="w-7 h-7" />
                    ) : insResult.status === 'OPTIMIZATION_POSSIBLE' ? (
                      <ShieldCheck className="w-7 h-7" />
                    ) : (
                      <ShieldAlert className="w-7 h-7" />
                    )}
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-gray-900 leading-tight">
                    {statusLabel[insResult.status]}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Policy Type</div>
                    <div className="font-heading font-bold text-xl text-primary">
                      {insResult.data.policyType ?? 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Wind/Hail Deductible</div>
                    <div className="font-heading font-bold text-xl text-primary">
                      {insResult.data.windHailDeductible ?? 'Unknown'}
                    </div>
                  </div>
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
                      [&_a]:text-tertiary [&_a]:underline [&_a:hover]:text-tertiary/80"
                    dangerouslySetInnerHTML={{ __html: recommendationHtml }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
