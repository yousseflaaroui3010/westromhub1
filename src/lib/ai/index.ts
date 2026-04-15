import { AnalysisResult, getStatusExplanation, InsuranceAnalysisResult, getInsuranceStatusExplanation } from '../ruleEngine';
import { OllamaProvider } from './ollama';
import type { InsuranceExtraction, TaxExtraction } from './types';

const provider = new OllamaProvider({
  baseUrl: import.meta.env.VITE_OLLAMA_BASE_URL ?? 'http://localhost:11434',
  visionModel: import.meta.env.VITE_OLLAMA_VISION_MODEL ?? 'qwen2-vl:7b',
  textModel: import.meta.env.VITE_OLLAMA_TEXT_MODEL ?? 'qwen2.5:7b',
});

export type { TaxExtraction, InsuranceExtraction };

export async function extractDataFromDocument(
  base64Data: string,
  mimeType: string,
): Promise<TaxExtraction | null> {
  return provider.extractTaxData(base64Data, mimeType);
}

export async function extractInsuranceData(
  base64Data: string,
  mimeType: string,
): Promise<InsuranceExtraction | null> {
  return provider.extractInsuranceData(base64Data, mimeType);
}

export async function generateTaxRecommendation(
  result: AnalysisResult,
  countyUrl: string,
): Promise<string> {
  return provider.generateTaxRecommendation(
    JSON.stringify(result),
    getStatusExplanation(result.status),
    countyUrl,
  );
}

export async function generateInsuranceRecommendation(
  result: InsuranceAnalysisResult,
): Promise<string> {
  return provider.generateInsuranceRecommendation(
    JSON.stringify(result),
    getInsuranceStatusExplanation(result.status),
  );
}
