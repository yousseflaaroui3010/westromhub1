/**
 * Counter store for rate limits, quotas and spend caps.
 *
 * `hit(key, windowMs)` atomically increments a counter that expires windowMs
 * after its FIRST hit (fixed window) and returns the new count + reset time.
 * `setIfAbsent` is a TTL'd "claim" used for single-use tokens and cooldowns.
 *
 * Two implementations:
 *  - MemoryStore: one process only. TTL eviction + a hard key cap, so a flood
 *    of unique keys (the old limiter's failure mode) cannot grow memory without
 *    bound. Counts reset on restart.
 *  - RedisStore: shared across replicas and restarts. Enabled by REDIS_URL.
 *    If Redis errors, it degrades to an internal MemoryStore rather than
 *    failing open (no limits) or failing closed (site down).
 */
import type { Redis as RedisClient } from 'ioredis';

export interface HitResult {
  count: number;
  resetAt: number; // epoch ms
}

export interface CounterStore {
  hit(key: string, windowMs: number): Promise<HitResult>;
  /** Returns true if the key was newly set (claim succeeded), false if it existed. */
  setIfAbsent(key: string, ttlMs: number): Promise<boolean>;
  readonly kind: 'memory' | 'redis' | 'postgres';
}

interface Entry { count: number; resetAt: number }

export class MemoryStore implements CounterStore {
  readonly kind = 'memory' as const;
  private readonly map = new Map<string, Entry>();
  private lastSweep = 0;

  constructor(
    private readonly maxKeys = 50_000,
    private readonly now: () => number = Date.now,
  ) {}

  private sweep(force = false): void {
    const t = this.now();
    if (!force && t - this.lastSweep < 30_000 && this.map.size < this.maxKeys) return;
    this.lastSweep = t;
    for (const [k, v] of this.map) if (v.resetAt <= t) this.map.delete(k);
    // Still over the cap after expiring: drop oldest-inserted keys. Map keeps
    // insertion order, so this is O(excess). Under a unique-key flood this
    // forgets attackers' oldest buckets, never grows past the cap.
    if (this.map.size >= this.maxKeys) {
      const excess = this.map.size - Math.floor(this.maxKeys * 0.9);
      let i = 0;
      for (const k of this.map.keys()) {
        if (i++ >= excess) break;
        this.map.delete(k);
      }
    }
  }

  async hit(key: string, windowMs: number): Promise<HitResult> {
    this.sweep();
    const t = this.now();
    const cur = this.map.get(key);
    if (!cur || cur.resetAt <= t) {
      const e = { count: 1, resetAt: t + windowMs };
      this.map.set(key, e);
      return { ...e };
    }
    cur.count += 1;
    return { ...cur };
  }

  async setIfAbsent(key: string, ttlMs: number): Promise<boolean> {
    this.sweep();
    const t = this.now();
    const cur = this.map.get(key);
    if (cur && cur.resetAt > t) return false;
    this.map.set(key, { count: 1, resetAt: t + ttlMs });
    return true;
  }

  get size(): number { return this.map.size; }
}

// INCR + set expiry on first hit, atomically. Returns [count, pttl].
const HIT_SCRIPT = `
local c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {c, ttl}`;

export class RedisStore implements CounterStore {
  readonly kind = 'redis' as const;
  private readonly fallback = new MemoryStore();
  private warned = false;

  constructor(private readonly redis: RedisClient, private readonly prefix = 'wgc:') {}

  private degrade(err: unknown): void {
    if (!this.warned) {
      this.warned = true;
      console.error('[store] Redis unavailable, using per-process limits:', err instanceof Error ? err.message : 'error');
      setTimeout(() => { this.warned = false; }, 60_000).unref();
    }
  }

  async hit(key: string, windowMs: number): Promise<HitResult> {
    try {
      const res = (await this.redis.eval(HIT_SCRIPT, 1, this.prefix + key, String(windowMs))) as [number, number];
      return { count: Number(res[0]), resetAt: Date.now() + Number(res[1]) };
    } catch (err) {
      this.degrade(err);
      return this.fallback.hit(key, windowMs);
    }
  }

  async setIfAbsent(key: string, ttlMs: number): Promise<boolean> {
    try {
      const r = await this.redis.set(this.prefix + key, '1', 'PX', ttlMs, 'NX');
      return r === 'OK';
    } catch (err) {
      this.degrade(err);
      return this.fallback.setIfAbsent(key, ttlMs);
    }
  }
}

export async function createStore(redisUrl: string | undefined): Promise<CounterStore> {
  if (!redisUrl) return new MemoryStore();
  const { default: Redis } = await import('ioredis');
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 3_000,
    family: 0, // Railway private networking is IPv6; 0 = dual-stack lookup
    lazyConnect: true,
  });
  client.on('error', () => { /* surfaced per-call via RedisStore.degrade */ });
  // Wait for the first connection so we do not start in degraded mode. If it
  // fails, ioredis keeps reconnecting in the background; calls degrade until then.
  await client.connect().catch((err: unknown) => {
    console.error('[store] Redis connect failed at boot, will retry:', err instanceof Error ? err.message : 'error');
  });
  return new RedisStore(client);
}

/**
 * Counters in the private Postgres (UNLOGGED table: fast, and losing it on a
 * crash only resets rate limits). Shared by every API replica, so limits stay
 * global when more than one copy runs. Each operation is one atomic upsert.
 * Database trouble degrades to per-process limits, never to a failed request.
 */
export class PgStore implements CounterStore {
  readonly kind = 'postgres' as const;
  private readonly fallback = new MemoryStore();
  private warned = false;

  constructor(private readonly sql: import('../db').Sql) {}

  private degrade(err: unknown): void {
    if (!this.warned) {
      this.warned = true;
      console.error('[store] Postgres counters unavailable, using per-process limits:', err instanceof Error ? err.name : 'error');
      setTimeout(() => { this.warned = false; }, 60_000).unref();
    }
  }

  async hit(key: string, windowMs: number): Promise<HitResult> {
    try {
      const secs = windowMs / 1000;
      const rows = await this.sql<{ count: number; reset_at: Date }[]>`
        INSERT INTO rate_counter (key, count, reset_at) VALUES (${key}, 1, now() + ${secs} * interval '1 second')
        ON CONFLICT (key) DO UPDATE SET
          count    = CASE WHEN rate_counter.reset_at <= now() THEN 1 ELSE rate_counter.count + 1 END,
          reset_at = CASE WHEN rate_counter.reset_at <= now() THEN now() + ${secs} * interval '1 second' ELSE rate_counter.reset_at END
        RETURNING count, reset_at`;
      return { count: Number(rows[0].count), resetAt: rows[0].reset_at.getTime() };
    } catch (err) {
      this.degrade(err);
      return this.fallback.hit(key, windowMs);
    }
  }

  async setIfAbsent(key: string, ttlMs: number): Promise<boolean> {
    try {
      const rows = await this.sql`
        INSERT INTO rate_counter (key, count, reset_at) VALUES (${key}, 1, now() + ${ttlMs / 1000} * interval '1 second')
        ON CONFLICT (key) DO UPDATE SET count = 1, reset_at = EXCLUDED.reset_at
          WHERE rate_counter.reset_at <= now()
        RETURNING key`;
      return rows.length === 1;
    } catch (err) {
      this.degrade(err);
      return this.fallback.setIfAbsent(key, ttlMs);
    }
  }
}
