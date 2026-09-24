from datetime import date

import pandas as pd
import psycopg
import pytest
from test_baseline import synthetic_history

from forecast.jobs import forecasting
from forecast.jobs.runner import run_job
from forecast.repo.prices import PriceRow, upsert_prices
from forecast.timeutil import day_bounds

ISSUE = date(2026, 1, 14)


def store(conn: psycopg.Connection, series: pd.Series) -> None:
    upsert_prices(conn, [PriceRow("GR", ts, 15, float(v), "henex", 1) for ts, v in series.items()])
    conn.commit()


@pytest.fixture
def seeded(conn: psycopg.Connection) -> pd.Series:
    history = synthetic_history(date(2025, 10, 20), date(2026, 1, 21), noise=5)
    store(conn, history)
    return history


def test_default_as_of() -> None:
    now = pd.Timestamp("2026-01-14T10:00Z")
    assert forecasting.default_as_of(date(2026, 1, 14), now) == now
    assert forecasting.default_as_of(date(2026, 1, 10), now) == pd.Timestamp("2026-01-10T06:30Z")
    with pytest.raises(ValueError, match="future"):
        forecasting.default_as_of(date(2026, 1, 15), now)


def test_forecast_then_evaluate(database_url: str, conn: psycopg.Connection, seeded: pd.Series) -> None:
    as_of = forecasting.default_as_of(ISSUE, pd.Timestamp("2026-02-01T00:00Z"))
    result = run_job("forecast_baseline", "GR:2026-01-14", forecasting.forecast_baseline("GR", ISSUE, as_of))
    assert result.status == "succeeded" and result.outcome and result.outcome.rows_written == 7 * 96

    run = conn.execute("select * from market.forecast_runs").fetchone()
    assert run is not None
    assert run["issued_at"] == as_of.to_pydatetime()
    assert run["target_start"] == day_bounds(date(2026, 1, 15))[0].to_pydatetime()
    model = conn.execute("select name, is_active from market.model_versions").fetchone()
    assert model == {"name": "seasonal_naive", "is_active": True}

    for day in (date(2026, 1, 15), date(2026, 1, 21)):
        assert run_job("evaluate", f"GR:{day}", forecasting.evaluate_day("GR", day)).status == "succeeded"
    evals = conn.execute(
        "select horizon_day, n, mae, coverage_p10_p90 from market.forecast_evaluations order by 1"
    ).fetchall()
    assert [(e["horizon_day"], e["n"]) for e in evals] == [(1, 96), (7, 96)]
    assert all(0 < e["mae"] < 20 for e in evals)


def test_rerun_replaces_the_run(database_url: str, conn: psycopg.Connection, seeded: pd.Series) -> None:
    as_of = pd.Timestamp("2026-01-14T06:30Z")
    for _ in range(2):
        run_job("forecast_baseline", "k", forecasting.forecast_baseline("GR", ISSUE, as_of))
    assert conn.execute("select count(*) as n from market.forecast_runs").fetchone() == {"n": 1}
    assert conn.execute("select count(*) as n from market.forecast_values").fetchone() == {"n": 7 * 96}


def test_cutoff_hides_unpublished_prices(database_url: str, conn: psycopg.Connection, seeded: pd.Series) -> None:
    """Prices stored after the cutoff can't influence the forecast: change them and compare."""
    as_of = pd.Timestamp("2026-01-14T06:30Z")
    run_job("forecast_baseline", "k", forecasting.forecast_baseline("GR", ISSUE, as_of))
    before = conn.execute("select delivery_start, p50 from market.forecast_values order by 1").fetchall()

    future = seeded[seeded.index >= day_bounds(date(2026, 1, 15))[0]] * 0 + 9999
    upsert_prices(conn, [PriceRow("GR", ts, 15, float(v), "henex", 2) for ts, v in future.items()])
    conn.commit()
    run_job("forecast_baseline", "k", forecasting.forecast_baseline("GR", ISSUE, as_of))
    after = conn.execute("select delivery_start, p50 from market.forecast_values order by 1").fetchall()
    assert before == after


def test_missing_data_is_reported_as_not_available(database_url: str, conn: psycopg.Connection) -> None:
    result = run_job(
        "forecast_baseline",
        "k",
        forecasting.forecast_baseline("GR", ISSUE, pd.Timestamp("2026-01-14T06:30Z")),
        max_attempts=1,
    )
    assert result.status == "failed" and "reference day" in (result.error or "")
    result = run_job("evaluate", "k", forecasting.evaluate_day("GR", ISSUE), max_attempts=1)
    assert result.status == "failed" and "0/96" in (result.error or "")
