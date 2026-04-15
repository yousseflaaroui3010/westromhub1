import { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runInsuranceRuleEngine, type InsuranceAnalysisResult, type InsuranceData } from '../lib/ruleEngine';
import { extractInsuranceData, generateInsuranceRecommendation } from '../lib/ai';

async function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  if (file.type === 'application/pdf') {
    const { pdfPageToBase64 } = await import('../lib/pdfToImage');
    const base64 = await pdfPageToBase64(file);
    return { base64, mimeType: 'image/png' };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result type'));
        return;
      }
      resolve({ base64: result.split(',')[1], mimeType: file.type });
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

export function InsuranceAnalysis() {
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [insResult, setInsResult] = useState<InsuranceAnalysisResult | null>(null);
  const [recommendationHtml, setRecommendationHtml] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsExtracting(true);
    setError('');
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      const extracted = await extractInsuranceData(base64, mimeType);

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
    } catch {
      setError('An error occurred while processing the file.');
      setInsuranceData(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!insuranceData) {
      setError('Please upload an insurance declaration page first.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setInsResult(null);
    setRecommendationHtml('');

    try {
      const result = runInsuranceRuleEngine(insuranceData);
      setInsResult(result);
      const rec = await generateInsuranceRecommendation(result);
      setRecommendationHtml(DOMPurify.sanitize(rec));
    } catch {
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
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
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
          <div className="mb-10">
            <div
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${
                isDragging
                  ? 'border-tertiary bg-tertiary/5 scale-[1.02]'
                  : 'border-gray-300 hover:border-tertiary hover:bg-gray-50'
              }`}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
              onDrop={e => { void handleDrop(e); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={e => { void handleFileChange(e); }}
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary mb-2">
                  {isExtracting ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">Upload Insurance Dec Page</h3>
                  <p className="text-gray-500">Drag and drop your PDF or image here</p>
                </div>
                <button
                  type="button"
                  disabled={isExtracting}
                  className="mt-2 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-tertiary hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {isExtracting ? 'Extracting…' : 'Browse Files'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm font-medium">{error}</p>
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
            <button
              type="submit"
              disabled={isAnalyzing || !insuranceData}
              className="w-full py-4 bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing Policy…</>
              ) : (
                'Get Free Analysis'
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-6 max-w-md mx-auto">
              Informational only — not professional legal or insurance advice.
            </p>
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

                {/* AI recommendation — explicit child selectors instead of broken prose plugin */}
                <div
                  className="text-gray-600 mb-8 text-base leading-relaxed
                    [&_strong]:font-semibold [&_strong]:text-gray-900
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:my-3
                    [&_li]:text-gray-700
                    [&_a]:text-tertiary [&_a]:underline [&_a:hover]:text-tertiary/80"
                  dangerouslySetInnerHTML={{ __html: recommendationHtml }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
