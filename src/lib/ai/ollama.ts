import type { AIProvider, InsuranceExtraction, TaxExtraction } from './types';

interface OllamaConfig {
  baseUrl: string;
  visionModel: string;
  textModel: string;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  format?: 'json';
  stream: false;
  options?: { temperature?: number };
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

const TAX_EXTRACTION_PROMPT = `Extract property tax information from this document image.
FIRST verify: is this a Property Tax Notice, Appraisal Notice, or related tax document?
If NOT a tax document, return: {"error": "Brief explanation of what the document is instead."}
If it IS a tax notice but values are missing, omit those fields.

Return ONLY valid JSON with these keys (omit any not found):
- address (string)
- currentValue (number — integers only, no commas or $)
- priorValue (number — integers only, no commas or $)
- error (string — only if document is not a valid tax notice)`;

const INSURANCE_EXTRACTION_PROMPT = `Extract insurance policy information from this declaration page image.
FIRST verify: is this an Insurance Declaration Page, Policy Document, or related insurance document?
If NOT an insurance document, return: {"error": "Brief explanation of what the document is instead."}
If it IS an insurance document but values are missing, omit those fields.

Return ONLY valid JSON with these keys (omit any not found):
- policyType (string, e.g., "HO-3", "DP-1", "DP-3", "Landlord")
- windHailDeductible (string, e.g., "$1000", "1%", "2%")
- aopDeductible (string, e.g., "$1000", "$2500")
- hasLossOfRent (boolean)
- hasWaterBackup (boolean)
- annualPremium (number — integer only)
- error (string — only if document is not a valid insurance policy)`;

const TAX_SYSTEM_INSTRUCTION = `You are a property tax advisor for Westrom Property Management.
YOUR ROLE: Translate structured JSON analysis into clear, actionable prose.
DO: Use provided numbers exactly; be direct; plain English.
CRITICAL RULES:
1. If year-over-year increase > 20%, state that Texas non-homestead properties are capped at 20% and the owner is entitled to an automatic free reduction.
2. If county appraisal is higher than Zillow or Realtor.com estimates, recommend filing a protest.
3. If protest is recommended, ALWAYS provide a DIY method AND recommend three professional tax protest companies (e.g., O'Connor & Associates, Property Tax Protest, Texas Tax Protest).
NEVER: Invent or round numbers; hallucinate data; mention AI; give legal advice.
OUTPUT: 2-3 paragraphs. Use HTML tags (<strong>, <br/>, <ul>, <li>) for readability. Do NOT use markdown.`;

const INSURANCE_SYSTEM_INSTRUCTION = `You are an insurance advisor for Westrom Property Management.
YOUR ROLE: Translate structured JSON insurance analysis into clear, actionable prose.
DO: Use provided data exactly; be direct; plain English.
CRITICAL RULES:
1. State whether the policy is typical and standard for a rental property.
2. Explicitly mention any coverage gaps (missing Loss of Rent, wrong policy type, etc.).
3. Suggest specific questions to ask the insurance company about deductibles and endorsements.
NEVER: Invent data; hallucinate coverages; mention AI; give legal advice.
OUTPUT: 2-3 paragraphs. Use HTML tags (<strong>, <br/>, <ul>, <li>) for readability. Do NOT use markdown.`;

export class OllamaProvider implements AIProvider {
  private readonly baseUrl: string;
  private readonly visionModel: string;
  private readonly textModel: string;

  constructor({ baseUrl, visionModel, textModel }: OllamaConfig) {
    this.baseUrl = baseUrl;
    this.visionModel = visionModel;
    this.textModel = textModel;
  }

  private async chat(request: OllamaChatRequest): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as OllamaChatResponse;
      return data.message.content;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async extractTaxData(base64: string, _mimeType: string): Promise<TaxExtraction | null> {
    try {
      const content = await this.chat({
        model: this.visionModel,
        messages: [{ role: 'user', content: TAX_EXTRACTION_PROMPT, images: [base64] }],
        format: 'json',
        stream: false,
        options: { temperature: 0 },
      });
      return JSON.parse(content) as TaxExtraction;
    } catch (error) {
      console.error('Tax extraction failed:', error);
      return null;
    }
  }

  async extractInsuranceData(base64: string, _mimeType: string): Promise<InsuranceExtraction | null> {
    try {
      const content = await this.chat({
        model: this.visionModel,
        messages: [{ role: 'user', content: INSURANCE_EXTRACTION_PROMPT, images: [base64] }],
        format: 'json',
        stream: false,
        options: { temperature: 0 },
      });
      return JSON.parse(content) as InsuranceExtraction;
    } catch (error) {
      console.error('Insurance extraction failed:', error);
      return null;
    }
  }

  async generateTaxRecommendation(analysisJson: string, statusContext: string, countyUrl: string): Promise<string> {
    const userPrompt = `Generate a recommendation for this property owner.
ANALYSIS DATA: ${analysisJson}
COUNTY PORTAL: ${countyUrl}
STATUS CONTEXT: ${statusContext}`;

    try {
      return await this.chat({
        model: this.textModel,
        messages: [
          { role: 'system', content: TAX_SYSTEM_INSTRUCTION },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.2 },
      });
    } catch (error) {
      console.error('Tax recommendation failed:', error);
      return 'An error occurred while generating the recommendation. Please contact Westrom Property Management.';
    }
  }

  async generateInsuranceRecommendation(analysisJson: string, statusContext: string): Promise<string> {
    const userPrompt = `Generate an insurance recommendation for this property owner.
ANALYSIS DATA: ${analysisJson}
STATUS CONTEXT: ${statusContext}`;

    try {
      return await this.chat({
        model: this.textModel,
        messages: [
          { role: 'system', content: INSURANCE_SYSTEM_INSTRUCTION },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        options: { temperature: 0.2 },
      });
    } catch (error) {
      console.error('Insurance recommendation failed:', error);
      return 'An error occurred while generating the recommendation. Please contact Westrom Property Management.';
    }
  }
}
