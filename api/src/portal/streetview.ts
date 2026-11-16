// The real picture of a home from the street, for homes with no picture in
// Rentvine: Google's Street View Static API (licensed, server side; the key
// never reaches the browser). The free metadata call says first whether Google
// has a picture at that address, so no image is billed for a miss. Pictures are
// kept in portal_streetview, so each home is fetched from Google once.

import { imageType } from './image';

/** null: Google has no picture there. 'off': no key yet (nothing is remembered, so adding the key works at once). */
export type StreetView = (address: string) => Promise<{ bytes: Uint8Array; type: string } | null | 'off'>;

const BASE = 'https://maps.googleapis.com/maps/api/streetview';

export function googleStreetView(key: () => Promise<string | undefined>, fetchImpl: typeof fetch = fetch): StreetView {
  return async (address) => {
    const k = await key();
    if (!k) return 'off';
    const q = new URLSearchParams({ location: address, source: 'outdoor', key: k });
    const meta = await fetchImpl(`${BASE}/metadata?${q}`, { signal: AbortSignal.timeout(15_000) });
    if (!meta.ok) throw new Error(`Street View metadata HTTP ${meta.status}`);
    const status = ((await meta.json()) as { status?: string }).status;
    if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') return null;
    if (status !== 'OK') throw new Error(`Street View metadata ${String(status).slice(0, 40)}`);
    q.set('size', '640x480'); q.set('fov', '75'); q.set('return_error_code', 'true');
    const res = await fetchImpl(`${BASE}?${q}`, { signal: AbortSignal.timeout(20_000) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Street View HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = imageType(bytes);
    return type && bytes.byteLength < 5 * 1024 * 1024 ? { bytes, type } : null;
  };
}
