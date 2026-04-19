// DFW-area cities sorted longest-first to prevent partial matches
// (e.g. "LAKE WORTH" must be tried before "WORTH").
const DFW_CITIES = [
  'NORTH RICHLAND HILLS', 'WHITE SETTLEMENT', 'HIGHLAND PARK', 'UNIVERSITY PARK',
  'FLOWER MOUND', 'CEDAR HILL', 'LAKE WORTH', 'TROPHY CLUB', 'GRAND PRAIRIE',
  'BALCH SPRINGS', 'FORT WORTH', 'RICHLAND HILLS', 'HALTOM CITY', 'RIVER OAKS',
  'SANSOM PARK', 'BLUE MOUND', 'FARMERS BRANCH', 'NORTH RICHLAND HILLS',
  'ARLINGTON', 'CARROLLTON', 'LEWISVILLE', 'MANSFIELD', 'GRAPEVINE',
  'SOUTHLAKE', 'COLLEYVILLE', 'WAXAHACHIE', 'MIDLOTHIAN', 'DUNCANVILLE',
  'WATAUGA', 'SAGINAW', 'BENBROOK', 'CROWLEY', 'KENNEDALE', 'BURLESON',
  'ROANOKE', 'WESTLAKE', 'HASLET', 'CLEBURNE', 'SEAGOVILLE', 'ROWLETT',
  'WEATHERFORD', 'RICHARDSON', 'ADDISON', 'COPPELL', 'SACHSE', 'MURPHY',
  'WYLIE', 'ALLEN', 'FRISCO', 'MCKINNEY', 'GARLAND', 'IRVING', 'MESQUITE',
  'DENTON', 'PLANO', 'KELLER', 'JOSHUA', 'AZLE', 'ALEDO', 'BEDFORD',
  'EULESS', 'HURST', 'ENNIS', 'DESOTO', 'DALLAS',
].sort((a, b) => b.length - a.length);

// In-memory cache: raw input hash → normalized output.
const cache = new Map<string, string>();

/**
 * Normalizes a free-form Texas address into "STREET, CITY, TX ZIP" format
 * suitable for CAD site searches.
 *
 * Handles the most common owner input error: missing commas.
 * "12517 Lake Shore CT N FORT WORTH TX 76179"
 * → "12517 LAKE SHORE CT N, FORT WORTH, TX 76179"
 *
 * Sprint 2: replace DFW_CITIES lookup with USPS Address Validation API.
 */
export function normalizeAddress(raw: string): string {
  const key = raw.trim().toUpperCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const result = parse(key);
  cache.set(key, result);
  return result;
}

function parse(upper: string): string {
  // Already has commas — just normalize spacing around them.
  if (upper.includes(',')) {
    return upper.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').trim();
  }

  // Extract ZIP from end: "... TX 76179" or "... TX 76179-1234"
  const zipMatch = upper.match(/\s+(\d{5}(?:-\d{4})?)$/);
  if (!zipMatch) return upper;
  const zip = zipMatch[1];
  let rest = upper.slice(0, upper.length - zipMatch[0].length).trim();

  // Extract state abbreviation if present — TX is injected in the output regardless,
  // so we continue to city matching even when the owner omitted it.
  const stateMatch = rest.match(/\s+(TX|TEXAS)$/);
  if (stateMatch) {
    rest = rest.slice(0, rest.length - stateMatch[0].length).trim();
  }

  // Match known cities at the end of remaining string (longest first)
  for (const city of DFW_CITIES) {
    if (rest.endsWith(' ' + city) || rest === city) {
      const street = rest.slice(0, rest.length - city.length).trim();
      if (street.length > 0) {
        return `${street}, ${city}, TX ${zip}`;
      }
    }
  }

  // Unknown city — inject comma before TX so at least street + zip are usable
  return `${rest}, TX ${zip}`;
}

/** Splits "123 Main St, ..." into { streetNumber: "123", streetName: "Main St" } */
export function splitStreet(normalized: string): { streetNumber: string; streetName: string } {
  const segment = normalized.split(',')[0]?.trim() ?? normalized;
  const spaceIdx = segment.indexOf(' ');
  if (spaceIdx === -1) return { streetNumber: segment, streetName: '' };
  return {
    streetNumber: segment.slice(0, spaceIdx),
    streetName: segment.slice(spaceIdx + 1).trim(),
  };
}
