"""Seasonal-naive baseline with empirical uncertainty bands.

Point forecast for delivery day T issued on day D (the latest day whose prices are known):
- next day (T = D+1), both working days: repeat day D (yesterday's shape is the best short-term guess);
- otherwise: repeat the same weekday one week earlier (T-7), so weekends and Mondays look like
  weekends and Mondays;
- Greek public holidays behave like Sundays: repeat the most recent known Sunday.
If the chosen reference day has no data, fall back to the other candidates.

Bands: the same rule is replayed on the previous `residual_window_days` issue days. For each
horizon and local hour, the empirical 10/50/90% quantiles of (actual - point) are added to the point
forecast. The result is a P10/P50/P90 band whose width reflects how wrong this rule has recently been.

Only prices up to the end of day D are used, whatever else is in `history`.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from functools import cache

import holidays
import numpy as np
import pandas as pd

from forecast.timeutil import ATHENS, day_bounds, day_quarters, slot_of_day

MODEL_NAME = "seasonal_naive"
MODEL_VERSION = "1.0.0"
QUANTILES = (0.1, 0.5, 0.9)


class InsufficientData(Exception):
    """Not enough known prices to build the forecast."""


@dataclass(frozen=True)
class BaselineConfig:
    horizon_days: int = 7
    residual_window_days: int = 56
    # Hours with fewer residuals than this use residuals pooled over all hours of that horizon.
    min_residuals_per_hour: int = 20

    def as_params(self) -> dict[str, int]:
        return {
            "horizon_days": self.horizon_days,
            "residual_window_days": self.residual_window_days,
            "min_residuals_per_hour": self.min_residuals_per_hour,
        }


@cache
def _greek_holidays(year: int) -> holidays.HolidayBase:
    return holidays.country_holidays("GR", years=year)


def is_holiday(day: date) -> bool:
    return day in _greek_holidays(day.year)


def is_working_day(day: date) -> bool:
    return day.weekday() < 5 and not is_holiday(day)


def reference_days(issue_day: date, target_day: date) -> list[date]:
    """Candidate days whose profile is copied for `target_day`, best first. All are <= issue_day."""
    horizon = (target_day - issue_day).days
    if horizon < 1:
        raise ValueError("target day must be after the issue day")
    candidates: list[date] = []
    if is_holiday(target_day):
        last_sunday = issue_day - timedelta(days=(issue_day.weekday() + 1) % 7)
        candidates += [last_sunday, last_sunday - timedelta(days=7)]
    if horizon == 1 and is_working_day(target_day) and is_working_day(issue_day):
        candidates.append(issue_day)
    same_weekday = target_day - timedelta(days=7 * ((horizon + 6) // 7))  # most recent known same weekday
    candidates += [same_weekday, same_weekday - timedelta(days=7), issue_day]
    seen: set[date] = set()
    return [d for d in candidates if d <= issue_day and not (d in seen or seen.add(d))]


class _DayProfiles:
    """Per-day price profiles keyed by local quarter-hour slot (minutes since local midnight)."""

    def __init__(self, history: pd.Series):
        history = history.dropna().sort_index()
        local_days = history.index.tz_convert(ATHENS).date
        self._by_day = {day: group for day, group in history.groupby(local_days)}
        self._cache: dict[date, pd.Series | None] = {}

    def get(self, day: date) -> pd.Series | None:
        if day not in self._cache:
            values = self._by_day.get(day)
            if values is None or len(values) < len(day_quarters(day)):
                self._cache[day] = None  # missing or incomplete day: don't use as a reference
            else:
                # Autumn DST day: average the repeated hour.
                self._cache[day] = values.groupby(slot_of_day(values.index)).mean()
        return self._cache[day]


@cache
def _day_layout(day: date) -> tuple[pd.DatetimeIndex, np.ndarray, np.ndarray]:
    """Quarter-hour index of a local day, each quarter's slot position (0..95) and local hour."""
    index = day_quarters(day)
    slots = np.asarray(slot_of_day(index)) // 15
    return index, slots, slots // 4


def _project(profile: pd.Series, target_day: date) -> pd.Series:
    """Copy a slot profile onto the target day's quarter-hours (handles 23/25-hour days)."""
    index, slots, _ = _day_layout(target_day)
    full = profile.reindex(range(0, 24 * 60, 15)).ffill().bfill().to_numpy()  # spring gap: previous hour
    return pd.Series(full[slots], index=index, name="p50")


def point_forecast(profiles: _DayProfiles, issue_day: date, target_day: date) -> tuple[pd.Series, date]:
    for ref in reference_days(issue_day, target_day):
        profile = profiles.get(ref)
        if profile is not None:
            return _project(profile, target_day), ref
    raise InsufficientData(f"no complete reference day for {target_day} (issued {issue_day})")


def _residual_quantiles(
    profiles: _DayProfiles, issue_day: date, horizon: int, config: BaselineConfig
) -> tuple[pd.DataFrame, pd.Series]:
    """Quantiles of (actual - point) by local hour, plus pooled quantiles, from recent replays."""
    errors = []
    for back in range(horizon, horizon + config.residual_window_days):
        past_issue = issue_day - timedelta(days=back)
        past_target = past_issue + timedelta(days=horizon)  # <= issue_day, so its actuals are known
        actual = profiles.get(past_target)
        if actual is None:
            continue
        try:
            point, _ = point_forecast(profiles, past_issue, past_target)
        except InsufficientData:
            continue
        actual_values = _project(actual, past_target)
        errors.append(pd.DataFrame({"err": (actual_values - point).to_numpy(), "hour": _day_layout(past_target)[2]}))
    if not errors:
        raise InsufficientData(f"no history to estimate uncertainty for horizon {horizon}")
    all_err = pd.concat(errors)
    by_hour = all_err.groupby("hour")["err"].quantile(list(QUANTILES)).unstack()
    counts = all_err.groupby("hour")["err"].size()
    by_hour = by_hour[counts.reindex(by_hour.index) >= config.min_residuals_per_hour]
    pooled = all_err["err"].quantile(list(QUANTILES))
    return by_hour, pooled


def forecast(
    history: pd.Series, issue_day: date, config: BaselineConfig | None = None
) -> tuple[pd.DataFrame, dict[str, object]]:
    """Forecast days issue_day+1 .. issue_day+horizon_days.

    `history`: known quarter-hour prices (UTC index). Anything after the end of `issue_day` is
    ignored, so passing too much data can't leak the future.
    Returns (frame indexed by delivery_start with p10/p50/p90/horizon_day, metadata).
    """
    config = config or BaselineConfig()
    _, cutoff = day_bounds(issue_day)
    profiles = _DayProfiles(history[history.index < cutoff])

    frames = []
    references: dict[str, str] = {}
    for horizon in range(1, config.horizon_days + 1):
        target = issue_day + timedelta(days=horizon)
        point, ref = point_forecast(profiles, issue_day, target)
        references[target.isoformat()] = ref.isoformat()
        by_hour, pooled = _residual_quantiles(profiles, issue_day, horizon, config)
        offsets = by_hour.reindex(_day_layout(target)[2])
        for q in QUANTILES:
            offsets[q] = offsets[q].fillna(pooled[q])
        values = np.sort(point.to_numpy()[:, None] + offsets[list(QUANTILES)].to_numpy(), axis=1)
        frame = pd.DataFrame(values, index=point.index, columns=["p10", "p50", "p90"])
        frame["horizon_day"] = horizon
        frames.append(frame)
    result = pd.concat(frames)
    result.index.name = "delivery_start"
    return result, {"reference_days": references, **config.as_params()}
