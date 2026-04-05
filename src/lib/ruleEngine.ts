export type AnalysisStatus = 'AUTOMATIC_REDUCTION' | 'PROTEST_RECOMMENDED' | 'NO_ACTION' | 'CONTACT_WESTROM';

export interface PropertyData {
  currentValue: number;
  priorValue: number;
  zillowValue?: number;
  realtorValue?: number;
  county: string;
}

export interface AnalysisResult {
  status: AnalysisStatus;
  yoyIncreasePct: number;
  marketGapPct: number | null;
  data: PropertyData;
}

export function runRuleEngine(data: PropertyData): AnalysisResult {
  const yoyIncreasePct = data.priorValue > 0 ? (data.currentValue - data.priorValue) / data.priorValue : 0;

  let status: AnalysisStatus = 'NO_ACTION';
  let marketGapPct: number | null = null;

  if (yoyIncreasePct > 0.20) {
    status = 'AUTOMATIC_REDUCTION';
  } else {
    let marketValue = null;
    if (data.zillowValue && data.realtorValue) {
      marketValue = Math.min(data.zillowValue, data.realtorValue);
    } else if (data.zillowValue) {
      marketValue = data.zillowValue;
    } else if (data.realtorValue) {
      marketValue = data.realtorValue;
    }

    if (marketValue) {
      marketGapPct = (data.currentValue - marketValue) / marketValue;
      if (marketGapPct > 0.10) {
        status = 'PROTEST_RECOMMENDED';
      } else if (marketGapPct >= 0.08 && marketGapPct <= 0.12) {
        status = 'CONTACT_WESTROM';
      } else {
        status = 'NO_ACTION';
      }
    } else {
      // Fallback if no market data
      if (yoyIncreasePct > 0.10) {
        status = 'PROTEST_RECOMMENDED';
      } else if (yoyIncreasePct >= 0.08 && yoyIncreasePct <= 0.12) {
        status = 'CONTACT_WESTROM';
      }
    }
  }

  return { status, yoyIncreasePct, marketGapPct, data };
}

export function getStatusExplanation(status: AnalysisStatus): string {
  switch (status) {
    case 'AUTOMATIC_REDUCTION': return 'The appraised value increased by more than 20% year-over-year. Under Texas law, the owner is entitled to an automatic reduction.';
    case 'PROTEST_RECOMMENDED': return 'The appraised value is significantly higher than estimated market values or prior year values. A protest is highly recommended to lower the tax burden.';
    case 'CONTACT_WESTROM': return 'The numbers are borderline. The owner should contact Westrom Property Management for a professional human review.';
    case 'NO_ACTION': return 'The appraised value appears to be in line with or below market estimates. A protest is unlikely to be successful or worth the effort at this time.';
  }
}
