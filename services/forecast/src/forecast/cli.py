"""Command line entry point: `forecast <command>` (run inside services/forecast with `uv run`)."""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import date, timedelta

import pandas as pd

from forecast import db
from forecast.jobs import forecasting, ingestion
from forecast.jobs.runner import JobResult, run_job
from forecast.repo import job_runs
from forecast.settings import get_settings
from forecast.timeutil import local_day


def _date(value: str) -> date:
    return date.fromisoformat(value)


def _today() -> date:
    return local_day(pd.Timestamp.now(tz="UTC"))


def _days(start: date, end: date) -> list[date]:
    return [start + timedelta(days=i) for i in range((end - start).days + 1)]


def _report(results: list[JobResult]) -> int:
    for r in results:
        detail = r.error or (r.outcome.message if r.outcome else "") or ""
        print(f"{r.status:9} {r.job}[{r.target_key}] attempts={r.attempts} {detail}")
    return 1 if any(r.status == "failed" for r in results) else 0


def cmd_forecast(args: argparse.Namespace) -> int:
    zone = get_settings().zone
    as_of = pd.Timestamp(args.as_of) if args.as_of else forecasting.default_as_of(args.date)
    result = run_job(
        "forecast_baseline",
        f"{zone}:{args.date.isoformat()}",
        forecasting.forecast_baseline(zone, args.date, as_of),
        max_attempts=args.attempts,
    )
    return _report([result])


def cmd_evaluate(args: argparse.Namespace) -> int:
    zone = get_settings().zone
    result = run_job(
        "evaluate",
        f"{zone}:{args.date.isoformat()}",
        forecasting.evaluate_day(zone, args.date),
        max_attempts=args.attempts,
    )
    return _report([result])


def cmd_backtest(args: argparse.Namespace) -> int:
    """Replay the daily forecast for past issue days (each with its historical cutoff), then score them."""
    zone = get_settings().zone
    results = []
    for day in _days(args.start, args.end):
        as_of = forecasting.default_as_of(day)
        results.append(
            run_job(
                "forecast_baseline",
                f"{zone}:{day.isoformat()}",
                forecasting.forecast_baseline(zone, day, as_of),
                max_attempts=1,
            )
        )
    for day in _days(args.start + timedelta(days=1), min(args.end + timedelta(days=7), _today())):
        job = forecasting.evaluate_day(zone, day)
        results.append(run_job("evaluate", f"{zone}:{day.isoformat()}", job, max_attempts=1))
    return _report(results)


def cmd_ingest_entsoe(args: argparse.Namespace) -> int:
    from forecast.sources.entsoe import EntsoeClient

    token = get_settings().entsoe_api_token
    client = EntsoeClient(token.get_secret_value() if token else "")
    today = _today()
    results = []
    for zone in args.zones:
        for day in _days(args.start, args.end):
            results.append(
                run_job(
                    "ingest_entsoe_prices",
                    f"{zone}:{day.isoformat()}",
                    ingestion.ingest_entsoe_prices(client, zone, day),
                    # Past days never change: don't refetch them. Today/tomorrow may be republished.
                    skip_if_succeeded=day < today and not args.force,
                    max_attempts=args.attempts,
                )
            )
    return _report(results)


def cmd_recent(args: argparse.Namespace) -> int:
    with db.connect() as conn:
        for row in job_runs.recent(conn, args.limit):
            print(
                f"{row['started_at']:%Y-%m-%d %H:%M} {row['status']:9} {row['job']}[{row['target_key']}] "
                f"attempt={row['attempt']} rows={row['rows_written']} {row['message'] or ''}"
            )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="forecast", description="Greek day-ahead price forecasting jobs")
    parser.add_argument("-v", "--verbose", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("forecast", help="issue the baseline forecast for D+1..D+7")
    p.add_argument("--date", type=_date, default=None, help="issue day (Athens), default today")
    p.add_argument("--as-of", help="information cutoff (ISO timestamp); default now/scheduled issue time")
    p.add_argument("--attempts", type=int, default=3)
    p.set_defaults(func=cmd_forecast)

    p = sub.add_parser("evaluate", help="score stored forecasts for a delivery day against actual prices")
    p.add_argument("--date", type=_date, default=None, help="delivery day (Athens), default today")
    p.add_argument("--attempts", type=int, default=3)
    p.set_defaults(func=cmd_evaluate)

    p = sub.add_parser("backtest", help="replay daily forecasts over past issue days and score them")
    p.add_argument("--from", dest="start", type=_date, required=True)
    p.add_argument("--to", dest="end", type=_date, required=True)
    p.set_defaults(func=cmd_backtest)

    p = sub.add_parser("ingest-entsoe", help="fetch day-ahead prices from ENTSO-E for a range of Athens days")
    p.add_argument("--from", dest="start", type=_date, default=None)
    p.add_argument("--to", dest="end", type=_date, default=None)
    p.add_argument("--zones", nargs="+", default=["GR"])
    p.add_argument("--attempts", type=int, default=3)
    p.add_argument("--force", action="store_true", help="refetch days that already succeeded")
    p.set_defaults(func=cmd_ingest_entsoe)

    p = sub.add_parser("recent", help="show recent job runs")
    p.add_argument("--limit", type=int, default=20)
    p.set_defaults(func=cmd_recent)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s %(message)s")
    if getattr(args, "date", "unset") is None:
        args.date = _today()
    if getattr(args, "start", "unset") is None:
        args.start = _today()
    if getattr(args, "end", "unset") is None:
        args.end = args.start + timedelta(days=1)  # today and tomorrow
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
