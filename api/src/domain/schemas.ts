import { z } from 'zod';

// --- County allowlist (server-owned; mirrors src/lib/constants.ts COUNTIES) --
// The recommendation prompt only ever sees a URL from this table, never one
// supplied by the client. parity test: domain.parity.test.ts.
export const COUNTY_PORTALS = {
  'Tarrant County': 'https://www.tad.org',
  'Dallas County': 'https://www.dallascad.org',
  'Johnson County': 'https://www.johnsoncad.com',
  'Denton County': 'https://www.dentoncad.com',
  'Parker County': 'https://www.parkercad.org',
  'Ellis County': 'https://www.elliscad.com',
  'Other (Texas)': 'https://comptroller.texas.gov/taxes/property-tax/',
} as const;

export type CountyName = keyof typeof COUNTY_PORTALS;
const COUNTY_NAMES = Object.keys(COUNTY_PORTALS) as [CountyName, ...CountyName[]];

// --- Request schemas ----------------------------------------------------------

export const EXTRACT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export const ExtractBodySchema = z.object({
  // 10 MB of base64 ~= 7.5 MB image. nginx also caps the body at 10m.
  base64: z.string().min(1).max(10_000_000, 'base64 payload exceeds 10 MB limit')
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'base64 payload is not valid base64'),
  mimeType: z.enum(EXTRACT_ALLOWED_MIME_TYPES).default('image/png'),
}).strict();

const money = z.number().int().min(0).max(1_000_000_000);

/** Typed inputs only. Status and context are computed on the server. */
export const RecommendTaxBodySchema = z.object({
  county: z.enum(COUNTY_NAMES),
  currentValue: money.optional(),
  priorValue: money.optional(),
  zillowValue: money.optional(),
  realtorValue: money.optional(),
}).strict();

const shortLabel = (max: number) =>
  z.string().trim().max(max).regex(/^[A-Za-z0-9 $%.,()/&+-]*$/, 'contains unsupported characters');

export const RecommendInsuranceBodySchema = z.object({
  policyType: shortLabel(40).optional(),
  windHailDeductible: shortLabel(24).optional(),
  aopDeductible: shortLabel(24).optional(),
  hasLossOfRent: z.boolean().optional(),
  hasWaterBackup: z.boolean().optional(),
  annualPremium: z.number().int().min(0).max(10_000_000).optional(),
}).strict();

export const PropertyLookupQuerySchema = z.object({
  address: z.string().trim().min(5).max(200),
  county: z.string().trim().min(1).max(60),
});

// --- Model OUTPUT validation -------------------------------------------------
// A vision model reading a hostile document can return anything. Keep only
// well-formed fields; drop the rest. Never pass model text through unchecked.

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e]/g;
const cleanText = (max: number) =>
  z.string().transform((s) => s.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim()).pipe(z.string().min(1).max(max));

// Models sometimes emit "284,500" or "$284500" despite instructions.
const lenientMoney = z.union([
  z.number(),
  z.string().transform((s) => Number(s.replace(/[$,\s]/g, ''))),
]).pipe(z.number().finite().min(0).max(1_000_000_000)).transform((n) => Math.round(n));

const lenientBool = z.union([
  z.boolean(),
  z.enum(['true', 'false', 'yes', 'no']).transform((s) => s === 'true' || s === 'yes'),
]);

function pickValid<T extends z.ZodRawShape>(shape: T, raw: unknown): Partial<{ [K in keyof T]: z.output<T[K]> }> {
  const out: Record<string, unknown> = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out as never;
  for (const [k, schema] of Object.entries(shape)) {
    const v = (raw as Record<string, unknown>)[k];
    if (v === undefined || v === null) continue;
    const r = (schema as z.ZodTypeAny).safeParse(v);
    if (r.success) out[k] = r.data;
  }
  return out as never;
}

const TaxExtractionShape = {
  address: cleanText(200),
  county: cleanText(100),
  currentValue: lenientMoney,
  priorValue: lenientMoney,
};

const InsuranceExtractionShape = {
  policyType: cleanText(40),
  windHailDeductible: cleanText(24),
  aopDeductible: cleanText(24),
  hasLossOfRent: lenientBool,
  hasWaterBackup: lenientBool,
  annualPremium: lenientMoney,
};

export type ExtractionOutcome<T> =
  | { kind: 'data'; data: T }
  | { kind: 'wrong_document' }
  | { kind: 'empty' };

function classify<T extends object>(raw: unknown, data: T, required: Array<keyof T>): ExtractionOutcome<T> {
  const hasError = !!raw && typeof raw === 'object' && typeof (raw as { error?: unknown }).error === 'string';
  const hasAny = required.some((k) => data[k] !== undefined);
  if (hasError && !hasAny) return { kind: 'wrong_document' };
  if (!hasAny) return { kind: 'empty' };
  return { kind: 'data', data };
}

export function parseTaxExtraction(raw: unknown) {
  const data = pickValid(TaxExtractionShape, raw);
  return classify(raw, data, ['currentValue', 'priorValue']);
}

export function parseInsuranceExtraction(raw: unknown) {
  const data = pickValid(InsuranceExtractionShape, raw);
  return classify(raw, data, ['policyType', 'annualPremium', 'windHailDeductible', 'aopDeductible']);
}
