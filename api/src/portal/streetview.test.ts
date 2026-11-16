import { describe, expect, it } from 'vitest';
import { googleStreetView } from './streetview';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1]);

function fakeGoogle(status: string) {
  const urls: string[] = [];
  const impl = (async (u: string) => {
    urls.push(String(u));
    if (String(u).includes('/metadata?')) return new Response(JSON.stringify({ status }), { status: 200 });
    return new Response(JPEG, { status: 200, headers: { 'content-type': 'image/jpeg' } });
  }) as unknown as typeof fetch;
  return { urls, impl };
}

describe('Google Street View reader', () => {
  it('asks nothing without a key', async () => {
    const g = fakeGoogle('OK');
    expect(await googleStreetView(async () => undefined, g.impl)('1 Main St')).toBe('off');
    expect(g.urls).toEqual([]);
  });

  it('checks the free metadata first and bills no image when Google has none', async () => {
    const g = fakeGoogle('ZERO_RESULTS');
    expect(await googleStreetView(async () => 'k', g.impl)('1 Main St, Haslet, TX 76052')).toBeNull();
    expect(g.urls).toHaveLength(1);
  });

  it('returns the picture of the address, outdoor only', async () => {
    const g = fakeGoogle('OK');
    const got = await googleStreetView(async () => 'k', g.impl)('8010 Anchorage Pl, Fort Worth, TX 76135');
    expect(got).toEqual({ bytes: JPEG, type: 'image/jpeg' });
    expect(g.urls[1]).toContain('location=8010+Anchorage+Pl%2C+Fort+Worth%2C+TX+76135');
    expect(g.urls[1]).toContain('source=outdoor');
  });

  it('fails loudly (without the key) on a refused key', async () => {
    const g = fakeGoogle('REQUEST_DENIED');
    await expect(googleStreetView(async () => 'secret-key', g.impl)('x')).rejects.toThrow(/REQUEST_DENIED/);
    await expect(googleStreetView(async () => 'secret-key', g.impl)('x')).rejects.not.toThrow(/secret-key/);
  });
});
