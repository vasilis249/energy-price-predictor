import os
from collections.abc import Iterator

import psycopg
import pytest
from psycopg.rows import dict_row

# Database tests need Postgres with the repo's migrations applied, e.g.
#   scripts/db-apply-plain.sh  (creates epp_test)  and
#   TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/epp_test uv run pytest
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

MARKET_TABLES = (
    "forecast_evaluations, forecast_values, forecast_runs, model_versions, series_values, series, prices, job_runs"
)


@pytest.fixture
def database_url(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    if not TEST_DATABASE_URL:
        pytest.skip("TEST_DATABASE_URL not set")
    with psycopg.connect(TEST_DATABASE_URL, autocommit=True) as conn:
        conn.execute(f"truncate {', '.join('market.' + t.strip() for t in MARKET_TABLES.split(','))} restart identity")
    monkeypatch.setenv("FORECAST_DATABASE_URL", TEST_DATABASE_URL)
    from forecast.settings import get_settings

    get_settings.cache_clear()
    yield TEST_DATABASE_URL
    get_settings.cache_clear()


@pytest.fixture
def conn(database_url: str) -> Iterator[psycopg.Connection]:
    with psycopg.connect(database_url, row_factory=dict_row) as c:
        yield c
