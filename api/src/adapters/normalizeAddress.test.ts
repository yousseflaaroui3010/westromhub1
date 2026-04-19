import { describe, it, expect } from 'vitest';
import { normalizeAddress, splitStreet } from './normalizeAddress';

describe('normalizeAddress', () => {
  it('injects commas into comma-free DFW address', () => {
    expect(normalizeAddress('12517 Lake Shore CT N FORT WORTH TX 76179'))
      .toBe('12517 LAKE SHORE CT N, FORT WORTH, TX 76179');
  });

  it('normalizes spacing around existing commas', () => {
    expect(normalizeAddress('123 Main St,  Fort Worth,  TX  76102'))
      .toBe('123 MAIN ST, FORT WORTH, TX 76102');
  });

  it('handles already-correct address unchanged (aside from upper-case)', () => {
    expect(normalizeAddress('123 Main St, Fort Worth, TX 76102'))
      .toBe('123 MAIN ST, FORT WORTH, TX 76102');
  });

  it('handles Dallas address', () => {
    expect(normalizeAddress('4500 Oak Lawn Ave DALLAS TX 75219'))
      .toBe('4500 OAK LAWN AVE, DALLAS, TX 75219');
  });

  it('handles multi-word city NORTH RICHLAND HILLS', () => {
    const result = normalizeAddress('6200 Davis Blvd NORTH RICHLAND HILLS TX 76182');
    expect(result).toBe('6200 DAVIS BLVD, NORTH RICHLAND HILLS, TX 76182');
  });

  it('handles ZIP+4 format', () => {
    expect(normalizeAddress('123 Main St FORT WORTH TX 76102-1234'))
      .toBe('123 MAIN ST, FORT WORTH, TX 76102-1234');
  });

  it('returns input with minimal commas when city is unknown', () => {
    const result = normalizeAddress('123 Main St UNKNOWNCITY TX 99999');
    expect(result).toContain('TX 99999');
  });

  it('handles address WITHOUT TX state abbreviation — common owner typo', () => {
    expect(normalizeAddress('7612 Dover Ln Richland Hills 76118'))
      .toBe('7612 DOVER LN, RICHLAND HILLS, TX 76118');
  });

  it('handles Dallas address without TX', () => {
    expect(normalizeAddress('4500 Oak Lawn Ave Dallas 75219'))
      .toBe('4500 OAK LAWN AVE, DALLAS, TX 75219');
  });

  it('handles multi-word city NORTH RICHLAND HILLS without TX', () => {
    expect(normalizeAddress('6200 Davis Blvd North Richland Hills 76182'))
      .toBe('6200 DAVIS BLVD, NORTH RICHLAND HILLS, TX 76182');
  });

  it('returns cached result on repeated calls', () => {
    const first = normalizeAddress('999 Test Rd KELLER TX 76248');
    const second = normalizeAddress('999 Test Rd KELLER TX 76248');
    expect(first).toBe(second);
  });
});

describe('splitStreet', () => {
  it('splits "123 Main St, Fort Worth, TX 76102" correctly', () => {
    expect(splitStreet('123 MAIN ST, FORT WORTH, TX 76102'))
      .toEqual({ streetNumber: '123', streetName: 'MAIN ST' });
  });

  it('handles address with no comma', () => {
    const result = splitStreet('123 OAK STREET');
    expect(result.streetNumber).toBe('123');
    expect(result.streetName).toBe('OAK STREET');
  });

  it('handles single-token address', () => {
    const result = splitStreet('123');
    expect(result.streetNumber).toBe('123');
    expect(result.streetName).toBe('');
  });
});
