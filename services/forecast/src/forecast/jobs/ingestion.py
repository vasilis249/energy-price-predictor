"""Ingestion jobs: fetch one delivery day from a source and upsert it."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date

import psycopg

from forecast.jobs.runner import DataNotAvailable, JobOutcome
from forecast.repo.prices import PriceRow, upsert_prices
from forecast.sources.entsoe import EntsoeClient
from forecast.timeutil import day_bounds, day_quarters


def ingest_entsoe_prices(client: EntsoeClient, zone: str, day: date) -> Callable[[psycopg.Connection], JobOutcome]:
    """Day-ahead prices of one Athens day from ENTSO-E (A44). Idempotent: upserts by interval."""

    def run(conn: psycopg.Connection) -> JobOutcome:
        start, end = day_bounds(day)
        frame = client.day_ahead_prices(zone, start, end)
        covered_quarters = int((frame["resolution_minutes"] // 15).sum()) if not frame.empty else 0
        expected = len(day_quarters(day))
        if covered_quarters < expected:
            # Before the day's auction results are out we get nothing or a partial day: try again later.
            raise DataNotAvailable(f"ENTSO-E {zone} {day}: {covered_quarters}/{expected} quarters")
        rows = [
            PriceRow(zone, r.delivery_start, int(r.resolution_minutes), float(r.value), "entsoe")
            for r in frame.itertuples(index=False)
        ]
        written = upsert_prices(conn, rows)
        return JobOutcome(rows_written=written, details={"zone": zone, "day": day.isoformat()})

    return run
