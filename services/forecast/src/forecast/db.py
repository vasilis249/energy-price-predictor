"""Postgres access (psycopg 3). The service talks to the database directly, not via the Data API."""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from forecast.settings import get_settings


def database_url() -> str:
    url = get_settings().database_url
    if url is None:
        raise RuntimeError("FORECAST_DATABASE_URL is not set")
    return url.get_secret_value()


def connect(*, autocommit: bool = False, url: str | None = None) -> psycopg.Connection:
    return psycopg.connect(url or database_url(), autocommit=autocommit, row_factory=dict_row)


@contextmanager
def transaction(url: str | None = None) -> Iterator[psycopg.Connection]:
    """A connection whose work is committed on success and rolled back on error."""
    with connect(url=url) as conn:
        yield conn
