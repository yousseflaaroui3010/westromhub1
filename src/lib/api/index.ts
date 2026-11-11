import type { AnalysisResult, InsuranceAnalysisResult } from '../ruleEngine';
import { COUNTIES, type CountyName } from '../constants';
import { getTurnstileToken, turnstileEnabled } from '../turnstile';
import type { InsuranceExtraction, TaxExtraction } from './types';

export type { TaxExtraction, InsuranceExtraction };

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

// --- Errors ----------------------------------------------------------------
// The API returns { error, code, requestId }. `error` is always fixed copy
// written by us, safe to show. The short reference lets a user quote it.

export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly requestId?: string) {
    super(message);
    this.name = 'ApiError';
  }
  get display(): string {
    return this.requestId ? `${this.message} (Ref: ${this.requestId.slice(0, 8)})` : this.message;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as { error?: unknown; code?: unknown; requestId?: unknown };
  const code = typeof body.code === 'string' ? body.code : `http_${res.status}`;
  const requestId = typeof body.requestId === 'string' ? body.requestId : undefined;
  if (res.status === 429) {
    return new ApiError('You have made a lot of requests. Please wait a minute and try again.', code, requestId);
  }
  const message = typeof body.error === 'string' && body.error.length < 300
    ? body.error
    : 'Something went wrong. Please try again.';
  return new ApiError(message, code, requestId);
}

// --- Session (bot check) ---------------------------------------------------

let session: { token: string; expiresAt: number } | null = null;
let pendingSession: Promise<string> | null = null;

async function getSession(): Promise<string> {
  if (session && session.expiresAt - Date.now() > 60_000) return session.token;
  if (pendingSession) return pendingSession;
  pendingSession = (async () => {
    const turnstileToken = turnstileEnabled ? await getTurnstileToken('analysis') : undefined;
    const res = await fetch(`${API_BASE_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turnstileToken ? { turnstileToken } : {}),
    });
    if (!res.ok) throw await toApiError(res);
    const data = (await res.json()) as { token: string; expiresAt: number };
    session = data;
    return data.token;
  })().finally(() => { pendingSession = null; });
  return pendingSession;
}

/** POST to a paid route with a session; renews once if the session expired. */
async function paidPost<T>(path: string, body: unknown): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getSession();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as T;
    const err = await toApiError(res);
    if (err.code === 'session_required' && attempt === 0) { session = null; continue; }
    throw err;
  }
  throw new ApiError('Something went wrong. Please try again.', 'retry_exhausted');
}

/** POST to a free route (no session, no bot check). */
async function plainPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

function networkError(): ApiError {
  return new ApiError('Unable to reach the analysis service. Check your internet connection and try again.', 'network');
}

// --- Extraction --------------------------------------------------------------
// Returns data, { error } with display-ready text for an API refusal, or null
// for a network-level failure (callers offer a Retry). Never throws.

async function extract<T>(path: string, base64: string, mimeType: string): Promise<T | { error: string } | null> {
  try {
    return await paidPost<T>(path, { base64, mimeType });
  } catch (e) {
    return e instanceof ApiError ? { error: e.display } : null;
  }
}

export function extractDataFromDocument(base64: string, mimeType: string): Promise<TaxExtraction | null> {
  return extract<TaxExtraction>('/extract-tax', base64, mimeType);
}

export function extractInsuranceData(base64: string, mimeType: string): Promise<InsuranceExtraction | null> {
  return extract<InsuranceExtraction>('/extract-insurance', base64, mimeType);
}

// --- Recommendations -----------------------------------------------------------
// Templated on the server from its own rule-engine run (no AI, no session).
// Only typed values are sent, so these payloads carry no free text.

const COUNTY_NAMES = new Set<string>(COUNTIES.map((c) => c.name));

function money(n: number | undefined): number | undefined {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

function label(s: string | undefined, max: number): string | undefined {
  if (!s) return undefined;
  const cleaned = s.replace(/[^A-Za-z0-9 $%.,()/&+-]/g, '').trim().slice(0, max);
  return cleaned || undefined;
}

export async function generateTaxRecommendation(result: AnalysisResult): Promise<string> {
  const d = result.data;
  const county = (COUNTY_NAMES.has(d.county) ? d.county : 'Other (Texas)') as CountyName;
  try {
    const data = await plainPost<{ recommendation: string }>('/recommend-tax', {
      county,
      currentValue: money(d.currentValue),
      priorValue: money(d.priorValue),
      zillowValue: money(d.zillowValue),
      realtorValue: money(d.realtorValue),
    });
    return data.recommendation;
  } catch (e) {
    throw e instanceof ApiError ? e : networkError();
  }
}

export async function generateInsuranceRecommendation(result: InsuranceAnalysisResult): Promise<string> {
  const d = result.data;
  try {
    const data = await plainPost<{ recommendation: string }>('/recommend-insurance', {
      policyType: label(d.policyType, 40),
      windHailDeductible: label(d.windHailDeductible, 24),
      aopDeductible: label(d.aopDeductible, 24),
      hasLossOfRent: typeof d.hasLossOfRent === 'boolean' ? d.hasLossOfRent : undefined,
      hasWaterBackup: typeof d.hasWaterBackup === 'boolean' ? d.hasWaterBackup : undefined,
      annualPremium: money(d.annualPremium),
    });
    return data.recommendation;
  } catch (e) {
    throw e instanceof ApiError ? e : networkError();
  }
}

// --- Property lookup (free route; no session) ------------------------------

export interface PropertyLookupResult {
  currentYear: number | null;
  currentValue: number | null;
  priorYear: number | null;
  priorValue: number | null;
  source: string;
  county: string;
}

// Returns null for any failure so callers fall back to manual entry.
export async function lookupProperty(address: string, county: string): Promise<PropertyLookupResult | null> {
  try {
    const params = new URLSearchParams({ address, county });
    const res = await fetch(`${API_BASE_URL}/property-lookup?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as PropertyLookupResult;
    if (data.source === 'not_found') return null;
    return data;
  } catch {
    return null;
  }
}

/** Test hook: forget the cached session. */
export function _resetSessionForTests(): void {
  session = null;
  pendingSession = null;
}
