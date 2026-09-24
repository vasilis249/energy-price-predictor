"""Run jobs idempotently with logging to market.job_runs and retries on transient failures.

A job is a function `(conn) -> JobOutcome` that does all its writes on the given connection; the
runner commits them only if the job succeeds. Every attempt gets its own job_runs row, written on a
separate autocommit connection so failures are recorded even when the work is rolled back.
"""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import psycopg

from forecast import db
from forecast.repo import job_runs

log = logging.getLogger(__name__)


class TransientError(Exception):
    """A failure worth retrying (network hiccup, source not yet published, rate limit)."""


class DataNotAvailable(TransientError):
    """The source hasn't published the requested data yet."""


@dataclass
class JobOutcome:
    rows_written: int = 0
    message: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


@dataclass
class JobResult:
    job: str
    target_key: str
    status: str  # succeeded | failed | skipped
    attempts: int
    outcome: JobOutcome | None = None
    error: str | None = None


def run_job(
    job: str,
    target_key: str,
    fn: Callable[[psycopg.Connection], JobOutcome],
    *,
    max_attempts: int = 3,
    backoff_seconds: float = 30.0,
    skip_if_succeeded: bool = False,
    database_url: str | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> JobResult:
    with db.connect(autocommit=True, url=database_url) as log_conn:
        if skip_if_succeeded and job_runs.has_succeeded(log_conn, job, target_key):
            run_id = job_runs.start(log_conn, job, target_key, attempt=1)
            job_runs.finish(log_conn, run_id, "skipped", message="already succeeded")
            return JobResult(job, target_key, "skipped", attempts=0)

        for attempt in range(1, max_attempts + 1):
            run_id = job_runs.start(log_conn, job, target_key, attempt)
            log.info("job %s[%s] attempt %d", job, target_key, attempt)
            try:
                with db.connect(url=database_url) as work_conn:
                    outcome = fn(work_conn)
                    work_conn.commit()
            except TransientError as exc:
                job_runs.finish(log_conn, run_id, "failed", message=f"{type(exc).__name__}: {exc}")
                if attempt == max_attempts:
                    log.error("job %s[%s] failed after %d attempts: %s", job, target_key, attempt, exc)
                    return JobResult(job, target_key, "failed", attempt, error=str(exc))
                delay = backoff_seconds * 2 ** (attempt - 1)
                log.warning("job %s[%s] transient failure, retrying in %.0fs: %s", job, target_key, delay, exc)
                sleep(delay)
            except Exception as exc:
                # Bugs and bad data don't get better by retrying.
                log.exception("job %s[%s] failed", job, target_key)
                job_runs.finish(log_conn, run_id, "failed", message=f"{type(exc).__name__}: {exc}")
                return JobResult(job, target_key, "failed", attempt, error=str(exc))
            else:
                job_runs.finish(
                    log_conn,
                    run_id,
                    "succeeded",
                    rows_written=outcome.rows_written,
                    message=outcome.message,
                    details=outcome.details,
                )
                log.info("job %s[%s] succeeded: %d rows", job, target_key, outcome.rows_written)
                return JobResult(job, target_key, "succeeded", attempt, outcome=outcome)
    raise AssertionError("unreachable")
