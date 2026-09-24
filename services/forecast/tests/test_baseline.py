from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from forecast.models.baseline import (
    BaselineConfig,
    InsufficientData,
    forecast,
    is_holiday,
    reference_days,
)
from forecast.timeutil import ATHENS, day_bounds, day_quarters


def synthetic_history(start: date, end: date, noise: float = 0.0, seed: int = 0) -> pd.Series:
    """Quarter-hour prices: daily shape + weekday level + day number, optionally noisy."""
    rng = np.random.default_rng(seed)
    days = [day_quarters(start + timedelta(days=i)) for i in range((end - start).days + 1)]
    idx = days[0].append(days[1:])
    local = idx.tz_convert(ATHENS)
    shape = 80 + 40 * np.sin((local.hour + local.minute / 60) / 24 * 2 * np.pi)
    weekend = np.where(local.weekday >= 5, -30.0, 0.0)
    values = shape + weekend + rng.normal(0, noise, len(idx))
    return pd.Series(values, index=idx)


def test_holidays_are_greek() -> None:
    assert is_holiday(date(2026, 3, 25))  # Independence Day
    assert is_holiday(date(2026, 4, 13))  # Orthodox Easter Monday 2026
    assert not is_holiday(date(2026, 3, 24))


@pytest.mark.parametrize(
    ("issue", "target", "first_choice"),
    [
        (date(2026, 1, 14), date(2026, 1, 15), date(2026, 1, 14)),  # Wed -> Thu: yesterday
        (date(2026, 1, 16), date(2026, 1, 17), date(2026, 1, 10)),  # Fri -> Sat: last Saturday
        (date(2026, 1, 18), date(2026, 1, 19), date(2026, 1, 12)),  # Sun -> Mon: last Monday
        (date(2026, 1, 14), date(2026, 1, 17), date(2026, 1, 10)),  # D+3: same weekday last week
        (date(2026, 1, 14), date(2026, 1, 21), date(2026, 1, 14)),  # D+7: issue day is the same weekday
        (date(2026, 3, 24), date(2026, 3, 25), date(2026, 3, 22)),  # holiday: last Sunday
    ],
)
def test_reference_day_choice(issue: date, target: date, first_choice: date) -> None:
    refs = reference_days(issue, target)
    assert refs[0] == first_choice
    assert all(r <= issue for r in refs)


def test_forecast_shape_and_ordering() -> None:
    history = synthetic_history(date(2025, 11, 1), date(2026, 1, 14), noise=5)
    result, meta = forecast(history, date(2026, 1, 14))
    assert result["horizon_day"].unique().tolist() == list(range(1, 8))
    assert len(result) == 7 * 96
    assert (result["p10"] <= result["p50"]).all() and (result["p50"] <= result["p90"]).all()
    assert result.index[0] == day_bounds(date(2026, 1, 15))[0]
    assert meta["reference_days"]["2026-01-17"] == "2026-01-10"


def test_future_data_in_history_is_ignored() -> None:
    history = synthetic_history(date(2025, 11, 1), date(2026, 1, 21), noise=5)
    issue = date(2026, 1, 14)
    clean, _ = forecast(history, issue)
    tampered = history.copy()
    tampered[tampered.index >= day_bounds(date(2026, 1, 15))[0]] = 10_000.0
    leaked, _ = forecast(tampered, issue)
    pd.testing.assert_frame_equal(clean, leaked)


def test_dst_days_get_the_right_number_of_quarters() -> None:
    history = synthetic_history(date(2026, 8, 1), date(2026, 10, 24), noise=2)
    result, _ = forecast(history, date(2026, 10, 24))  # target D+1 = 25 Oct, 25-hour day
    day1 = result[result["horizon_day"] == 1]
    assert len(day1) == 100 and not day1.isna().any().any()

    history = synthetic_history(date(2026, 1, 1), date(2026, 3, 28), noise=2)
    result, _ = forecast(history, date(2026, 3, 28))  # target D+1 = 29 Mar, 23-hour day
    assert len(result[result["horizon_day"] == 1]) == 92


def test_bands_cover_about_80_percent_of_outcomes() -> None:
    history = synthetic_history(date(2025, 6, 1), date(2026, 2, 28), noise=10, seed=42)
    hits = total = 0
    for issue in [date(2026, 1, 10) + timedelta(days=i) for i in range(0, 40, 3)]:
        result, _ = forecast(history, issue, BaselineConfig(horizon_days=2))
        actual = history.reindex(result.index)
        hits += int(((actual >= result["p10"]) & (actual <= result["p90"])).sum())
        total += len(result)
    assert 0.7 <= hits / total <= 0.9


def test_perfectly_periodic_prices_are_forecast_exactly() -> None:
    history = synthetic_history(date(2025, 11, 1), date(2026, 1, 14))
    result, _ = forecast(history, date(2026, 1, 14))
    actual = synthetic_history(date(2026, 1, 15), date(2026, 1, 21))
    np.testing.assert_allclose(result["p50"].to_numpy(), actual.reindex(result.index).to_numpy())


def test_insufficient_history() -> None:
    history = synthetic_history(date(2026, 1, 12), date(2026, 1, 14))
    with pytest.raises(InsufficientData):
        forecast(history, date(2026, 1, 14))


def test_incomplete_reference_day_falls_back_to_next_candidate() -> None:
    history = synthetic_history(date(2025, 11, 1), date(2026, 1, 14), noise=1)
    start, end = day_bounds(date(2026, 1, 14))
    history = history[(history.index < start) | (history.index >= start + pd.Timedelta(hours=6))]
    _, meta = forecast(history, date(2026, 1, 14), BaselineConfig(horizon_days=1))
    assert meta["reference_days"]["2026-01-15"] == "2026-01-08"  # Thursday a week earlier
