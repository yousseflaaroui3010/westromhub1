// Deterministic recommendation text. Replaces the AI text providers: the rule
// engine already decides the outcome, so the wording is a template over its
// numbers. Same input -> same output, no cost, nothing sent to a third party.
//
// Output is a small HTML fragment using only the tags the UI sanitizer allows
// (p, ul, li, strong). Every interpolated value is either a number we format
// or a validated label that goes through escapeHtml.

import type { AnalysisResult, InsuranceAnalysisResult } from './ruleEngine';
import { COUNTY_PORTALS, type CountyName } from './schemas';

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** 0.2534 -> "25.3%". Whole numbers drop the decimal: 0.25 -> "25%". */
function pct(ratio: number): string {
  const v = Math.round(Math.abs(ratio) * 1000) / 10;
  return `${Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1)}%`;
}

const b = (s: string) => `<strong>${s}</strong>`;
const p = (...sentences: string[]) => `<p>${sentences.filter(Boolean).join(' ')}</p>`;
const ul = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');

// --- Property tax ---------------------------------------------------------

export interface TaxRecommendationInput {
  county: CountyName;
  currentValue?: number;
  priorValue?: number;
  zillowValue?: number;
  realtorValue?: number;
}

function marketReference(i: TaxRecommendationInput): { value: number; label: string } | null {
  const z = i.zillowValue && i.zillowValue > 0 ? i.zillowValue : undefined;
  const r = i.realtorValue && i.realtorValue > 0 ? i.realtorValue : undefined;
  if (z && r) {
    return z <= r
      ? { value: z, label: 'the lower of your two market estimates (Zillow)' }
      : { value: r, label: 'the lower of your two market estimates (Realtor.com)' };
  }
  if (z) return { value: z, label: 'your Zillow estimate' };
  if (r) return { value: r, label: 'your Realtor.com estimate' };
  return null;
}

function countyLine(county: CountyName, protest: boolean): string {
  if (county === 'Other (Texas)') {
    return `To find your appraisal district and its protest forms, start at the Texas Comptroller's property tax page (${COUNTY_PORTALS[county]}).`;
  }
  return protest ? `Your appraisal district's website is ${COUNTY_PORTALS[county].replace(/^https:\/\//, '')}.` : '';
}

export function buildTaxRecommendation(input: TaxRecommendationInput, result: AnalysisResult): string {
  const cur = input.currentValue ?? 0;
  const prior = input.priorValue ?? 0;
  const market = marketReference(input);
  const yoy = result.yoyIncreasePct;
  const gap = result.marketGapPct;

  if (cur <= 0) {
    return p(
      'Enter the current appraised value from your notice to get a recommendation.',
      countyLine(input.county, false),
    );
  }

  switch (result.status) {
    case 'AUTOMATIC_REDUCTION': {
      const capped = Math.round(prior * 1.2);
      return p(
        `Your appraised value went from ${b(usd(prior))} to ${b(usd(cur))}, an increase of ${b(pct(yoy))} in one year.`,
        'Texas limits yearly increases in the appraised value of most non-homestead properties to 20% (the "circuit breaker" limit, for properties valued under about $5 million that you owned on January 1 of last year).',
        `If it applies to your property, the value your taxes are based on should be no more than ${b(usd(capped))} plus the value of any new construction; check that your notice shows this, and ask the appraisal district to correct it if it does not.`,
        countyLine(input.county, true),
      );
    }

    case 'PROTEST_RECOMMENDED': {
      if (market && gap !== null) {
        return p(
          `The county's value of ${b(usd(cur))} is ${b(pct(gap))} (${b(usd(cur - market.value))}) higher than ${market.label} of ${b(usd(market.value))}.`,
          'A gap this size is a common basis for a successful protest, especially if you can back it up with recent sales of similar homes nearby.',
          countyLine(input.county, true),
        );
      }
      return p(
        `Your appraised value went from ${b(usd(prior))} to ${b(usd(cur))}, an increase of ${b(pct(yoy))} (${b(usd(cur - prior))}) in one year.`,
        'An increase this large is worth challenging, especially if the condition of the property or recent nearby sales do not support it.',
        'Adding a Zillow or Realtor.com estimate above will make this check more precise.',
        countyLine(input.county, true),
      );
    }

    case 'CONTACT_WESTROM': {
      const why = market && gap !== null
        ? `The county's value of ${b(usd(cur))} is only ${b(pct(gap))} above ${market.label} of ${b(usd(market.value))}.`
        : `Your appraised value rose ${b(pct(yoy))}, from ${b(usd(prior))} to ${b(usd(cur))}.`;
      return p(
        why,
        'That is close enough that a protest could go either way: the result usually depends on the property\'s condition and the specific sales the appraisal district used.',
        'A second opinion before you file is the best next step, and Westrom will review it with you for free.',
        countyLine(input.county, false),
      );
    }

    case 'NO_ACTION': {
      let why: string;
      if (market && gap !== null) {
        why = gap < 0
          ? `The county's value of ${b(usd(cur))} is ${b(pct(gap))} below ${market.label} of ${b(usd(market.value))}.`
          : `The county's value of ${b(usd(cur))} matches ${market.label}.`;
      } else if (prior > 0 && cur < prior) {
        why = `Your appraised value went down ${b(pct(yoy))}, from ${b(usd(prior))} to ${b(usd(cur))}.`;
      } else if (prior > 0) {
        why = `Your appraised value rose a modest ${b(pct(yoy))}, from ${b(usd(prior))} to ${b(usd(cur))}.`;
      } else {
        why = `The county's value of ${b(usd(cur))} looks reasonable based on what you entered.`;
      }
      return p(
        why,
        'That is in line with the market, so a protest is unlikely to lower it enough to be worth the effort this year.',
        'Keep your notice and check again next year.',
      );
    }

    case 'AMBIGUOUS':
    default:
      return p(
        `We have your current value of ${b(usd(cur))} but nothing to compare it with yet.`,
        'Enter last year\'s appraised value (it is usually printed on the same notice) or a Zillow or Realtor.com estimate, or contact Westrom for a free review.',
        countyLine(input.county, false),
      );
  }
}

// --- Insurance --------------------------------------------------------------

const INS_HEADLINE: Record<InsuranceAnalysisResult['status'], string> = {
  CRITICAL_WARNING: `${b('This policy needs attention before anything else.')} It appears to be a homeowners policy, and homeowners policies generally do not cover a home that is rented out, so a claim could be denied.`,
  UPGRADE_RECOMMENDED: `${b('This policy has coverage gaps worth fixing.')} None of them is an emergency on its own, but each one is a claim you could end up paying yourself.`,
  OPTIMIZATION_POSSIBLE: `${b('Your coverage looks right for a rental.')} There may be room to lower your premium by adjusting your deductibles.`,
  GOOD_STANDING: `${b('This looks like a solid landlord policy.')} We did not find coverage gaps in the details we could read.`,
};

/** Parses "$1,000" -> 1000 and "2%" -> {pct: 2}. Anything else -> null. */
function readDeductible(s: string | undefined): { usd: number } | { pct: number } | null {
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) return { pct: Number(m[1]) };
  const digits = s.replace(/[^\d.]/g, '');
  return digits ? { usd: Math.round(Number(digits)) } : null;
}

export function buildInsuranceRecommendation(result: InsuranceAnalysisResult): string {
  const d = result.data;
  const parts: string[] = [p(INS_HEADLINE[result.status])];

  const findings = [...result.gaps, ...result.optimizations].map(escapeHtml);
  if (findings.length) parts.push(p(b('What we found:')), ul(findings));

  const details: string[] = [];
  if (d.policyType) details.push(`Policy type: ${b(escapeHtml(d.policyType))}`);
  if (d.annualPremium) details.push(`Annual premium: ${b(usd(d.annualPremium))}`);
  if (d.windHailDeductible) details.push(`Wind/hail deductible: ${b(escapeHtml(d.windHailDeductible))}`);
  if (d.aopDeductible) details.push(`All other perils deductible: ${b(escapeHtml(d.aopDeductible))}`);

  const questions: string[] = [];
  const pt = (d.policyType ?? '').toUpperCase();
  if (result.status === 'CRITICAL_WARNING') {
    questions.push('Can you move this property to a landlord (dwelling) policy, ideally a DP-3, and is anything I have now not covered while it is rented?');
  } else if (!pt) {
    questions.push('Is this a landlord (dwelling) policy, and is it a DP-3 that pays replacement cost?');
  } else if (/DP-?1|BASIC/.test(pt)) {
    questions.push('What would a DP-3 (replacement cost) policy cost compared with my current DP-1?');
  }

  const wh = readDeductible(d.windHailDeductible);
  if (wh && 'pct' in wh) {
    questions.push(`What is my ${wh.pct}% wind/hail deductible in dollars, and what would the premium be with a flat deductible instead?`);
  } else if (wh && 'usd' in wh && wh.usd <= 2000) {
    questions.push('What would my premium be with a 1% or 2% wind/hail deductible?');
  } else if (!wh) {
    questions.push('What is my wind/hail deductible, and is it a flat amount or a percentage of the dwelling coverage?');
  }

  if (d.hasLossOfRent === false) questions.push('Can you add loss of rent (fair rental value) coverage, and for how many months would it pay?');
  else if (d.hasLossOfRent === undefined) questions.push('Does this policy include loss of rent (fair rental value) coverage?');

  if (d.hasWaterBackup === false) questions.push('Can you add sewer and drain backup coverage, and what limit do you recommend?');
  else if (d.hasWaterBackup === undefined) questions.push('Does this policy include sewer and drain backup coverage?');

  if (details.length) parts.push(p(b('Your policy at a glance:')), ul(details));
  if (questions.length) parts.push(p(b('Questions to ask your agent:')), ul(questions.slice(0, 4)));
  if (result.status !== 'GOOD_STANDING') {
    parts.push(p('You can also compare quotes with the brokers listed below.'));
  }
  return parts.join('');
}
