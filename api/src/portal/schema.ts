// Owner portal tables in the project's private Postgres.
// People, their access to portfolios, sessions and invites, plus the copies of
// Rentvine data the portal shows (owner and tenant names, addresses, money).
// Nothing here is reachable without a signed-in session: see portal/routes.ts.

export const PORTAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS portal_user (
  id             bigserial PRIMARY KEY,
  email          text NOT NULL UNIQUE CHECK (email = lower(email)),
  name           text NOT NULL,
  password_hash  text,
  staff          boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  disabled_at    timestamptz
);
CREATE TABLE IF NOT EXISTS portal_member (
  portfolio_id   text NOT NULL,
  user_id        bigint NOT NULL REFERENCES portal_user(id) ON DELETE CASCADE,
  role           text NOT NULL CHECK (role IN ('owner', 'accountant', 'prospect')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, user_id)
);
CREATE INDEX IF NOT EXISTS portal_member_user ON portal_member (user_id);
CREATE TABLE IF NOT EXISTS portal_session (
  token_hash     text PRIMARY KEY,
  user_id        bigint NOT NULL REFERENCES portal_user(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  ip             text
);
CREATE INDEX IF NOT EXISTS portal_session_user ON portal_session (user_id);
CREATE TABLE IF NOT EXISTS portal_invite (
  token_hash     text PRIMARY KEY,
  email          text NOT NULL CHECK (email = lower(email)),
  staff          boolean NOT NULL DEFAULT false,
  portfolio_id   text,
  role           text CHECK (role IN ('owner', 'accountant', 'prospect')),
  created_by     bigint REFERENCES portal_user(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  used_at        timestamptz,
  CHECK (staff OR (portfolio_id IS NOT NULL AND role IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS portal_code (
  email          text PRIMARY KEY CHECK (email = lower(email)),
  code_hash      text NOT NULL,
  expires_at     timestamptz NOT NULL,
  attempts       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS portal_cache (
  name           text PRIMARY KEY,
  data           jsonb NOT NULL,
  fetched_at     timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS portal_snapshot (
  portfolio_id   text PRIMARY KEY,
  state          text NOT NULL CHECK (state IN ('building', 'ready', 'error')),
  data           jsonb,
  error          text,
  started_at     timestamptz,
  fetched_at     timestamptz
);
-- A home's picture added by staff (the real photo when Rentvine has none), shown before Rentvine's.
CREATE TABLE IF NOT EXISTS portal_photo (
  portfolio_id   text NOT NULL,
  home_id        text NOT NULL,
  bytes          bytea NOT NULL,
  type           text NOT NULL CHECK (type IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  uploaded_by    bigint REFERENCES portal_user(id) ON DELETE SET NULL,
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, home_id)
);
-- Street pictures from Google Street View (bytes NULL: Google has none; asked again after 30 days).
CREATE TABLE IF NOT EXISTS portal_streetview (
  portfolio_id   text NOT NULL,
  home_id        text NOT NULL,
  bytes          bytea,
  type           text,
  checked_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (portfolio_id, home_id)
);
-- Each portfolio's transactions of the last 12 months (Rentvine's accounting
-- transactions), replaced whole by each sweep (every 6 hours).
CREATE TABLE IF NOT EXISTS portal_ledger (
  portfolio_id   text PRIMARY KEY,
  rows           jsonb NOT NULL,
  fetched_at     timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS portal_audit (
  id             bigserial PRIMARY KEY,
  at             timestamptz NOT NULL DEFAULT now(),
  user_id        bigint,
  action         text NOT NULL,
  portfolio_id   text,
  detail         text,
  ip             text
);
CREATE INDEX IF NOT EXISTS portal_audit_at ON portal_audit (at DESC);
`;
