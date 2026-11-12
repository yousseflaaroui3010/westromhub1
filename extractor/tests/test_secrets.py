"""Shared-token store against a real Postgres (TEST_DATABASE_URL), plus the
server's fail-closed behaviour. Skipped without a database."""

import os
from concurrent.futures import ThreadPoolExecutor

import pytest

URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


def test_concurrent_first_use_yields_one_value():
    from wgc_extract.secrets import _connect, get_or_create_secret

    c = _connect(URL)
    c.run("DROP TABLE IF EXISTS app_secret")
    c.close()
    with ThreadPoolExecutor(4) as ex:
        vals = list(ex.map(lambda _: get_or_create_secret(URL, "extractor_token"), range(4)))
    assert len(set(vals)) == 1 and len(vals[0]) == 64
    assert get_or_create_secret(URL, "extractor_token") == vals[0]
