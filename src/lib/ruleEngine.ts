export type AnalysisStatus = 'AUTOMATIC_REDUCTION' | 'PROTEST_RECOMMENDED' | 'NO_ACTION' | 'CONTACT_WESTROM';

export interface PropertyData {
  address?: string;
  zillowLink?: string;
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
      if (marketGapPct > 0.05) {
        status = 'PROTEST_RECOMMENDED';
      } else if (marketGapPct > 0) {
        status = 'CONTACT_WESTROM';
      } else {
        status = 'NO_ACTION';
      }
    } else {
      // Fallback if no market data
      if (yoyIncreasePct > 0.10) {
        status = 'PROTEST_RECOMMENDED';
      } else if (yoyIncreasePct > 0.05) {
        status = 'CONTACT_WESTROM';
      }
    }
  }

  return { status, yoyIncreasePct, marketGapPct, data };
}

export function getStatusExplanation(status: AnalysisStatus): string {
  switch (status) {
    case 'AUTOMATIC_REDUCTION': return 'The appraised value increased by more than 20% year-over-year. Under Texas law, non-homestead properties are capped at a 20% increase. The owner is entitled to an automatic reduction.';
    case 'PROTEST_RECOMMENDED': return 'The county appraised value is higher than estimated market values (like Zillow/Realtor) or has a significant year-over-year increase. A protest is highly recommended to lower the tax burden.';
    case 'CONTACT_WESTROM': return 'The county appraised value is slightly higher than market estimates or prior year values. The owner should contact Westrom Property Management for a professional human review.';
    case 'NO_ACTION': return 'The appraised value appears to be in line with or below market estimates. A protest is unlikely to be successful or worth the effort at this time.';
  }
}

// --- INSURANCE LOGIC ---

export type InsuranceStatus = 'CRITICAL_WARNING' | 'UPGRADE_RECOMMENDED' | 'OPTIMIZATION_POSSIBLE' | 'GOOD_STANDING';

export interface InsuranceData {
  policyType?: string;
  windHailDeductible?: string;
  aopDeductible?: string;
  hasLossOfRent?: boolean;
  hasWaterBackup?: boolean;
  annualPremium?: number;
}

export interface InsuranceAnalysisResult {
  status: InsuranceStatus;
  gaps: string[];
  optimizations: string[];
  data: InsuranceData;
}

export function runInsuranceRuleEngine(data: InsuranceData): InsuranceAnalysisResult {
  let status: InsuranceStatus = 'GOOD_STANDING';
  const gaps: string[] = [];
  const optimizations: string[] = [];

  const pt = data.policyType?.toUpperCase() || '';
  if (pt.includes('HO-3') || pt.includes('HO3') || pt.includes('HOMEOWNER')) {
    status = 'CRITICAL_WARNING';
    gaps.push('HO-3 (Homeowners) policy detected. This policy excludes rental activity. Claims may be denied. You need a Landlord (DP) policy immediately.');
  } else if (pt.includes('DP-1') || pt.includes('DP1') || pt.includes('BASIC')) {
    status = 'UPGRADE_RECOMMENDED';
    gaps.push('DP-1 (Basic) policy detected. This only pays Actual Cash Value (depreciated payouts). Upgrading to a DP-3 (Replacement Cost) is highly recommended.');
  }

  if (data.hasLossOfRent === false) {
    gaps.push('Missing Loss of Rental Income coverage. If the property becomes uninhabitable, you will lose rental income.');
  }
  if (data.hasWaterBackup === false) {
    gaps.push('Missing Sewer & Drain Backup coverage. This is a common claim in Texas and is excluded by default.');
  }

  // Deductible optimization
  const wh = data.windHailDeductible || '';
  if (wh.includes('$')) {
    const whAmount = parseInt(wh.replace(/\D/g, ''), 10);
    if (whAmount > 0 && whAmount <= 2000) {
      optimizations.push(`Low flat-rate Wind/Hail deductible detected (${wh}). Switching to a 1% or 2% deductible could significantly lower your premium.`);
      if (status === 'GOOD_STANDING') status = 'OPTIMIZATION_POSSIBLE';
    }
  }

  if (gaps.length > 0 && status === 'GOOD_STANDING') {
    status = 'UPGRADE_RECOMMENDED';
  }

  return { status, gaps, optimizations, data };
}

export function getInsuranceStatusExplanation(status: InsuranceStatus): string {
  switch (status) {
    case 'CRITICAL_WARNING': return 'Critical coverage issue detected that could result in a denied claim (e.g., wrong policy type for a rental). Immediate action required.';
    case 'UPGRADE_RECOMMENDED': return 'Significant coverage gaps or depreciated payout terms detected. Upgrading coverage is highly recommended to protect the asset.';
    case 'OPTIMIZATION_POSSIBLE': return 'Coverage looks adequate, but premiums could likely be lowered by optimizing deductibles.';
    case 'GOOD_STANDING': return 'Policy appears to be a strong landlord policy with good coverage and optimized deductibles.';
  }
}

