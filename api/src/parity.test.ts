// The API keeps its own copies of the rule engine and county table (the API is
// a separate package and build). These tests fail the build if they drift.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COUNTY_PORTALS } from './domain/schemas';
import { COUNTIES } from '../../src/lib/constants';

const strip = (s: string) => s.replace(/^\/\/ MIRROR[\s\S]*?\n\n/, '').trim();

describe('frontend/API parity', () => {
  it('rule engine copy matches src/lib/ruleEngine.ts', () => {
    const fe = readFileSync(resolve(__dirname, '../../src/lib/ruleEngine.ts'), 'utf8');
    const api = readFileSync(resolve(__dirname, './domain/ruleEngine.ts'), 'utf8');
    expect(strip(api)).toBe(strip(fe));
  });

  it('county portal allowlist matches the frontend county list', () => {
    const fe = Object.fromEntries(COUNTIES.map((c) => [c.name, c.url]));
    expect(COUNTY_PORTALS).toEqual(fe);
  });
});
