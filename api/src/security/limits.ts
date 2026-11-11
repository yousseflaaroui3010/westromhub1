import type { Context, MiddlewareHandler } from 'hono';
import type { CounterStore } from './store';
import { apiError } from '../http/errors';
import { getClientIp } from './clientIp';

export interface RateRule {
  /** Bucket namespace, e.g. 'extract' or 'lead-submit'. */
  name: string;
  max: number;
  windowMs: number;
  /** Defaults to the trusted client IP. */
  key?: (c: Context) => string | null;
}

/**
 * Fixed-window limiter keyed on the trusted client identity. Defense in depth
 * behind nginx's limit_req: nginx protects one replica from bursts, this one
 * (with Redis) holds longer windows and works across replicas and restarts.
 */
export function rateLimit(store: CounterStore, rule: RateRule): MiddlewareHandler {
  return async (c, next) => {
    const id = rule.key ? rule.key(c) : getClientIp(c);
    if (id === null) return next();
    const { count, resetAt } = await store.hit(`rl:${rule.name}:${id}`, rule.windowMs);
    const remaining = Math.max(0, rule.max - count);
    c.header('RateLimit-Limit', String(rule.max));
    c.header('RateLimit-Remaining', String(remaining));
    if (count > rule.max) {
      c.header('Retry-After', String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
      return apiError(c, 429, 'rate_limited', 'Too many requests. Please wait a bit and try again.');
    }
    return next();
  };
}

/**
 * Caps simultaneous in-flight paid calls (globally and per client). Rejects
 * instead of queueing: a queue just converts a flood into a slow outage.
 */
export class ConcurrencyGate {
  private active = 0;
  private readonly perClient = new Map<string, number>();

  constructor(private readonly maxGlobal: number, private readonly maxPerClient: number) {}

  tryAcquire(client: string): (() => void) | null {
    const mine = this.perClient.get(client) ?? 0;
    if (this.active >= this.maxGlobal || mine >= this.maxPerClient) return null;
    this.active += 1;
    this.perClient.set(client, mine + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      const n = (this.perClient.get(client) ?? 1) - 1;
      if (n <= 0) this.perClient.delete(client); else this.perClient.set(client, n);
    };
  }

  get inFlight(): number { return this.active; }
}

export function concurrencyLimit(gate: ConcurrencyGate): MiddlewareHandler {
  return async (c, next) => {
    const release = gate.tryAcquire(getClientIp(c));
    if (!release) {
      c.header('Retry-After', '10');
      return apiError(c, 429, 'busy', 'We are processing a lot of requests right now. Please try again in a few seconds.');
    }
    try {
      await next();
    } finally {
      release();
    }
  };
}

/**
 * Hard daily ceiling on document reads. Each read is seconds of CPU on the
 * extractor, so this bounds worst-case load and cost even if every other
 * control is bypassed.
 */
export class DailyBudget {
  constructor(
    private readonly store: CounterStore,
    private readonly cap: number,
    private readonly now: () => number = Date.now,
  ) {}

  private key(): string {
    return 'budget:extract:' + new Date(this.now()).toISOString().slice(0, 10);
  }

  /** Reserve one call. Returns false when today's cap is spent. */
  async take(): Promise<boolean> {
    if (this.cap <= 0) return true; // 0 disables the cap (tests/local only)
    const { count } = await this.store.hit(this.key(), 26 * 3600 * 1000);
    if (count === Math.floor(this.cap * 0.8)) {
      console.warn(`[budget] daily document-read cap 80% used (${count}/${this.cap})`);
    }
    if (count > this.cap) {
      if (count === this.cap + 1) console.error(`[budget] daily document-read cap reached (${this.cap}); uploads now refused`);
      return false;
    }
    return true;
  }
}
