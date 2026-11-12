"""Shared secrets from the project's PRIVATE Postgres (not env variables).

Mirrors api/src/security/secretStore.ts: same table, same advisory lock, same
get-or-create, so whichever service starts first generates the value and both
read the same row. Nobody sees or types it.
"""

from __future__ import annotations

import logging
import secrets as _secrets
from urllib.parse import unquote, urlparse

log = logging.getLogger("wgc_extract.secrets")

SECRET_LOCK_ID = 727270101  # same as SECRET_LOCK_ID in the API
SCHEMA = """CREATE TABLE IF NOT EXISTS app_secret (
  name        text PRIMARY KEY,
  value       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
)"""


def _connect(database_url: str):
    import pg8000.native

    u = urlparse(database_url)
    if u.scheme not in ("postgres", "postgresql"):
        raise ValueError("DATABASE_URL must be a postgres URL")
    return pg8000.native.Connection(
        user=unquote(u.username or ""),
        password=unquote(u.password or "") or None,
        host=u.hostname or "localhost",
        port=u.port or 5432,
        database=(u.path or "/").lstrip("/") or "postgres",
        timeout=10,
    )


def get_or_create_secret(database_url: str, name: str) -> str:
    conn = _connect(database_url)
    try:
        conn.run("BEGIN")
        conn.run("SELECT pg_advisory_xact_lock(:id)", id=SECRET_LOCK_ID)
        conn.run(SCHEMA)
        conn.run(
            "INSERT INTO app_secret (name, value) VALUES (:n, :v) ON CONFLICT (name) DO NOTHING",
            n=name, v=_secrets.token_hex(32),
        )
        rows = conn.run("SELECT value FROM app_secret WHERE name = :n", n=name)
        conn.run("COMMIT")
        if not rows or not rows[0][0]:
            raise RuntimeError("secret row missing")
        return rows[0][0]
    finally:
        conn.close()
