import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  _resetSessionForTests,
  ApiError,
  extractDataFromDocument,
  generateInsuranceRecommendation,
  generateTaxRecommendation,
} from './index';
import { runInsuranceRuleEngine, runRuleEngine } from '../ruleEngine';

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
let handler: Handler;
const calls: Array<{ url: string; init: RequestInit }> = [];

beforeEach(() => {
  _resetSessionForTests();
  calls.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return handler(url, init);
  }));
});

const sessionOk = () => Response.json({ token: 'sess-1', expiresAt: Date.now() + 30 * 60_000, challenge: false });

describe('paid API client', () => {
  it('acquires one session and reuses it across calls', async () => {
    handler = (url) => (url.endsWith('/session') ? sessionOk() : Response.json({ currentValue: 1 }));
    await extractDataFromDocument('dGVzdA==', 'image/png');
    await extractDataFromDocument('dGVzdA==', 'image/png');
    expect(calls.filter((c) => c.url.endsWith('/session'))).toHaveLength(1);
    const auth = (calls[1].init.headers as Record<string, string>).Authorization;
    expect(auth).toBe('Bearer sess-1');
  });

  it('renews the session once when the server says it expired', async () => {
    let paidCalls = 0;
    handler = (url) => {
      if (url.endsWith('/session')) return sessionOk();
      paidCalls += 1;
      return paidCalls === 1
        ? Response.json({ error: 'expired', code: 'session_required', requestId: 'r' }, { status: 401 })
        : Response.json({ currentValue: 5 });
    };
    expect(await extractDataFromDocument('dGVzdA==', 'image/png')).toEqual({ currentValue: 5 });
    expect(calls.filter((c) => c.url.endsWith('/session'))).toHaveLength(2);
  });

  it('shows the server message with a short reference, never raw bodies', async () => {
    handler = (url) => url.endsWith('/session')
      ? sessionOk()
      : Response.json({ error: 'We could not read that document.', code: 'unreadable_response', requestId: 'abcdef12-3456' }, { status: 422 });
    expect(await extractDataFromDocument('dGVzdA==', 'image/png')).toEqual({ error: 'We could not read that document. (Ref: abcdef12)' });
  });

  it('returns null on a network failure so the UI can offer Retry', async () => {
    handler = () => { throw new TypeError('Failed to fetch'); };
    expect(await extractDataFromDocument('dGVzdA==', 'image/png')).toBeNull();
  });

  it('sends only typed tax values and an allowlisted county', async () => {
    handler = (url) => (url.endsWith('/session') ? sessionOk() : Response.json({ recommendation: 'ok' }));
    const result = runRuleEngine({ county: 'Not A County', currentValue: 120000.4, priorValue: 100000, address: '1 Main St' });
    await generateTaxRecommendation(result);
    const body = JSON.parse(String(calls[1].init.body));
    expect(body).toEqual({ county: 'Other (Texas)', currentValue: 120000, priorValue: 100000 });
  });

  it('strips markup from insurance labels before sending', async () => {
    handler = (url) => (url.endsWith('/session') ? sessionOk() : Response.json({ recommendation: 'ok' }));
    await generateInsuranceRecommendation(runInsuranceRuleEngine({ policyType: '<b>HO-3</b>', hasLossOfRent: false }));
    const body = JSON.parse(String(calls[1].init.body));
    expect(body).toEqual({ policyType: 'bHO-3/b', hasLossOfRent: false });
  });

  it('throws an ApiError with friendly copy on 429', async () => {
    handler = (url) => url.endsWith('/session')
      ? sessionOk()
      : Response.json({ error: 'x', code: 'rate_limited' }, { status: 429 });
    await expect(generateTaxRecommendation(runRuleEngine({ county: 'Ellis County' }))).rejects.toBeInstanceOf(ApiError);
  });
});
