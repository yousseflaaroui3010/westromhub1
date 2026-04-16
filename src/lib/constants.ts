export const COUNTIES = [
  { name: 'Tarrant County', url: 'https://www.tad.org', description: 'Tarrant Appraisal District' },
  { name: 'Dallas County', url: 'https://www.dallascad.org', description: 'Dallas Central Appraisal District' },
  { name: 'Johnson County', url: 'https://www.johnsoncad.com', description: 'Johnson County Appraisal District' },
  { name: 'Denton County', url: 'https://www.dentoncad.com', description: 'Denton Central Appraisal District' },
  { name: 'Parker County', url: 'https://www.parkercad.org', description: 'Parker County Appraisal District' },
  { name: 'Ellis County', url: 'https://www.elliscad.com', description: 'Ellis Appraisal District' },
  { name: 'Other (Texas)', url: 'https://comptroller.texas.gov/taxes/property-tax/', description: 'Find your county appraisal district' },
] as const;

export type CountyName = (typeof COUNTIES)[number]['name'];

const KNOWN_COUNTIES = COUNTIES.filter(c => c.name !== 'Other (Texas)');

/**
 * Maps a raw county string returned by the AI to a canonical entry in COUNTIES.
 *
 * Strategy (in order):
 *  1. Case-insensitive exact match — "Tarrant County" → "Tarrant County"
 *  2. Keyword match on the county's first word — handles "Tarrant Appraisal District",
 *     "Dallas CAD", "Ellis County, TX", etc.
 *  3. No match → "Other (Texas)" (triggers the Texas comptroller fallback in the AI prompt)
 */
export function resolveCounty(extracted: string): CountyName {
  const normalized = extracted.toLowerCase().trim();

  const exact = COUNTIES.find(c => c.name.toLowerCase() === normalized);
  if (exact) return exact.name;

  const byKeyword = KNOWN_COUNTIES.find(c => {
    // Primary keyword: the word before " County" (e.g. "tarrant" from "Tarrant County")
    const keyword = c.name.toLowerCase().split(' ')[0];
    return normalized.includes(keyword);
  });

  return byKeyword?.name ?? 'Other (Texas)';
}
