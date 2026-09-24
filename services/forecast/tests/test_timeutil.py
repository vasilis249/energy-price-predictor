from datetime import date, datetime

import pandas as pd
import pytest

from forecast.timeutil import (
    ATHENS,
    UTC,
    day_bounds,
    day_quarters,
    local_day,
    price_known_at,
    quarter_grid,
    slot_of_day,
    to_quarter_hours,
)


def ts(s: str) -> pd.Timestamp:
    return pd.Timestamp(s)


@pytest.mark.parametrize(
    ("day", "expected"),
    [
        (date(2026, 1, 15), 96),
        (date(2026, 3, 29), 92),  # EET -> EEST: 23-hour day
        (date(2026, 10, 25), 100),  # EEST -> EET: 25-hour day
        (date(2026, 7, 1), 96),
    ],
)
def test_athens_day_has_right_number_of_quarters(day: date, expected: int) -> None:
    assert len(day_quarters(day)) == expected


def test_day_bounds_are_local_midnights_in_utc() -> None:
    assert day_bounds(date(2026, 1, 15)) == (ts("2026-01-14T22:00Z"), ts("2026-01-15T22:00Z"))
    assert day_bounds(date(2026, 7, 1)) == (ts("2026-06-30T21:00Z"), ts("2026-07-01T21:00Z"))


def test_quarter_grid_rejects_naive_and_misaligned() -> None:
    with pytest.raises(ValueError, match="naive"):
        quarter_grid(datetime(2026, 1, 1), datetime(2026, 1, 2))  # noqa: DTZ001
    with pytest.raises(ValueError, match="aligned"):
        quarter_grid(ts("2026-01-01T00:05Z"), ts("2026-01-01T01:00Z"))


def test_local_day_uses_athens() -> None:
    assert local_day(ts("2026-01-14T22:00Z")) == date(2026, 1, 15)
    assert local_day(ts("2026-01-14T21:45Z")) == date(2026, 1, 14)


def test_price_known_at_is_previous_day_14_cet() -> None:
    # First quarter of Athens 15 Jan (00:00 EET = 23:00 CET on the 14th): known 14 Jan 14:00 CET.
    assert price_known_at(ts("2026-01-14T22:00Z")) == ts("2026-01-14T13:00Z")
    # Last quarter of Athens 15 Jan: same.
    assert price_known_at(ts("2026-01-15T21:45Z")) == ts("2026-01-14T13:00Z")
    # Summer (CEST = UTC+2).
    assert price_known_at(ts("2026-07-01T09:00Z")) == ts("2026-06-30T12:00Z")


def test_to_quarter_hours_expands_hourly_and_prefers_finer_resolution() -> None:
    frame = pd.DataFrame(
        {
            "delivery_start": [ts("2025-09-30T20:00Z"), ts("2025-09-30T21:00Z"), ts("2025-09-30T21:15Z")],
            "resolution_minutes": [60, 60, 15],
            "value": [50.0, 60.0, 99.0],
        }
    )
    s = to_quarter_hours(frame)
    assert list(s.index) == list(pd.date_range("2025-09-30T20:00Z", periods=8, freq="15min"))
    assert s.tolist() == [50, 50, 50, 50, 60, 99, 60, 60]
    assert s.index.tz == UTC


def test_to_quarter_hours_empty() -> None:
    assert to_quarter_hours(pd.DataFrame(columns=["delivery_start", "resolution_minutes", "value"])).empty


def test_slot_of_day_on_dst_days() -> None:
    spring = slot_of_day(day_quarters(date(2026, 3, 29)))
    assert 3 * 60 not in spring  # 03:00-04:00 local doesn't exist
    assert len(set(spring)) == 92
    autumn = slot_of_day(day_quarters(date(2026, 10, 25)))
    assert len(autumn) == 100 and len(set(autumn)) == 96  # 03:00-04:00 happens twice
    assert slot_of_day(pd.DatetimeIndex([ts("2026-01-14T22:00Z")]))[0] == 0
    assert day_quarters(date(2026, 1, 15)).tz_convert(ATHENS)[0].hour == 0
