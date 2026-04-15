import React, { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import DOMPurify from 'dompurify';
import { runInsuranceRuleEngine, InsuranceAnalysisResult, InsuranceData } from '../lib/ruleEngine';
import { extractInsuranceData, generateInsuranceRecommendation } from '../lib/ai';

export function InsuranceAnalysis() {
  const [insuranceData, setInsuranceData] = useState<InsuranceData | null>(null);
  const [isExtractingIns, setIsExtractingIns] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [insResult, setInsResult] = useState<InsuranceAnalysisResult | null>(null);
  const [insRecommendationHtml, setInsRecommendationHtml] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const insInputRef = useRef<HTMLInputElement>(null);

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

  const handleInsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setIsExtractingIns(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const extractedData = await extractInsuranceData(base64String, file.type);
        
        if (extractedData) {
          if (extractedData.error) {
            setError(extractedData.error);
            setInsuranceData(null);
          } else if (!extractedData.policyType && !extractedData.annualPremium) {
            setError('Could not find policy details in this document. Please verify it is a complete insurance declaration page.');
            setInsuranceData(null);
          } else {
            setInsuranceData(extractedData);
            setError('');
          }
        } else {
          setError('Could not extract data from the insurance document.');
          setInsuranceData(null);
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
    if (!insuranceData) {
      setError('Please upload an insurance declaration page first.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setInsResult(null);
    setInsRecommendationHtml('');

    try {
      const iResult = runInsuranceRuleEngine(insuranceData);
      setInsResult(iResult);
      const iRec = await generateInsuranceRecommendation(iResult);
      setInsRecommendationHtml(DOMPurify.sanitize(iRec));
    } catch (err) {
      console.error(err);
      setError('An error occurred during analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <section id="insurance-analysis" className="mb-24">
      <div className="mb-10 text-center max-w-3xl mx-auto">
        <h2 className="font-heading font-bold text-3xl text-primary mb-4 tracking-tight">Free Insurance Analysis</h2>
        <p className="text-gray-600 text-lg">
          Upload your insurance declaration page to get instant, AI-powered recommendations on closing insurance gaps and optimizing your premium.
        </p>
      </div>

      <div className={`grid gap-8 ${insResult ? 'lg:grid-cols-2' : 'max-w-3xl mx-auto'}`}>
        {/* Form Column */}
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-lg border border-gray-100">
          
          <div className="mb-10">
            <div 
              className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${
                isDragging 
                  ? 'border-tertiary bg-tertiary/5 scale-[1.02]' 
                  : 'border-gray-300 hover:border-tertiary hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => insInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                ref={insInputRef}
                onChange={handleInsUpload}
              />
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 bg-tertiary/10 rounded-full flex items-center justify-center text-tertiary mb-2">
                  {isExtractingIns ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-xl text-gray-900 mb-2">Upload Insurance Dec Page</h3>
                  <p className="text-gray-500">Drag and drop your PDF or image here</p>
                </div>
                <button 
                  type="button"
                  disabled={isExtractingIns}
                  className="mt-2 px-6 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold text-tertiary hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
                >
                  {isExtractingIns ? 'Extracting...' : 'Browse Files'}
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
                <p className="font-bold text-lg mb-1">Insurance Data Extracted Successfully</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-teal-800">
                  <span className="bg-teal-100/50 px-3 py-1 rounded-md">Policy: <strong>{insuranceData.policyType || 'Unknown'}</strong></span>
                  <span className="bg-teal-100/50 px-3 py-1 rounded-md">Premium: <strong>${insuranceData.annualPremium || 'Unknown'}</strong></span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <button 
              type="submit" 
              disabled={isAnalyzing || !insuranceData}
              className="w-full py-4 bg-primary hover:bg-primary-container text-white font-bold text-lg rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing Policy...</>
              ) : (
                'Get Free Analysis'
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-6 max-w-md mx-auto">
              This is informational only and not professional legal or insurance advice. Consult a licensed insurance broker for your specific situation.
            </p>
          </form>
        </div>

        {/* Results Column */}
        {insResult && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className={`bg-white rounded-3xl shadow-xl overflow-hidden border-t-8 ${
              insResult.status === 'CRITICAL_WARNING' ? 'border-secondary' :
              insResult.status === 'UPGRADE_RECOMMENDED' ? 'border-amber-500' :
              insResult.status === 'OPTIMIZATION_POSSIBLE' ? 'border-tertiary' :
              'border-teal-500'
            }`}>
              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    insResult.status === 'CRITICAL_WARNING' ? 'bg-secondary/10 text-secondary' :
                    insResult.status === 'UPGRADE_RECOMMENDED' ? 'bg-amber-100 text-amber-600' :
                    insResult.status === 'OPTIMIZATION_POSSIBLE' ? 'bg-tertiary/10 text-tertiary' :
                    'bg-teal-50 text-teal-600'
                  }`}>
                    {insResult.status === 'CRITICAL_WARNING' ? <ShieldAlert className="w-7 h-7" /> :
                     insResult.status === 'UPGRADE_RECOMMENDED' ? <ShieldAlert className="w-7 h-7" /> :
                     insResult.status === 'OPTIMIZATION_POSSIBLE' ? <ShieldCheck className="w-7 h-7" /> :
                     <CheckCircle className="w-7 h-7" />}
                  </div>
                  <h3 className="font-heading font-bold text-2xl text-gray-900 leading-tight">
                    {insResult.status === 'CRITICAL_WARNING' ? 'Critical Insurance Warning' :
                     insResult.status === 'UPGRADE_RECOMMENDED' ? 'Coverage Upgrade Recommended' :
                     insResult.status === 'OPTIMIZATION_POSSIBLE' ? 'Premium Optimization Possible' :
                     'Insurance Looks Good'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Policy Type</div>
                    <div className="font-heading font-bold text-xl text-primary">{insResult.data.policyType || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Wind/Hail Deductible</div>
                    <div className="font-heading font-bold text-xl text-primary">{insResult.data.windHailDeductible || 'Unknown'}</div>
                  </div>
                </div>

                <div className="prose prose-lg max-w-none text-gray-600 mb-8 prose-headings:font-heading prose-headings:text-gray-900 prose-a:text-tertiary hover:prose-a:text-tertiary/80" dangerouslySetInnerHTML={{ __html: insRecommendationHtml }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
