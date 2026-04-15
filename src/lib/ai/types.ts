export interface TaxExtraction {
  address?: string;
  currentValue?: number;
  priorValue?: number;
  error?: string;
}

export interface InsuranceExtraction {
  policyType?: string;
  windHailDeductible?: string;
  aopDeductible?: string;
  hasLossOfRent?: boolean;
  hasWaterBackup?: boolean;
  annualPremium?: number;
  error?: string;
}

export interface AIProvider {
  extractTaxData(base64: string, mimeType: string): Promise<TaxExtraction | null>;
  extractInsuranceData(base64: string, mimeType: string): Promise<InsuranceExtraction | null>;
  generateTaxRecommendation(analysisJson: string, statusContext: string, countyUrl: string): Promise<string>;
  generateInsuranceRecommendation(analysisJson: string, statusContext: string): Promise<string>;
}
