import { AnalysisResult, getStatusExplanation, InsuranceAnalysisResult, getInsuranceStatusExplanation } from '../ruleEngine';
import type { InsuranceExtraction, TaxExtraction } from './types';

export type { TaxExtraction, InsuranceExtraction };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export async function extractDataFromDocument(
  base64Data: string,
  mimeType: string,
): Promise<TaxExtraction | null> {
  try {
    const res = await fetch(API_BASE_URL + '/extract-tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Data, mimeType }),
    });
    if (!res.ok) {
      // Propagate the API's error message so the component can display it directly.
      // Falls back to a generic message only when the body cannot be parsed.
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const message = typeof body.error === 'string'
        ? body.error
        : 'Failed to extract document data. Please try again.';
      return { error: message };
    }
    return await res.json();
  } catch {
    // Network-level failure (offline, CORS) — no API body to parse.
    console.error('Tax extraction: network failure');
    return null;
  }
}

export async function extractInsuranceData(
  base64Data: string,
  mimeType: string,
): Promise<InsuranceExtraction | null> {
  try {
    const res = await fetch(API_BASE_URL + '/extract-insurance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64: base64Data, mimeType }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, unknown>;
      const message = typeof body.error === 'string'
        ? body.error
        : 'Failed to extract document data. Please try again.';
      return { error: message };
    }
    return await res.json();
  } catch {
    console.error('Insurance extraction: network failure');
    return null;
  }
}

export async function generateTaxRecommendation(
  result: AnalysisResult,
  countyUrl: string,
): Promise<string> {
  try {
    const res = await fetch(API_BASE_URL + '/recommend-tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisJson: JSON.stringify(result),
        statusContext: getStatusExplanation(result.status),
        countyUrl
      })
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.recommendation;
  } catch (error) {
    console.error('Recommendation failed:', error);
    return 'Could not generate recommendation at this time.';
  }
}

export interface PropertyLookupResult {
  currentYear: number | null;
  currentValue: number | null;
  priorYear: number | null;
  priorValue: number | null;
  source: string;
  county: string;
}

// Looks up current and prior year assessed values via the backend lookup service
// (CAD scraper → ATTOM fallback). Returns null for any network/service failure so
// callers fall back to manual entry without surfacing an error to the user.
export async function lookupProperty(
  address: string,
  county: string,
): Promise<PropertyLookupResult | null> {
  try {
    const params = new URLSearchParams({ address, county });
    const res = await fetch(`${API_BASE_URL}/property-lookup?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json() as PropertyLookupResult;
    if (data.source === 'not_found') return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateInsuranceRecommendation(
  result: InsuranceAnalysisResult,
): Promise<string> {
  try {
    const res = await fetch(API_BASE_URL + '/recommend-insurance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisJson: JSON.stringify(result),
        statusContext: getInsuranceStatusExplanation(result.status)
      })
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    return data.recommendation;
  } catch (error) {
    console.error('Recommendation failed:', error);
    return 'Could not generate recommendation at this time.';
  }
}


