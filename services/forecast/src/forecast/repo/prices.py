"""Day-ahead prices in market.prices."""

from __future__ import annotations

from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from datetime import datetime

import pandas as pd
import psycopg

from forecast.timeutil import UTC, ensure_utc, price_known_at, to_quarter_hours

# When several sources have a price for the same interval, the first one wins.
SOURCE_PRIORITY: Sequence[str] = ("henex", "entsoe")


@dataclass(frozen=True)
class PriceRow:
    zone: str
    delivery_start: datetime
    resolution_minutes: int
    price_eur_mwh: float
    source: str
    source_version: int | None = None
    published_at: datetime | None = None


UPSERT = """
insert into market.prices
  (zone, delivery_start, resolution_minutes, price_eur_mwh, source, source_version, published_at)
values (%s, %s, %s, %s, %s, %s, %s)
on conflict (zone, source, delivery_start, resolution_minutes) do update set
  price_eur_mwh = excluded.price_eur_mwh,
  source_version = excluded.source_version,
  published_at = excluded.published_at,
  ingested_at = now()
where market.prices.source_version is null
   or excluded.source_version is null
   or excluded.source_version >= market.prices.source_version
"""


def upsert_prices(conn: psycopg.Connection, rows: Iterable[PriceRow]) -> int:
    """Insert or update prices. A newer file version replaces an older one, never the reverse."""
    params = [
        (
            r.zone,
            ensure_utc(r.delivery_start).to_pydatetime(),
            r.resolution_minutes,
            r.price_eur_mwh,
            r.source,
            r.source_version,
            ensure_utc(r.published_at).to_pydatetime() if r.published_at else None,
        )
        for r in rows
    ]
    if not params:
        return 0
    with conn.cursor() as cur:
        cur.executemany(UPSERT, params)
    return len(params)


def load_prices(
    conn: psycopg.Connection,
    zone: str,
    start: datetime,
    end: datetime,
    *,
    as_of: datetime | None = None,
    sources: Sequence[str] = SOURCE_PRIORITY,
) -> pd.Series:
    """Quarter-hour prices in [start, end), UTC-indexed, from the highest-priority source.

    With `as_of`, only prices that were public at that time are returned (published_at if known,
    otherwise the conservative day-ahead publication rule), so backtests can't see the future.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            select delivery_start, resolution_minutes, price_eur_mwh::float8 as value, source, published_at
            from market.prices
            where zone = %s and source = any(%s) and delivery_start >= %s and delivery_start < %s
            """,
            (zone, list(sources), ensure_utc(start).to_pydatetime(), ensure_utc(end).to_pydatetime()),
        )
        rows = cur.fetchall()
    empty = pd.Series(dtype="float64", index=pd.DatetimeIndex([], tz=UTC, name="delivery_start"))
    if not rows:
        return empty
    frame = pd.DataFrame(rows)
    frame["delivery_start"] = pd.to_datetime(frame["delivery_start"], utc=True)
    if as_of is not None:
        cutoff = ensure_utc(as_of)
        known = frame["published_at"].map(lambda p: ensure_utc(p) if p is not None else None)
        rule = frame["delivery_start"].map(price_known_at)
        known_at = known.where(known.notna(), rule)
        frame = frame[pd.to_datetime(known_at, utc=True) <= cutoff]
        if frame.empty:
            return empty
    series_by_source = [
        to_quarter_hours(frame[frame["source"] == source]) for source in sources if (frame["source"] == source).any()
    ]
    merged = series_by_source[0]
    for other in series_by_source[1:]:
        merged = merged.combine_first(other)
    return merged.sort_index()
