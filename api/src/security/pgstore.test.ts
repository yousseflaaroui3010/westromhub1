import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, migrate, type Sql } from '../db';
import { PgStore } from './store';
import { leadHealth } from '../leads/store';
import { createApp } from '../app';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('shared counters and lead health (real Postgres)', () => {
  let sql: Sql;
  beforeAll(async () => { sql = connect(url as string); await migrate(sql); await sql`DELETE FROM rate_counter`; });
  afterAll(async () => { await sql.end(); });

  it('two API copies share one limit', async () => {
    const a = new PgStore(sql);
    const b = new PgStore(sql);
    const counts = [];
    for (let i = 0; i < 3; i++) { counts.push((await a.hit('ip:1', 60_000)).count, (await b.hit('ip:1', 60_000)).count); }
    expect(counts).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('concurrent hits are counted exactly once each', async () => {
    const s = new PgStore(sql);
    const res = await Promise.all(Array.from({ length: 20 }, () => s.hit('ip:burst', 60_000)));
    expect(res.map((r) => r.count).sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('a window resets after it expires', async () => {
    const s = new PgStore(sql);
    await s.hit('ip:2', 60_000);
    await sql`UPDATE rate_counter SET reset_at = now() - interval '1 second' WHERE key = 'ip:2'`;
    expect((await s.hit('ip:2', 60_000)).count).toBe(1);
  });

  it('a claim succeeds once across copies, and again after it expires', async () => {
    const a = new PgStore(sql);
    const b = new PgStore(sql);
    expect(await a.setIfAbsent('guide:x', 60_000)).toBe(true);
    expect(await b.setIfAbsent('guide:x', 60_000)).toBe(false);
    await sql`UPDATE rate_counter SET reset_at = now() - interval '1 second' WHERE key = 'guide:x'`;
    expect(await b.setIfAbsent('guide:x', 60_000)).toBe(true);
  });

  it('database down: degrades to per-process limits instead of failing', async () => {
    const broken = connect('postgresql://app@127.0.0.1:1/none');
    const orig = console.error; console.error = () => {};
    try {
      const s = new PgStore(broken);
      expect((await s.hit('k', 60_000)).count).toBe(1);
      expect(await s.setIfAbsent('c', 60_000)).toBe(true);
    } finally { console.error = orig; await broken.end({ timeout: 1 }).catch(() => {}); }
  });

  it('health endpoint: 200 when leads flow, 503 when one is stuck > 90 min (counts only)', async () => {
    await sql`DELETE FROM lead`;
    const app = createApp({
      extractor: null, allowedOrigins: ['https://wgcassetguide.com'], extractDailyCap: 0,
      leadGateway: { baseUrl: 'https://n8n.example/w', secret: 's'.repeat(40), health: () => leadHealth(sql) },
    });
    const get = () => app.fetch(new Request('http://localhost/api/leads/health', { headers: { 'X-Real-IP': '198.51.100.1' } }));
    let res = await get();
    expect(res.status).toBe(200);
    await sql`INSERT INTO lead (submission_id, payload, received_at) VALUES ('3f8fad5b-d9cb-469f-a165-708677280001', '{"zip":"76109"}', now() - interval '2 hours')`;
    res = await get();
    expect(res.status).toBe(503);
    const body = await res.json() as Record<string, unknown>;
    expect(body.pending).toBe(1);
    expect(body.oldestPendingMinutes).toBeGreaterThanOrEqual(119);
    expect(JSON.stringify(body)).not.toContain('76109');
    await sql`DELETE FROM lead`;
  });
});
