import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, getStatusExplanation, InsuranceAnalysisResult, getInsuranceStatusExplanation } from './ruleEngine';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateTaxRecommendation(result: AnalysisResult, countyUrl: string): Promise<string> {
  const systemInstruction = `You are a property tax advisor for Westrom Property Management.
YOUR ROLE: Translate structured JSON analysis into clear, actionable prose.
DO: Use provided numbers exactly; be direct; plain English; max 300 words.
NEVER: Invent/round numbers; hallucinate data; mention AI; give legal advice.
OUTPUT: 2-3 paragraphs (Findings, Action Steps, How-to). Plain text only, no markdown.`;

  const prompt = `Generate a recommendation for this owner.
ANALYSIS DATA: ${JSON.stringify(result)}
COUNTY LINK: ${countyUrl}
STATUS CONTEXT: ${getStatusExplanation(result.status)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for deterministic prose
      }
    });

    return response.text || 'Unable to generate recommendation.';
  } catch (error) {
    console.error("LLM Error:", error);
    return "An error occurred while generating the recommendation. Please contact Westrom Property Management.";
  }
}

export async function extractDataFromDocument(base64Data: string, mimeType: string) {
  const prompt = `Extract the property tax information from this document.
  Return a JSON object with the following exact keys:
  - address (string)
  - currentValue (number, just the integer value, no commas or $)
  - priorValue (number, just the integer value, no commas or $)
  If a value cannot be found, return null for that field.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { inlineData: { data: base64Data, mimeType } },
        prompt
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            address: { type: Type.STRING },
            currentValue: { type: Type.NUMBER },
            priorValue: { type: Type.NUMBER }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse JSON from document extraction", error);
    return null;
  }
}

export async function extractInsuranceData(base64Data: string, mimeType: string) {
  const prompt = `Extract the insurance policy information from this declaration page.
  Return a JSON object with the following exact keys:
  - policyType (string, e.g., "HO-3", "DP-1", "DP-3", "Landlord", "Homeowners")
  - windHailDeductible (string, e.g., "$1000", "1%", "2%")
  - aopDeductible (string, e.g., "$1000", "$2500")
  - hasLossOfRent (boolean, true if Loss of Use / Fair Rental Value is present)
  - hasWaterBackup (boolean, true if Water Backup / Sewer Backup is present)
  - annualPremium (number, just the integer value)
  If a value cannot be found, return null for that field.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        { inlineData: { data: base64Data, mimeType } },
        prompt
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            policyType: { type: Type.STRING },
            windHailDeductible: { type: Type.STRING },
            aopDeductible: { type: Type.STRING },
            hasLossOfRent: { type: Type.BOOLEAN },
            hasWaterBackup: { type: Type.BOOLEAN },
            annualPremium: { type: Type.NUMBER }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse JSON from insurance extraction", error);
    return null;
  }
}

export async function generateInsuranceRecommendation(result: InsuranceAnalysisResult): Promise<string> {
  const systemInstruction = `You are an insurance advisor for Westrom Property Management.
YOUR ROLE: Translate structured JSON insurance analysis into clear, actionable prose.
DO: Use provided data exactly; be direct; plain English; max 300 words. Focus on the identified gaps and optimizations.
NEVER: Invent data; hallucinate coverages; mention AI; give legal advice.
OUTPUT: 2-3 paragraphs (Findings, Action Steps). Plain text only, no markdown.`;

  const prompt = `Generate an insurance recommendation for this owner.
ANALYSIS DATA: ${JSON.stringify(result)}
STATUS CONTEXT: ${getInsuranceStatusExplanation(result.status)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      }
    });

    return response.text || 'Unable to generate recommendation.';
  } catch (error) {
    console.error("LLM Error:", error);
    return "An error occurred while generating the insurance recommendation. Please contact Westrom Property Management.";
  }
}
