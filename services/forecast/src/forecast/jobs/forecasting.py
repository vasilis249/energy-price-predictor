"""Forecast and evaluation jobs."""

from __future__ import annotations

from collections.abc import Callable
from datetime import date, datetime, time, timedelta

import pandas as pd
import psycopg

from forecast.jobs.runner import DataNotAvailable, JobOutcome
from forecast.models import baseline
from forecast.repo import forecasts as forecast_repo
from forecast.repo.prices import load_prices
from forecast.timeutil import ATHENS, UTC, day_bounds, day_quarters, ensure_utc, local_day

# Scheduled issue time of the daily forecast (Athens). Backfilled runs use it as their cutoff.
ISSUE_TIME = time(8, 30)


def default_as_of(issue_day: date, now: datetime | None = None) -> pd.Timestamp:
    """Information cutoff: 'now' for today's live run, the scheduled issue time for past days."""
    now_ts = ensure_utc(now) if now else pd.Timestamp.now(tz=UTC)
    scheduled = pd.Timestamp(datetime.combine(issue_day, ISSUE_TIME, tzinfo=ATHENS)).tz_convert(UTC)
    if issue_day > local_day(now_ts):
        raise ValueError(f"cannot issue a forecast for the future day {issue_day}")
    return now_ts if issue_day == local_day(now_ts) else scheduled


def forecast_baseline(
    zone: str, issue_day: date, as_of: datetime, config: baseline.BaselineConfig | None = None
) -> Callable[[psycopg.Connection], JobOutcome]:
    config = config or baseline.BaselineConfig()

    def run(conn: psycopg.Connection) -> JobOutcome:
        lookback = config.residual_window_days + 7 * 3 + config.horizon_days
        start, _ = day_bounds(issue_day - timedelta(days=lookback))
        _, end = day_bounds(issue_day)
        history = load_prices(conn, zone, start, end, as_of=as_of)
        try:
            values, meta = baseline.forecast(history, issue_day, config)
        except baseline.InsufficientData as exc:
            raise DataNotAvailable(str(exc)) from exc
        model_id = forecast_repo.ensure_model_version(
            conn,
            baseline.MODEL_NAME,
            baseline.MODEL_VERSION,
            "baseline",
            config.as_params(),
            activate_if_none=True,
        )
        inputs = {**meta, "issue_day": issue_day.isoformat(), "history_quarters": len(history)}
        run_id = forecast_repo.save_run(
            conn,
            zone=zone,
            model_version_id=model_id,
            issued_at=as_of,
            values=values[["p10", "p50", "p90"]],
            inputs=inputs,
        )
        return JobOutcome(rows_written=len(values), details={"run_id": run_id, "model_version_id": model_id})

    return run


def evaluate_day(zone: str, delivery_day: date) -> Callable[[psycopg.Connection], JobOutcome]:
    """Score every stored run that forecast `delivery_day` against its actual prices."""

    def run(conn: psycopg.Connection) -> JobOutcome:
        start, end = day_bounds(delivery_day)
        actual = load_prices(conn, zone, start, end)
        expected = len(day_quarters(delivery_day))
        if actual.notna().sum() < expected:
            raise DataNotAvailable(f"actual prices for {delivery_day}: {actual.notna().sum()}/{expected} quarters")
        evaluated = 0
        for run_values in forecast_repo.runs_covering(conn, zone, start, end):
            horizon = (delivery_day - local_day(run_values.issued_at)).days
            if not 1 <= horizon <= 14:
                continue
            m = forecast_repo.metrics(run_values.values, actual)
            forecast_repo.save_evaluation(conn, run_values.run_id, horizon, m)
            evaluated += 1
        return JobOutcome(rows_written=evaluated, message=f"{evaluated} runs evaluated")

    return run
