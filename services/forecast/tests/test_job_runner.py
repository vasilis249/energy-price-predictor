import psycopg
import pytest

from forecast.jobs.runner import JobOutcome, TransientError, run_job
from forecast.repo import job_runs


def insert_marker(conn: psycopg.Connection, key: str) -> None:
    conn.execute(
        "insert into market.series (source, kind, horizon, zone, unit) values ('test', %s, 'actual', 'GR', 'MW')",
        (key,),
    )


def markers(conn: psycopg.Connection) -> list[str]:
    return [r["kind"] for r in conn.execute("select kind from market.series order by kind").fetchall()]


def statuses(conn: psycopg.Connection) -> list[tuple[str, int]]:
    rows = conn.execute("select status, attempt from market.job_runs order by id").fetchall()
    return [(r["status"], r["attempt"]) for r in rows]


def test_success_commits_and_is_logged(database_url: str, conn: psycopg.Connection) -> None:
    def job(c: psycopg.Connection) -> JobOutcome:
        insert_marker(c, "ok")
        return JobOutcome(rows_written=1, details={"k": 1})

    result = run_job("test_job", "2026-01-15", job, database_url=database_url)
    assert result.status == "succeeded"
    assert markers(conn) == ["ok"]
    assert statuses(conn) == [("succeeded", 1)]


def test_transient_failures_are_retried_with_backoff(database_url: str, conn: psycopg.Connection) -> None:
    calls: list[int] = []
    sleeps: list[float] = []

    def job(c: psycopg.Connection) -> JobOutcome:
        calls.append(1)
        insert_marker(c, f"attempt{len(calls)}")
        if len(calls) < 3:
            raise TransientError("source not ready")
        return JobOutcome(rows_written=1)

    result = run_job("test_job", "k", job, database_url=database_url, backoff_seconds=10, sleep=sleeps.append)
    assert result.status == "succeeded" and result.attempts == 3
    assert sleeps == [10, 20]
    # Writes of failed attempts were rolled back; only the successful attempt's write remains.
    assert markers(conn) == ["attempt3"]
    assert statuses(conn) == [("failed", 1), ("failed", 2), ("succeeded", 3)]


def test_permanent_errors_are_not_retried_and_roll_back(database_url: str, conn: psycopg.Connection) -> None:
    def job(c: psycopg.Connection) -> JobOutcome:
        insert_marker(c, "partial")
        raise ValueError("unexpected file layout")

    result = run_job("test_job", "k", job, database_url=database_url, sleep=lambda _: None)
    assert result.status == "failed" and result.attempts == 1
    assert "unexpected file layout" in (result.error or "")
    assert markers(conn) == []
    rows = conn.execute("select status, message from market.job_runs").fetchall()
    assert rows == [{"status": "failed", "message": "ValueError: unexpected file layout"}]


def test_gives_up_after_max_attempts(database_url: str) -> None:
    def job(c: psycopg.Connection) -> JobOutcome:
        raise TransientError("still down")

    result = run_job("test_job", "k", job, database_url=database_url, max_attempts=2, sleep=lambda _: None)
    assert result.status == "failed" and result.attempts == 2


def test_skip_if_succeeded(database_url: str, conn: psycopg.Connection) -> None:
    run_job("test_job", "day1", lambda c: JobOutcome(), database_url=database_url)
    result = run_job(
        "test_job", "day1", lambda c: pytest.fail("should not run"), database_url=database_url, skip_if_succeeded=True
    )
    assert result.status == "skipped"
    assert job_runs.has_succeeded(conn, "test_job", "day1")
    assert statuses(conn) == [("succeeded", 1), ("skipped", 1)]
