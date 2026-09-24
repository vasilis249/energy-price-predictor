from datetime import date
from pathlib import Path

import httpx
import psycopg

from forecast.jobs.ingestion import ingest_entsoe_prices
from forecast.jobs.runner import run_job
from forecast.sources.entsoe import EntsoeClient

FIXTURES = Path(__file__).parent / "fixtures" / "entsoe"


def client(body: bytes, status: int = 200) -> EntsoeClient:
    return EntsoeClient(
        "t", http=httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(status, content=body)))
    )


def test_full_day_is_stored_idempotently(database_url: str, conn: psycopg.Connection) -> None:
    body = (FIXTURES / "a44_gr_pt15m_a03.xml").read_bytes()
    for _ in range(2):
        result = run_job("ingest", "GR:2026-01-15", ingest_entsoe_prices(client(body), "GR", date(2026, 1, 15)))
        assert result.status == "succeeded"
    row = conn.execute("select count(*) as n, min(price_eur_mwh)::float8 as low from market.prices").fetchone()
    assert row == {"n": 96, "low": -0.01}


def test_not_yet_published_is_retried_then_reported(database_url: str, conn: psycopg.Connection) -> None:
    body = (FIXTURES / "ack_no_data.xml").read_bytes()
    result = run_job(
        "ingest",
        "GR:2026-01-16",
        ingest_entsoe_prices(client(body), "GR", date(2026, 1, 16)),
        max_attempts=2,
        sleep=lambda _: None,
    )
    assert result.status == "failed" and result.attempts == 2
    assert conn.execute("select count(*) as n from market.prices").fetchone() == {"n": 0}


def test_partial_day_is_not_stored(database_url: str, conn: psycopg.Connection) -> None:
    body = (FIXTURES / "a44_gr_pt60m.xml").read_bytes()  # only 2 hours
    result = run_job("ingest", "k", ingest_entsoe_prices(client(body), "GR", date(2025, 9, 30)), max_attempts=1)
    assert result.status == "failed" and "8/96" in (result.error or "")
    assert conn.execute("select count(*) as n from market.prices").fetchone() == {"n": 0}
