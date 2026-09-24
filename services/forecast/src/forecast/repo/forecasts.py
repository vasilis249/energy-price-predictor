"""Model versions, forecast runs/values and their evaluations (market schema)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import numpy as np
import pandas as pd
import psycopg

from forecast.timeutil import UTC, ensure_utc


def ensure_model_version(
    conn: psycopg.Connection,
    name: str,
    version: str,
    kind: str,
    params: dict[str, Any],
    *,
    activate_if_none: bool = False,
) -> int:
    """Get or create a model version. Optionally make it the active model when none is active yet."""
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into market.model_versions (name, version, kind, params) values (%s, %s, %s, %s::jsonb)
            on conflict (name, version) do update set params = market.model_versions.params
            returning id
            """,
            (name, version, kind, json.dumps(params)),
        )
        row = cur.fetchone()
        assert row is not None
        model_id = int(row["id"])
        if activate_if_none:
            cur.execute(
                """
                update market.model_versions set is_active = true
                where id = %s and not exists (select 1 from market.model_versions where is_active)
                """,
                (model_id,),
            )
    return model_id


def save_run(
    conn: psycopg.Connection,
    *,
    zone: str,
    model_version_id: int,
    issued_at: datetime,
    values: pd.DataFrame,
    inputs: dict[str, Any],
    is_fallback: bool = False,
    fallback_reason: str | None = None,
) -> int:
    """Store a run and its values. Re-running the same (zone, model, issued_at) replaces it."""
    if values.empty:
        raise ValueError("refusing to store an empty forecast")
    index = pd.DatetimeIndex(values.index).tz_convert(UTC)
    target_start = index.min()
    target_end = index.max() + pd.Timedelta(minutes=15)
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into market.forecast_runs
              (zone, model_version_id, issued_at, target_start, target_end, is_fallback, fallback_reason, inputs)
            values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
            on conflict (zone, model_version_id, issued_at) do update set
              target_start = excluded.target_start, target_end = excluded.target_end,
              is_fallback = excluded.is_fallback, fallback_reason = excluded.fallback_reason,
              inputs = excluded.inputs, status = 'succeeded', created_at = now()
            returning id
            """,
            (
                zone,
                model_version_id,
                ensure_utc(issued_at).to_pydatetime(),
                target_start.to_pydatetime(),
                target_end.to_pydatetime(),
                is_fallback,
                fallback_reason,
                json.dumps(inputs, default=str),
            ),
        )
        row = cur.fetchone()
        assert row is not None
        run_id = int(row["id"])
        cur.execute("delete from market.forecast_values where run_id = %s", (run_id,))
        cur.execute("delete from market.forecast_evaluations where run_id = %s", (run_id,))
        cur.executemany(
            """
            insert into market.forecast_values (run_id, delivery_start, resolution_minutes, p10, p50, p90)
            values (%s, %s, 15, %s, %s, %s)
            """,
            [
                (run_id, ts.to_pydatetime(), float(r.p10), float(r.p50), float(r.p90))
                for ts, r in zip(index, values.itertuples(index=False), strict=True)
            ],
        )
    return run_id


@dataclass(frozen=True)
class RunValues:
    run_id: int
    issued_at: pd.Timestamp
    values: pd.DataFrame  # index delivery_start (UTC), columns p10, p50, p90


def runs_covering(conn: psycopg.Connection, zone: str, start: datetime, end: datetime) -> list[RunValues]:
    """All succeeded runs with values in [start, end), with those values."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select r.id as run_id, r.issued_at, v.delivery_start, v.p10, v.p50, v.p90
            from market.forecast_runs r
            join market.forecast_values v on v.run_id = r.id
            where r.zone = %s and r.status = 'succeeded' and v.delivery_start >= %s and v.delivery_start < %s
            order by r.id, v.delivery_start
            """,
            (zone, ensure_utc(start).to_pydatetime(), ensure_utc(end).to_pydatetime()),
        )
        rows = cur.fetchall()
    if not rows:
        return []
    frame = pd.DataFrame(rows)
    frame["delivery_start"] = pd.to_datetime(frame["delivery_start"], utc=True)
    result = []
    for run_id, group in frame.groupby("run_id", sort=True):
        values = group.set_index("delivery_start")[["p10", "p50", "p90"]].astype("float64")
        result.append(RunValues(int(run_id), pd.Timestamp(group["issued_at"].iloc[0]).tz_convert(UTC), values))
    return result


def metrics(forecast: pd.DataFrame, actual: pd.Series) -> dict[str, float]:
    """MAE/RMSE/bias of p50, P10-P90 coverage and mean pinball loss, on aligned intervals."""
    joined = forecast.join(actual.rename("actual"), how="inner").dropna()
    if joined.empty:
        raise ValueError("no overlapping intervals")
    err = joined["p50"] - joined["actual"]
    pinball = []
    for q, col in ((0.1, "p10"), (0.5, "p50"), (0.9, "p90")):
        diff = joined["actual"] - joined[col]
        pinball.append(np.maximum(q * diff, (q - 1) * diff).mean())
    inside = (joined["actual"] >= joined["p10"]) & (joined["actual"] <= joined["p90"])
    return {
        "n": len(joined),
        "mae": float(err.abs().mean()),
        "rmse": float(np.sqrt((err**2).mean())),
        "bias": float(err.mean()),
        "coverage_p10_p90": float(inside.mean()),
        "pinball": float(np.mean(pinball)),
    }


def save_evaluation(conn: psycopg.Connection, run_id: int, horizon_day: int, m: dict[str, float]) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into market.forecast_evaluations
              (run_id, horizon_day, n, mae, rmse, bias, coverage_p10_p90, pinball)
            values (%s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (run_id, horizon_day) do update set
              n = excluded.n, mae = excluded.mae, rmse = excluded.rmse, bias = excluded.bias,
              coverage_p10_p90 = excluded.coverage_p10_p90, pinball = excluded.pinball, evaluated_at = now()
            """,
            (run_id, horizon_day, m["n"], m["mae"], m["rmse"], m["bias"], m["coverage_p10_p90"], m["pinball"]),
        )
