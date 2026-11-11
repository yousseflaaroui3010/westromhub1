import { describe, it, expect } from 'vitest';
import { runInsuranceRuleEngine, runRuleEngine } from './ruleEngine';
import { buildInsuranceRecommendation, buildTaxRecommendation, type TaxRecommendationInput } from './recommendations';

const tax = (i: TaxRecommendationInput) => buildTaxRecommendation(i, runRuleEngine({ ...i }));
const ins = (d: Parameters<typeof runInsuranceRuleEngine>[0]) => buildInsuranceRecommendation(runInsuranceRuleEngine(d));
const ONLY_ALLOWED_TAGS = /^(?:[^<]|<\/?(?:p|ul|li|strong)>)*$/;

describe('tax recommendation templates', () => {
  it('AUTOMATIC_REDUCTION states the increase and the 20% capped value', () => {
    const t = tax({ county: 'Tarrant County', currentValue: 300_000, priorValue: 240_000 });
    expect(t).toContain('<strong>25%</strong>');
    expect(t).toContain('<strong>$288,000</strong>');
    expect(t).toContain('www.tad.org');
  });

  it('PROTEST_RECOMMENDED with market data quotes the gap against the LOWER estimate', () => {
    const t = tax({ county: 'Dallas County', currentValue: 330_000, priorValue: 320_000, zillowValue: 300_000, realtorValue: 310_000 });
    expect(t).toContain('<strong>10%</strong>');
    expect(t).toContain('<strong>$30,000</strong>');
    expect(t).toContain('(Zillow)');
  });

  it('PROTEST_RECOMMENDED from year-over-year only suggests adding a market estimate', () => {
    const t = tax({ county: 'Denton County', currentValue: 115_000, priorValue: 100_000 });
    expect(t).toContain('<strong>15%</strong>');
    expect(t).toContain('Zillow or Realtor.com estimate');
  });

  it('CONTACT_WESTROM offers a free review', () => {
    const t = tax({ county: 'Parker County', currentValue: 103_000, zillowValue: 100_000 });
    expect(t).toContain('<strong>3%</strong>');
    expect(t).toContain('free');
  });

  it('NO_ACTION covers below-market, decrease and modest increase', () => {
    expect(tax({ county: 'Ellis County', currentValue: 90_000, zillowValue: 100_000 })).toContain('below');
    expect(tax({ county: 'Ellis County', currentValue: 90_000, priorValue: 100_000 })).toContain('went down <strong>10%</strong>');
    expect(tax({ county: 'Ellis County', currentValue: 103_000, priorValue: 100_000 })).toContain('modest <strong>3%</strong>');
  });

  it('AMBIGUOUS asks for a comparison value', () => {
    expect(tax({ county: 'Johnson County', currentValue: 200_000 })).toContain("last year's appraised value");
  });

  it('Other (Texas) points to the Comptroller, never a specific CAD', () => {
    const t = tax({ county: 'Other (Texas)', currentValue: 300_000, priorValue: 200_000 });
    expect(t).toContain('comptroller.texas.gov');
    expect(t).not.toMatch(/tad\.org|dallascad/);
  });

  it('handles a missing current value without NaN', () => {
    const t = tax({ county: 'Ellis County', priorValue: 100_000 });
    expect(t).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('only ever emits the allowed tags and never NaN/undefined across a value sweep', () => {
    const vals = [undefined, 0, 1, 50_000, 99_999, 100_000, 104_000, 112_000, 125_000, 1_000_000_000];
    const counties: TaxRecommendationInput['county'][] = ['Tarrant County', 'Other (Texas)'];
    for (const county of counties) for (const currentValue of vals) for (const priorValue of vals) for (const zillowValue of [undefined, 100_000]) {
      const t = tax({ county, currentValue, priorValue, zillowValue });
      expect(t).toMatch(ONLY_ALLOWED_TAGS);
      expect(t).not.toMatch(/NaN|undefined|Infinity|null/);
    }
  });
});

describe('insurance recommendation templates', () => {
  it('HO-3 is a critical warning that asks to move to a landlord policy', () => {
    const t = ins({ policyType: 'HO-3', hasLossOfRent: true, hasWaterBackup: true, windHailDeductible: '1%' });
    expect(t).toContain('needs attention');
    expect(t).toContain('DP-3');
  });

  it('lists every gap and asks targeted questions', () => {
    const t = ins({ policyType: 'DP-3', hasLossOfRent: false, hasWaterBackup: false, windHailDeductible: '$1,000', annualPremium: 1840 });
    expect(t).toContain('Missing Loss of Rental Income');
    expect(t).toContain('Missing Sewer &amp; Drain Backup');
    expect(t).toContain('<strong>$1,840</strong>');
    expect(t).toContain('1% or 2% wind/hail deductible');
  });

  it('percentage deductible asks for the dollar amount', () => {
    expect(ins({ policyType: 'DP-3', windHailDeductible: '2%', hasLossOfRent: true, hasWaterBackup: true })).toContain('What is my 2% wind/hail deductible in dollars');
  });

  it('good standing has no broker nudge and no gap list', () => {
    const t = ins({ policyType: 'DP-3', windHailDeductible: '1%', aopDeductible: '$2,500', hasLossOfRent: true, hasWaterBackup: true });
    expect(t).toContain('solid landlord policy');
    expect(t).not.toContain('What we found');
    expect(t).not.toContain('brokers');
  });

  it('escapes labels and only emits allowed tags', () => {
    const t = ins({ policyType: 'DP-3 & Co', aopDeductible: '$1,000' });
    expect(t).toContain('DP-3 &amp; Co');
    expect(t).toMatch(ONLY_ALLOWED_TAGS);
  });
});
