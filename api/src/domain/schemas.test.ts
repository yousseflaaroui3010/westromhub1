import { describe, it, expect } from 'vitest';
import { parseTaxExtraction } from './schemas';

describe('parseTaxExtraction', () => {
  it('keeps the notice tax year so the form can label values with it', () => {
    const r = parseTaxExtraction({ county: 'Tarrant County', currentValue: 550000, priorValue: 460000, taxYear: 2025 });
    expect(r).toEqual({ kind: 'data', data: { county: 'Tarrant County', currentValue: 550000, priorValue: 460000, taxYear: 2025 } });
  });

  it('drops an implausible or malformed tax year but keeps the values', () => {
    for (const taxYear of [1999, 2200, 2025.5, '2025', null]) {
      const r = parseTaxExtraction({ currentValue: 550000, taxYear });
      expect(r).toEqual({ kind: 'data', data: { currentValue: 550000 } });
    }
  });

  it('a year alone is not a reading', () => {
    expect(parseTaxExtraction({ county: 'Tarrant County', taxYear: 2025 })).toEqual({ kind: 'empty' });
  });
});
