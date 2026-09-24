"""ENTSO-E Transparency Platform REST API client.

Docs: https://transparencyplatform.zendesk.com (REST API guide). Requests need a security token
(ENTSOE_API_TOKEN), and there's a limit of 400 requests per minute per token.

Responses are IEC 62325 XML. The parser deliberately ignores XML namespaces, which change between
document versions (and the response format changed on 2025-11-25). It handles:
- mixed resolutions (PT15M since 2025-10-01 for day-ahead prices, PT60M before, PT30M elsewhere),
- curve type A03, where a position is omitted when its value equals the previous one,
- "no data" acknowledgement documents, which come back with HTTP 200.

TODO(M2): verify against live responses once the token and network access are in place.
"""

from __future__ import annotations

import re
import threading
import time
import xml.etree.ElementTree as ET
from collections.abc import Iterator
from dataclasses import dataclass
from datetime import datetime

import httpx
import pandas as pd
from defusedxml import ElementTree as SafeET

from forecast.jobs.runner import DataNotAvailable, TransientError
from forecast.timeutil import UTC, ensure_utc

BASE_URL = "https://web-api.tp.entsoe.eu/api"

# EIC codes of bidding zones relevant to Greece (GR is coupled with BG and Italy-South; the others
# are non-coupled neighbours with explicit capacity allocation).
ZONES: dict[str, str] = {
    "GR": "10YGR-HTSO-----Y",
    "BG": "10YCA-BULGARIA-R",
    "IT-SUD": "10Y1001A1001A788",
    "MK": "10YMK-MEPSO----8",
    "AL": "10YAL-KESH-----5",
    "TR": "10YTR-TEIAS----W",
}

RESOLUTIONS = {"PT15M": 15, "PT30M": 30, "PT60M": 60, "P1D": 1440}


class EntsoeError(Exception):
    """Non-retryable API problem (bad token, bad request)."""


@dataclass(frozen=True)
class Point:
    start: pd.Timestamp
    resolution_minutes: int
    value: float


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children(el: ET.Element, name: str) -> Iterator[ET.Element]:
    return (c for c in el if _local(c.tag) == name)


def _child(el: ET.Element, name: str) -> ET.Element | None:
    return next(_children(el, name), None)


def _text(el: ET.Element, *path: str) -> str | None:
    node: ET.Element | None = el
    for name in path:
        node = _child(node, name) if node is not None else None
    return node.text.strip() if node is not None and node.text else None


def _parse_iso_minutes(value: str) -> pd.Timestamp:
    # ENTSO-E uses e.g. 2026-01-14T23:00Z (no seconds).
    return ensure_utc(pd.Timestamp(value))


def parse_timeseries(xml: str | bytes, value_field: str) -> list[Point]:
    """Parse a Publication/GL_MarketDocument into points (UTC starts).

    `value_field` is the Point child holding the value: 'price.amount' for prices, 'quantity' for
    load/generation. Raises DataNotAvailable for acknowledgement ("no matching data") documents.
    """
    root = SafeET.fromstring(xml)  # external input: no entity expansion / external entities
    if _local(root.tag) == "Acknowledgement_MarketDocument":
        reason = _text(root, "Reason", "text") or _text(root, "Reason", "code") or "no data"
        if "no matching data" in reason.lower() or _text(root, "Reason", "code") == "999":
            raise DataNotAvailable(f"ENTSO-E: {reason}")
        raise EntsoeError(f"ENTSO-E acknowledgement: {reason}")

    points: dict[tuple[pd.Timestamp, int], float] = {}
    for series in _children(root, "TimeSeries"):
        curve_type = _text(series, "curveType") or "A01"
        for period in _children(series, "Period"):
            interval = _child(period, "timeInterval")
            resolution_text = _text(period, "resolution")
            if interval is None or resolution_text not in RESOLUTIONS:
                raise EntsoeError(f"unsupported period (resolution={resolution_text!r})")
            minutes = RESOLUTIONS[resolution_text]
            start = _parse_iso_minutes(_text(interval, "start") or "")
            end = _parse_iso_minutes(_text(interval, "end") or "")
            step = pd.Timedelta(minutes=minutes)
            count = int((end - start) / step)
            by_position: dict[int, float] = {}
            for point in _children(period, "Point"):
                position = int(_text(point, "position") or 0)
                raw = _text(point, value_field)
                if raw is None:
                    continue
                by_position[position] = float(raw)
            if not by_position:
                continue
            last: float | None = None
            for position in range(1, count + 1):
                if position in by_position:
                    last = by_position[position]
                elif curve_type != "A03" or last is None:
                    continue  # A01: a missing point is genuinely missing
                assert last is not None
                key = (start + step * (position - 1), minutes)
                points.setdefault(key, last)  # first TimeSeries wins on duplicates
    return [Point(ts, res, v) for (ts, res), v in sorted(points.items())]


def to_frame(points: list[Point]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "delivery_start": pd.DatetimeIndex([p.start for p in points], tz=UTC),
            "resolution_minutes": [p.resolution_minutes for p in points],
            "value": [p.value for p in points],
        }
    )


class _RateLimiter:
    """At most `per_minute` requests per rolling minute (ENTSO-E allows 400; we stay well below)."""

    def __init__(self, per_minute: int = 300):
        self.interval = 60.0 / per_minute
        self._next = 0.0
        self._lock = threading.Lock()

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            delay = self._next - now
            self._next = max(now, self._next) + self.interval
        if delay > 0:
            time.sleep(delay)


def _fmt(ts: datetime) -> str:
    return ensure_utc(ts).strftime("%Y%m%d%H%M")


class EntsoeClient:
    def __init__(self, token: str, *, base_url: str = BASE_URL, http: httpx.Client | None = None):
        if not token:
            raise EntsoeError("ENTSOE_API_TOKEN is not set")
        self._token = token
        self._base_url = base_url
        self._http = http or httpx.Client(timeout=60.0)
        self._limiter = _RateLimiter()

    def _get(self, params: dict[str, str]) -> bytes:
        self._limiter.wait()
        try:
            response = self._http.get(self._base_url, params={**params, "securityToken": self._token})
        except httpx.HTTPError as exc:
            raise TransientError(f"ENTSO-E request failed: {exc}") from exc
        if response.status_code in (429, 500, 502, 503, 504):
            raise TransientError(f"ENTSO-E HTTP {response.status_code}")
        if response.status_code == 401:
            raise EntsoeError("ENTSO-E rejected the security token (HTTP 401)")
        if response.status_code == 400 and b"Acknowledgement_MarketDocument" in response.content:
            # Some "no data" answers come back as 400 with an acknowledgement document.
            parse_timeseries(response.content, "price.amount")
        if response.status_code != 200:
            detail = re.sub(r"\s+", " ", response.text[:300])
            raise EntsoeError(f"ENTSO-E HTTP {response.status_code}: {detail}")
        return response.content

    def day_ahead_prices(self, zone: str, start: datetime, end: datetime) -> pd.DataFrame:
        """Day-ahead clearing prices (EUR/MWh) for [start, end)."""
        eic = ZONES[zone]
        xml = self._get(
            {
                "documentType": "A44",
                "in_Domain": eic,
                "out_Domain": eic,
                "contract_MarketAgreement.type": "A01",
                "periodStart": _fmt(start),
                "periodEnd": _fmt(end),
            }
        )
        return _clip(to_frame(parse_timeseries(xml, "price.amount")), start, end)

    def load_forecast(self, zone: str, start: datetime, end: datetime, *, week_ahead: bool = False) -> pd.DataFrame:
        """Total load forecast (MW): day-ahead (A01) or week-ahead (A31)."""
        xml = self._get(
            {
                "documentType": "A65",
                "processType": "A31" if week_ahead else "A01",
                "outBiddingZone_Domain": ZONES[zone],
                "periodStart": _fmt(start),
                "periodEnd": _fmt(end),
            }
        )
        return _clip(to_frame(parse_timeseries(xml, "quantity")), start, end)

    def wind_solar_forecast(self, zone: str, start: datetime, end: datetime, psr_type: str) -> pd.DataFrame:
        """Day-ahead generation forecast (MW) for B16 solar, B18 wind offshore or B19 wind onshore."""
        xml = self._get(
            {
                "documentType": "A69",
                "processType": "A01",
                "in_Domain": ZONES[zone],
                "psrType": psr_type,
                "periodStart": _fmt(start),
                "periodEnd": _fmt(end),
            }
        )
        return _clip(to_frame(parse_timeseries(xml, "quantity")), start, end)


def _clip(frame: pd.DataFrame, start: datetime, end: datetime) -> pd.DataFrame:
    s, e = ensure_utc(start), ensure_utc(end)
    return frame[(frame["delivery_start"] >= s) & (frame["delivery_start"] < e)].reset_index(drop=True)
