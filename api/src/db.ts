// The project's PRIVATE Postgres (no public endpoint). One small pool per
// process; schema migrations are idempotent and serialized on an advisory lock
// so the API and the worker can both run them at boot.

import postgres from 'postgres';

export type Sql = ReturnType<typeof postgres>;

const MIGRATION_LOCK_ID = 727270102;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS lead (
  submission_id   uuid PRIMARY KEY,
  received_at     timestamptz NOT NULL DEFAULT now(),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'dead')),
  token_verified  boolean NOT NULL DEFAULT false,
  payload         jsonb NOT NULL,
  client_ip       text,
  user_agent      text,
  attempts        integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error      text,
  delivered_at    timestamptz,
  reply           jsonb
);
CREATE INDEX IF NOT EXISTS lead_due ON lead (next_attempt_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS lead_received ON lead (received_at DESC);
`;

export function connect(url: string, max = 5): Sql {
  return postgres(url, { max, idle_timeout: 30, connect_timeout: 10, onnotice: () => {} });
}

export async function migrate(sql: Sql): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_ID})`;
    await tx.unsafe(SCHEMA);
  });
}

/** Retry an async step while the database wakes or restarts. */
export async function withRetry<T>(fn: () => Promise<T>, label: string, tries = 6): Promise<T> {
  let delay = 1_000;
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= tries) throw err;
      console.warn(`[db] ${label} failed (${err instanceof Error ? err.name : 'error'}); retry ${i}/${tries - 1} in ${delay} ms`);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 15_000);
    }
  }
}
