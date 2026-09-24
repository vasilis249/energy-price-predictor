import pandas as pd
import psycopg

from forecast.repo.prices import PriceRow, load_prices, upsert_prices


def ts(s: str) -> pd.Timestamp:
    return pd.Timestamp(s)


def quarter_rows(start: str, values: list[float], source: str = "henex", version: int | None = 1) -> list[PriceRow]:
    base = ts(start)
    return [
        PriceRow("GR", base + pd.Timedelta(minutes=15 * i), 15, v, source, source_version=version)
        for i, v in enumerate(values)
    ]


def test_newer_file_version_replaces_older_but_not_the_reverse(conn: psycopg.Connection) -> None:
    upsert_prices(conn, quarter_rows("2026-01-14T22:00Z", [10, 20], version=1))
    upsert_prices(conn, quarter_rows("2026-01-14T22:00Z", [11, 21], version=2))
    upsert_prices(conn, quarter_rows("2026-01-14T22:00Z", [99, 99], version=1))
    s = load_prices(conn, "GR", ts("2026-01-14T22:00Z"), ts("2026-01-14T22:30Z"))
    assert s.tolist() == [11, 21]


def test_source_priority_and_gap_filling(conn: psycopg.Connection) -> None:
    upsert_prices(conn, quarter_rows("2026-01-14T22:00Z", [1, 2, 3, 4], source="entsoe", version=None))
    upsert_prices(conn, quarter_rows("2026-01-14T22:00Z", [10, 20], source="henex"))
    s = load_prices(conn, "GR", ts("2026-01-14T22:00Z"), ts("2026-01-14T23:00Z"))
    assert s.tolist() == [10, 20, 3, 4]


def test_mixed_resolutions_expand_to_quarters(conn: psycopg.Connection) -> None:
    upsert_prices(conn, [PriceRow("GR", ts("2025-09-30T20:00Z"), 60, 42.0, "henex")])
    s = load_prices(conn, "GR", ts("2025-09-30T20:00Z"), ts("2025-09-30T21:00Z"))
    assert s.tolist() == [42, 42, 42, 42]


def test_as_of_hides_prices_not_yet_published(conn: psycopg.Connection) -> None:
    # Athens 15 Jan and 16 Jan, first quarter of each.
    upsert_prices(conn, quarter_rows("2026-01-14T22:00Z", [15]))
    upsert_prices(conn, quarter_rows("2026-01-15T22:00Z", [16]))
    window = (ts("2026-01-14T00:00Z"), ts("2026-01-17T00:00Z"))
    # 15 Jan 08:30 Athens: the 15th is known (auctioned on the 14th), the 16th is not yet.
    s = load_prices(conn, "GR", *window, as_of=ts("2026-01-15T06:30Z"))
    assert s.tolist() == [15]
    # After the 15 Jan auction results (14:00 CET = 13:00 UTC), the 16th is known too.
    s = load_prices(conn, "GR", *window, as_of=ts("2026-01-15T13:00Z"))
    assert s.tolist() == [15, 16]


def test_as_of_uses_actual_publication_time_when_known(conn: psycopg.Connection) -> None:
    rows = quarter_rows("2026-01-15T22:00Z", [16])
    late = PriceRow(**{**rows[0].__dict__, "published_at": ts("2026-01-15T15:00Z")})
    upsert_prices(conn, [late])
    window = (ts("2026-01-15T00:00Z"), ts("2026-01-17T00:00Z"))
    assert load_prices(conn, "GR", *window, as_of=ts("2026-01-15T14:00Z")).empty
    assert load_prices(conn, "GR", *window, as_of=ts("2026-01-15T15:00Z")).tolist() == [16]
