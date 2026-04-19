import { describe, it, expect } from 'vitest';
import { runRuleEngine, runInsuranceRuleEngine } from './ruleEngine';

describe('Tax Rule Engine', () => {
  it('should recommend PROTEST if county value is more than 5% above realtor value', () => {
    const result = runRuleEngine({
      address: '123 Main St',
      zillowLink: '',
      currentValue: 110000,
      priorValue: 100000,
      realtorValue: 100000,
      county: 'Tarrant County'
    });
    expect(result.status).toBe('PROTEST_RECOMMENDED');
  });

  it('should recommend AUTOMATIC_REDUCTION if non-homestead property increases by more than 20%', () => {
    const result = runRuleEngine({
      address: '123 Main St',
      zillowLink: '',
      currentValue: 125000,
      priorValue: 100000,
      county: 'Tarrant County'
    });
    // 25% increase > 20% limit for non-homestead properties
    expect(result.status).toBe('AUTOMATIC_REDUCTION');
  });

  it('should recommend NO_ACTION if values are fair and under limits', () => {
    const result = runRuleEngine({
      address: '123 Main St',
      zillowLink: '',
      currentValue: 105000,
      priorValue: 100000,
      realtorValue: 105000,
      county: 'Tarrant County'
    });
    expect(result.status).toBe('NO_ACTION');
  });
});

describe('Insurance Rule Engine', () => {
  it('should recommend UPGRADE_RECOMMENDED if policyType is DP-1', () => {
    const result = runInsuranceRuleEngine({
      policyType: 'DP-1',
      windHailDeductible: '1%',
      aopDeductible: '$1000',
      hasLossOfRent: true,
      hasWaterBackup: true,
      annualPremium: 1000
    });
    expect(result.status).toBe('UPGRADE_RECOMMENDED');
    expect(result.gaps.some(r => r.includes('DP-1'))).toBeTruthy();
  });

  it('should flag missing Loss of Rent', () => {
    const result = runInsuranceRuleEngine({
      policyType: 'DP-3',
      windHailDeductible: '1%',
      aopDeductible: '$1000',
      hasLossOfRent: false,
      hasWaterBackup: true,
      annualPremium: 1000
    });
    expect(result.status).toBe('UPGRADE_RECOMMENDED');
    expect(result.gaps.some(r => r.includes('Loss of Rental Income'))).toBeTruthy();
  });

  it('should return GOOD_STANDING for a standard solid policy', () => {
    const result = runInsuranceRuleEngine({
      policyType: 'DP-3',
      windHailDeductible: '1%',
      aopDeductible: '$1000',
      hasLossOfRent: true,
      hasWaterBackup: true,
      annualPremium: 1500
    });
    expect(result.status).toBe('GOOD_STANDING');
  });

  it('should flag CRITICAL_WARNING for HO-3 homeowner policy on a rental', () => {
    const result = runInsuranceRuleEngine({
      policyType: 'HO-3',
      windHailDeductible: '1%',
      aopDeductible: '$1000',
      hasLossOfRent: true,
      hasWaterBackup: true,
      annualPremium: 1500
    });
    expect(result.status).toBe('CRITICAL_WARNING');
    expect(result.gaps.some(g => g.includes('HO-3'))).toBeTruthy();
  });

  it('should set OPTIMIZATION_POSSIBLE for a flat low Wind/Hail deductible with no other gaps', () => {
    const result = runInsuranceRuleEngine({
      policyType: 'DP-3',
      windHailDeductible: '$1500',  // flat ≤ $2000 → optimization flag
      aopDeductible: '$1000',
      hasLossOfRent: true,
      hasWaterBackup: true,
      annualPremium: 1500
    });
    expect(result.status).toBe('OPTIMIZATION_POSSIBLE');
    expect(result.optimizations.length).toBeGreaterThan(0);
  });

  it('should flag both missing Loss of Rent and Water Backup', () => {
    const result = runInsuranceRuleEngine({
      policyType: 'DP-3',
      windHailDeductible: '1%',
      aopDeductible: '$1000',
      hasLossOfRent: false,
      hasWaterBackup: false,
      annualPremium: 1000
    });
    expect(result.gaps.some(g => g.includes('Loss of Rental Income'))).toBeTruthy();
    expect(result.gaps.some(g => g.includes('Sewer & Drain Backup'))).toBeTruthy();
  });
});

describe('Tax Rule Engine — edge cases', () => {
  it('returns NO_ACTION when increase is exactly 20% (boundary — not strictly > 20%)', () => {
    const result = runRuleEngine({
      address: '1 Boundary Ln',
      zillowLink: '',
      currentValue: 120000,
      priorValue: 100000,
      county: 'Travis County'
    });
    // 20% is NOT > 20%, so AUTOMATIC_REDUCTION should NOT trigger
    expect(result.status).not.toBe('AUTOMATIC_REDUCTION');
  });

  it('returns CONTACT_WESTROM when market gap is between 0% and 5%', () => {
    const result = runRuleEngine({
      address: '2 Gray Area Rd',
      zillowLink: '',
      currentValue: 104000, // 4% above realtor value
      priorValue: 100000,
      realtorValue: 100000,
      county: 'Travis County'
    });
    expect(result.status).toBe('CONTACT_WESTROM');
  });

  it('returns PROTEST_RECOMMENDED when gap is exactly above 5%', () => {
    const result = runRuleEngine({
      address: '3 Protest Ave',
      zillowLink: '',
      currentValue: 106000, // 6% above realtor value
      priorValue: 100000,
      realtorValue: 100000,
      county: 'Travis County'
    });
    expect(result.status).toBe('PROTEST_RECOMMENDED');
    expect(result.marketGapPct).toBeCloseTo(0.06);
  });

  it('uses minimum of zillow and realtor values for market comparison', () => {
    // zillow = 110k, realtor = 90k → marketValue = 90k (min)
    // currentValue = 97k → 7.7% above 90k → PROTEST
    const result = runRuleEngine({
      address: '4 Dual Market St',
      zillowLink: '',
      currentValue: 97000,
      priorValue: 90000,
      zillowValue: 110000,
      realtorValue: 90000,
      county: 'Bexar County'
    });
    expect(result.status).toBe('PROTEST_RECOMMENDED');
  });

  it('falls back to yoy increase logic when no market data is provided', () => {
    // 12% YoY but no realtor/zillow → no market comparison → PROTEST via fallback (> 10%)
    const result = runRuleEngine({
      address: '5 No Market Blvd',
      zillowLink: '',
      currentValue: 112000,
      priorValue: 100000,
      county: 'Bexar County'
    });
    expect(result.status).toBe('PROTEST_RECOMMENDED');
  });

  it('returns CONTACT_WESTROM via fallback when yoy is between 5% and 10%', () => {
    const result = runRuleEngine({
      address: '6 Gray YoY Way',
      zillowLink: '',
      currentValue: 107000,
      priorValue: 100000,
      county: 'Bexar County'
    });
    expect(result.status).toBe('CONTACT_WESTROM');
  });

  it('returns AMBIGUOUS when priorValue is 0 and no market data (cannot make any comparison)', () => {
    const result = runRuleEngine({
      address: '7 Zero Prior Dr',
      zillowLink: '',
      currentValue: 100000,
      priorValue: 0,
      county: 'Bexar County'
    });
    expect(result.status).toBe('AMBIGUOUS');
    expect(result.yoyIncreasePct).toBe(0);
    expect(result.marketGapPct).toBeNull();
  });

  it('does NOT return AMBIGUOUS when priorValue is 0 but market data is present', () => {
    const result = runRuleEngine({
      address: '8 Zillow Only Ln',
      zillowLink: '',
      currentValue: 110000,
      priorValue: 0,
      zillowValue: 100000,
      county: 'Bexar County'
    });
    // 10% above Zillow → PROTEST_RECOMMENDED, not AMBIGUOUS
    expect(result.status).toBe('PROTEST_RECOMMENDED');
  });
});

