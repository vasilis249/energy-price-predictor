"""Time handling for market data.

Conventions (see CLAUDE.md):
- All timestamps are timezone-aware UTC internally; Europe/Athens only for "which day" questions
  and display.
- A value is identified by the start of its delivery interval and its resolution in minutes.
- The product's "day" is the Athens calendar day, which has 92, 96 or 100 quarter-hours
  (DST switch days have 23 or 25 hours).
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

import pandas as pd

UTC = ZoneInfo("UTC")
ATHENS = ZoneInfo("Europe/Athens")
# Single Day-Ahead Coupling runs on Central European time (gate closure 12:00 CET/CEST).
CET = ZoneInfo("Europe/Brussels")

QUARTER = pd.Timedelta(minutes=15)

# SDAC switched from hourly to 15-minute market time units for delivery on this day.
MTU_15_MIN_FROM = date(2025, 10, 1)

# Results are published shortly after the 12:00 CET gate closure. We treat a day's prices as known
# from 14:00 CET the previous day, a safe margin that never uses information earlier than it existed.
DAM_RESULTS_KNOWN_AT = time(14, 0)


def ensure_utc(ts: datetime | pd.Timestamp) -> pd.Timestamp:
    t = pd.Timestamp(ts)
    if t.tzinfo is None:
        raise ValueError(f"naive timestamp {ts!r}: all timestamps must be timezone-aware")
    return t.tz_convert(UTC)


def day_bounds(day: date, tz: ZoneInfo = ATHENS) -> tuple[pd.Timestamp, pd.Timestamp]:
    """UTC [start, end) of a local calendar day."""
    start = pd.Timestamp(datetime.combine(day, time(0), tzinfo=tz)).tz_convert(UTC)
    end = pd.Timestamp(datetime.combine(day + timedelta(days=1), time(0), tzinfo=tz)).tz_convert(UTC)
    return start, end


def quarter_grid(start: datetime | pd.Timestamp, end: datetime | pd.Timestamp) -> pd.DatetimeIndex:
    """Quarter-hour starts in [start, end), UTC."""
    s, e = ensure_utc(start), ensure_utc(end)
    if s.minute % 15 or s.second or e.minute % 15 or e.second:
        raise ValueError("grid bounds must be aligned to quarter-hours")
    return pd.date_range(s, e, freq=QUARTER, inclusive="left", name="delivery_start")


def day_quarters(day: date, tz: ZoneInfo = ATHENS) -> pd.DatetimeIndex:
    """All quarter-hour starts of a local day (92, 96 or 100 of them in Athens)."""
    return quarter_grid(*day_bounds(day, tz))


def local_day(ts: datetime | pd.Timestamp, tz: ZoneInfo = ATHENS) -> date:
    return ensure_utc(ts).tz_convert(tz).date()


def price_known_at(delivery_start: datetime | pd.Timestamp) -> pd.Timestamp:
    """Earliest time a day-ahead price for this interval is considered public (UTC).

    14:00 CET on the day before the interval's Athens calendar day. Whether the market day is
    defined in CET or EET, the auction for every interval of Athens day X has closed by then.
    """
    day = local_day(delivery_start) - timedelta(days=1)
    return pd.Timestamp(datetime.combine(day, DAM_RESULTS_KNOWN_AT, tzinfo=CET)).tz_convert(UTC)


def to_quarter_hours(frame: pd.DataFrame, value_col: str = "value") -> pd.Series:
    """Expand mixed-resolution rows to a quarter-hour series indexed by UTC start.

    `frame` needs columns delivery_start (tz-aware), resolution_minutes and `value_col`.
    Hourly (or 30-minute) values are repeated for each quarter they cover. Where rows of different
    resolutions overlap, the finest resolution wins.
    """
    if frame.empty:
        return pd.Series(dtype="float64", index=pd.DatetimeIndex([], tz=UTC, name="delivery_start"))
    parts = []
    for resolution, group in frame.groupby("resolution_minutes"):
        res = int(resolution)
        if res % 15:
            raise ValueError(f"unsupported resolution {res} min")
        starts = pd.DatetimeIndex(group["delivery_start"]).tz_convert(UTC)
        repeat = res // 15
        expanded_index = starts.repeat(repeat) + pd.to_timedelta(
            [15 * k for _ in range(len(starts)) for k in range(repeat)], unit="min"
        )
        values = group[value_col].to_numpy().repeat(repeat)
        parts.append(pd.DataFrame({"value": values, "res": res}, index=expanded_index))
    combined = pd.concat(parts).sort_values("res", kind="stable")
    combined = combined[~combined.index.duplicated(keep="first")].sort_index()
    series = combined["value"].astype("float64")
    series.index.name = "delivery_start"
    return series


def slot_of_day(index: pd.DatetimeIndex, tz: ZoneInfo = ATHENS) -> pd.Index:
    """Local wall-clock slot label (minutes since local midnight) of each UTC timestamp.

    Used to match "the same quarter-hour" across days. On the 25-hour autumn day the repeated hour
    produces duplicate labels; on the 23-hour spring day some labels don't occur.
    """
    local = index.tz_convert(tz)
    return pd.Index(local.hour * 60 + local.minute, name="slot")
