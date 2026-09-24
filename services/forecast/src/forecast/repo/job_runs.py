"""Bookkeeping for market.job_runs."""

from __future__ import annotations

import json
from typing import Any

import psycopg


def start(conn: psycopg.Connection, job: str, target_key: str, attempt: int) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into market.job_runs (job, target_key, status, attempt)
            values (%s, %s, 'running', %s) returning id
            """,
            (job, target_key, attempt),
        )
        row = cur.fetchone()
    assert row is not None
    return int(row["id"])


def finish(
    conn: psycopg.Connection,
    run_id: int,
    status: str,
    *,
    rows_written: int | None = None,
    message: str | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update market.job_runs
            set status = %s, finished_at = now(), rows_written = %s, message = %s, details = %s::jsonb
            where id = %s
            """,
            (status, rows_written, message, json.dumps(details or {}, default=str), run_id),
        )


def has_succeeded(conn: psycopg.Connection, job: str, target_key: str) -> bool:
    with conn.cursor() as cur:
        cur.execute(
            "select 1 from market.job_runs where job = %s and target_key = %s and status = 'succeeded' limit 1",
            (job, target_key),
        )
        return cur.fetchone() is not None


def recent(conn: psycopg.Connection, limit: int = 20) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, job, target_key, status, attempt, started_at, finished_at, rows_written, message
            from market.job_runs order by started_at desc limit %s
            """,
            (limit,),
        )
        return list(cur.fetchall())
