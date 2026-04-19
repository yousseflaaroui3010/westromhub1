export interface CadLookupResult {
  currentYear: number;
  currentValue: number;
  priorYear: number;
  priorValue: number;
}

/** Injectable lookup function — real adapters in production, mocks in tests. */
export type CadLookupFn = (
  address: string,
  county: string,
) => Promise<CadLookupResult | null>;
