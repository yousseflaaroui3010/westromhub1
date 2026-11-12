// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides
// one); skipped otherwise.
import { describe, it, expect } from 'vitest';
import postgres from 'postgres';
import { cachedSecret, getOrCreateSecret } from './secretStore';
import { readSecretStrict } from '../db';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('secret store (real Postgres)', () => {
  it('concurrent first use yields one shared value, stable afterwards', async () => {
    const sql = postgres(url as string, { max: 1, onnotice: () => {} });
    await sql`DROP TABLE IF EXISTS app_secret`;
    await sql.end();
    const vals = await Promise.all([1, 2, 3, 4].map(() => getOrCreateSecret(url as string, 'extractor_token')));
    expect(new Set(vals).size).toBe(1);
    expect(vals[0]).toMatch(/^[0-9a-f]{64}$/);
    expect(await getOrCreateSecret(url as string, 'extractor_token')).toBe(vals[0]);
    expect(await getOrCreateSecret(url as string, 'another')).not.toBe(vals[0]);
  });
});

describe.skipIf(!url)('readSecretStrict (real Postgres)', () => {
  it('reads a person-added secret trimmed, null when absent, and throws when the database fails', async () => {
    const sql = postgres(url as string, { max: 1, onnotice: () => {} });
    await getOrCreateSecret(url as string, 'unrelated');
    await sql`DELETE FROM app_secret WHERE name = 'turnstile_secret_key'`;
    expect(await readSecretStrict(sql, 'turnstile_secret_key')).toBeNull();
    await sql`INSERT INTO app_secret (name, value) VALUES ('turnstile_secret_key', ' 0x4AAA-test \n')`;
    expect(await readSecretStrict(sql, 'turnstile_secret_key')).toBe('0x4AAA-test');
    await sql`DELETE FROM app_secret WHERE name = 'turnstile_secret_key'`;
    await sql.end();
    // A closed pool stands in for an unreachable database: it must not read as "absent".
    await expect(readSecretStrict(sql, 'turnstile_secret_key')).rejects.toThrow();
  });
});

describe('cachedSecret', () => {
  it('caches success, retries after failure, and never throws', async () => {
    let n = 0;
    const src = cachedSecret(async () => { n += 1; if (n === 1) throw new Error('db asleep'); return 'v'; }, 't');
    const errs: unknown[] = [];
    const orig = console.error;
    console.error = (...a: unknown[]) => { errs.push(a); };
    try {
      expect(await src()).toBeUndefined();
      expect(await src()).toBe('v');
      expect(await src()).toBe('v');
    } finally {
      console.error = orig;
    }
    expect(n).toBe(2);
  });
});
