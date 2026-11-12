// Background worker: delivers queued leads to n8n until they are delivered.
//
// Runs as its own Railway service from the same image as the API
// (start command: node dist/worker.js), so a slow delivery never competes
// with visitors' requests. Safe to run more than one: rows are claimed with
// FOR UPDATE SKIP LOCKED leases (see leads/store.ts).

import dotenv from 'dotenv';
dotenv.config({ quiet: true });

import { connect, migrate, readSecret, withRetry, type Sql } from './db';
import { indexIsStale, syncOnce, type RentvineCreds } from './rentvine/sync';
import { pgLeadStore, MAX_ATTEMPTS, type LeadStore } from './leads/store';
import { deliverLead, type Upstream } from './leads/deliver';
import { cachedSecret, getOrCreateSecret } from './security/secretStore';

const POLL_MS = 15_000;
const BATCH = 10;

/** One pass over due leads. Exported for tests. */
export async function deliverDue(store: LeadStore, up: Upstream, log = console): Promise<{ delivered: number; failed: number; dead: number }> {
  const out = { delivered: 0, failed: 0, dead: 0 };
  for (const row of await store.claimDue(BATCH)) {
    try {
      const reply = await deliverLead(up, row, 20_000);
      await store.markDelivered(row.submission_id, reply);
      out.delivered += 1;
      log.info?.(`[worker] delivered lead ${row.submission_id.slice(0, 8)} after ${row.attempts + 1} attempt(s)`);
    } catch (err) {
      const attempts = row.attempts + 1;
      const verdict = await store.markFailed(row.submission_id, attempts, err instanceof Error ? err.message : 'error');
      if (verdict === 'dead') {
        out.dead += 1;
        log.error(`[worker] LEAD UNDELIVERED after ${MAX_ATTEMPTS} attempts: ${row.submission_id} (kept in the database; needs a person)`);
      } else {
        out.failed += 1;
        log.warn(`[worker] delivery attempt ${attempts} failed for ${row.submission_id.slice(0, 8)} (${err instanceof Error ? err.message : 'error'}); will retry`);
      }
    }
  }
  return out;
}

/** 03:17 America/Chicago today, as epoch ms. */
function nightlySlot(now = new Date()): string {
  const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const get = (t: string) => local.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}`;
}

function rentvineCreds(sql: Sql, corporationId: string) {
  return async (): Promise<RentvineCreds | null> => {
    const [apiKey, apiSecret] = await Promise.all([readSecret(sql, 'rentvine_api_key'), readSecret(sql, 'rentvine_api_secret')]);
    return apiKey && apiSecret ? { apiKey, apiSecret, corporationId } : null;
  };
}

async function main() {
  const env = process.env;
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!env.N8N_LEAD_WEBHOOK_BASE) throw new Error('N8N_LEAD_WEBHOOK_BASE is required');
  const sql = connect(env.DATABASE_URL, 3);
  await withRetry(() => migrate(sql), 'migrate', 10);
  const store = pgLeadStore(sql);
  const up: Upstream = {
    baseUrl: env.N8N_LEAD_WEBHOOK_BASE.replace(/\/+$/, ''),
    secret: cachedSecret(() => getOrCreateSecret(env.DATABASE_URL as string, 'n8n_gateway_secret', env.N8N_GATEWAY_SECRET), 'n8n_gateway_secret'),
  };

  let running = false;
  let wake = false;
  const tick = async () => {
    if (running) { wake = true; return; }
    running = true;
    try {
      do {
        wake = false;
        await deliverDue(store, up);
      } while (wake);
    } catch (err) {
      console.error(`[worker] pass failed: ${err instanceof Error ? err.name : 'error'}`);
    } finally {
      running = false;
    }
  };

  // Rentvine -> estimator index: at start if stale, then nightly 03:17 Chicago.
  const creds = rentvineCreds(sql, (env.RENTVINE_CORPORATION_ID || 'westromgroup').toLowerCase());
  let syncing = false;
  let lastNightly = '';
  const rentvine = async (why: string) => {
    if (syncing) return;
    syncing = true;
    try {
      console.log(`[rentvine] sync (${why})`);
      await syncOnce(sql, creds);
    } finally {
      syncing = false;
    }
  };
  void withRetry(() => indexIsStale(sql), 'index check', 5).then((stale) => (stale ? rentvine('stale at start') : undefined)).catch(() => {});
  const nightly = setInterval(() => {
    const slot = nightlySlot();
    if (slot.endsWith(' 03:17') && slot !== lastNightly) { lastNightly = slot; void rentvine('nightly'); }
  }, 30_000);
  // Expired rate-limit counters (the API's shared limits) are swept here.
  const sweep = setInterval(() => {
    void sql`DELETE FROM rate_counter WHERE reset_at < now() - interval '1 hour'`.catch(() => {});
  }, 10 * 60_000);

  // A person can trigger a sync right after adding the key: NOTIFY rentvine_sync.
  await sql.listen('rentvine_sync', () => { void rentvine('requested'); });

  // Wake immediately when the API queues a lead; poll as a safety net.
  await sql.listen('lead_pending', () => { void tick(); });
  const timer = setInterval(() => { void tick(); }, POLL_MS);
  void tick();
  console.log('[worker] lead delivery running');

  const stop = async () => {
    clearInterval(timer);
    clearInterval(nightly);
    clearInterval(sweep);
    await sql.end({ timeout: 5 }).catch(() => {});
    process.exit(0);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('FATAL: worker failed to start:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
