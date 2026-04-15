import { GoogleGenAI, Type } from '@google/genai';
import { AnalysisResult, getStatusExplanation, InsuranceAnalysisResult, getInsuranceStatusExplanation } from './ruleEngine';

export async function generateTaxRecommendation(result: AnalysisResult, countyUrl: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
  const systemInstruction = `You are a property tax advisor for Westrom Property Management.
YOUR ROLE: Translate structured JSON analysis into clear, actionable prose.
DO: Use provided numbers exactly; be direct; plain English.
CRITICAL RULES:
1. If the year-over-year increase is > 20%, explicitly state that in Texas, non-homestead properties are capped at a 20% increase. State that an increase over 20% is against the law and they are entitled to an automatic free reduction.
2. If the county appraisal is higher than Zillow or Realtor.com estimates, explicitly state that they should file a protest because the county value is higher than market estimates.
3. If a protest is recommended, ALWAYS provide a DIY method (e.g., filing online via the county portal) AND recommend three professional tax protest companies as solutions (e.g., O'Connor & Associates, Property Tax Protest, Texas Tax Protest).
NEVER: Invent/round numbers; hallucinate data; mention AI; give legal advice.
OUTPUT: 2-3 paragraphs. Format using HTML tags (e.g., <strong>, <br/>, <ul>, <li>) for readability. Do NOT use markdown.`;

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
  FIRST, verify if this document is actually a Property Tax Notice, Appraisal Notice, or related property tax document.
  If it is NOT a tax/appraisal notice, return an object with ONLY the 'error' field set to a descriptive message (e.g., "This document does not appear to be a Property Tax Notice. Please upload a valid tax document.").
  If it IS a tax notice but the required values cannot be found, omit those fields from the JSON response.
  
  Return a JSON object with the following exact keys (omit any keys where the value is not found):
  - address (string)
  - currentValue (number, just the integer value, no commas or $)
  - priorValue (number, just the integer value, no commas or $)
  - error (string, optional, only if the document is invalid or not a tax notice)`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            address: { type: Type.STRING },
            currentValue: { type: Type.NUMBER },
            priorValue: { type: Type.NUMBER },
            error: { type: Type.STRING }
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
  FIRST, verify if this document is actually an Insurance Declaration Page, Policy Document, or related insurance document.
  If it is NOT an insurance document, return an object with ONLY the 'error' field set to a descriptive message (e.g., "This document does not appear to be an Insurance Policy. Please upload a valid declaration page.").
  If it IS an insurance document but the required values cannot be found, omit those fields from the JSON response.
  
  Return a JSON object with the following exact keys (omit any keys where the value is not found):
  - policyType (string, e.g., "HO-3", "DP-1", "DP-3", "Landlord", "Homeowners")
  - windHailDeductible (string, e.g., "$1000", "1%", "2%")
  - aopDeductible (string, e.g., "$1000", "$2500")
  - hasLossOfRent (boolean, true if Loss of Use / Fair Rental Value is present)
  - hasWaterBackup (boolean, true if Water Backup / Sewer Backup is present)
  - annualPremium (number, just the integer value)
  - error (string, optional, only if the document is invalid or not an insurance policy)`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt }
        ]
      },
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
            annualPremium: { type: Type.NUMBER },
            error: { type: Type.STRING }
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || '' });
  const systemInstruction = `You are an insurance advisor for Westrom Property Management.
YOUR ROLE: Translate structured JSON insurance analysis into clear, actionable prose.
DO: Use provided data exactly; be direct; plain English.
CRITICAL RULES:
1. State whether the policy is typical and standard based on the values.
2. Explicitly mention where they are lacking coverage (e.g., missing Loss of Rent, wrong policy type).
3. Suggest specific questions or ideas they should call and ask their insurance company about (e.g., optimizing deductibles, adding specific endorsements).
NEVER: Invent data; hallucinate coverages; mention AI; give legal advice.
OUTPUT: 2-3 paragraphs. Format using HTML tags (e.g., <strong>, <br/>, <ul>, <li>) for readability. Do NOT use markdown.`;

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
