// Durable lead store + delivery bookkeeping (accept, then deliver).
//
// Every lead the gateway accepts is written here FIRST, then delivered to n8n
// WF-1 (which creates the LeadSimple deal and sends the emails). If n8n is
// down, slow or restarting, the lead stays 'pending' and the worker retries
// with exponential backoff until it is delivered; after MAX_ATTEMPTS it is
// marked 'dead' and logged as an error (alert), never dropped silently.
// Leads are kept permanently (owner decision, 2026-11-12).
//
// Claiming uses a lease: next_attempt_at is pushed into the future when a
// sender takes a row, and `FOR UPDATE SKIP LOCKED` lets any number of API
// replicas and workers share the queue without delivering a lead twice.
// WF-1 also dedupes on submission_id, as a second guard.

import type { Sql } from '../db';

export const LEASE_MS = 120_000;
export const MAX_ATTEMPTS = 30;

export interface LeadRow {
  submission_id: string;
  status: 'pending' | 'delivered' | 'dead';
  token_verified: boolean;
  payload: Record<string, unknown>;
  client_ip: string | null;
  user_agent: string | null;
  attempts: number;
  reply: unknown;
}

export interface NewLead {
  submissionId: string;
  tokenVerified: boolean;
  payload: Record<string, unknown>;
  clientIp: string;
  userAgent: string;
  estimate?: unknown;
}

/** Backoff after `attempts` failures: 30 s, 1, 2, 4, 8, 16, 32 min, then hourly. */
export function backoffMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);
}

export interface LeadStore {
  /** Insert as pending, leased to the caller. Returns null if it already existed. */
  insert(lead: NewLead): Promise<LeadRow | null>;
  get(submissionId: string): Promise<LeadRow | null>;
  markDelivered(submissionId: string, reply: unknown): Promise<void>;
  /** Record a failed attempt; schedules the retry or marks the lead dead. */
  markFailed(submissionId: string, attempts: number, error: string): Promise<'retry' | 'dead'>;
  /** Lease up to `limit` due leads for delivery. */
  claimDue(limit: number): Promise<LeadRow[]>;
  notify(): Promise<void>;
}

export function pgLeadStore(sql: Sql): LeadStore {
  return {
    async insert(l) {
      const rows = await sql<LeadRow[]>`
        INSERT INTO lead (submission_id, token_verified, payload, client_ip, user_agent, estimate, next_attempt_at)
        VALUES (${l.submissionId}, ${l.tokenVerified}, ${sql.json(l.payload as never)}, ${l.clientIp}, ${l.userAgent},
                ${l.estimate ? sql.json(l.estimate as never) : null},
                now() + ${LEASE_MS / 1000} * interval '1 second')
        ON CONFLICT (submission_id) DO NOTHING
        RETURNING *`;
      return rows[0] ?? null;
    },
    async get(id) {
      const rows = await sql<LeadRow[]>`SELECT * FROM lead WHERE submission_id = ${id}`;
      return rows[0] ?? null;
    },
    async markDelivered(id, reply) {
      await sql`UPDATE lead SET status = 'delivered', delivered_at = now(), reply = ${sql.json((reply ?? null) as never)},
                attempts = attempts + 1, last_error = NULL WHERE submission_id = ${id}`;
    },
    async markFailed(id, attempts, error) {
      const dead = attempts >= MAX_ATTEMPTS;
      await sql`UPDATE lead SET attempts = ${attempts}, last_error = ${error.slice(0, 500)},
                status = ${dead ? 'dead' : 'pending'},
                next_attempt_at = now() + ${backoffMs(attempts) / 1000} * interval '1 second'
                WHERE submission_id = ${id}`;
      return dead ? 'dead' : 'retry';
    },
    async claimDue(limit) {
      return sql<LeadRow[]>`
        UPDATE lead SET next_attempt_at = now() + ${LEASE_MS / 1000} * interval '1 second'
        WHERE submission_id IN (
          SELECT submission_id FROM lead
          WHERE status = 'pending' AND next_attempt_at <= now()
          ORDER BY received_at
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED)
        RETURNING *`;
    },
    async notify() {
      await sql`NOTIFY lead_pending`;
    },
  };
}
