from pathlib import Path

import httpx
import pandas as pd
import pytest

from forecast.jobs.runner import DataNotAvailable, TransientError
from forecast.sources.entsoe import EntsoeClient, EntsoeError, parse_timeseries, to_frame

FIXTURES = Path(__file__).parent / "fixtures" / "entsoe"


def fixture(name: str) -> bytes:
    return (FIXTURES / name).read_bytes()


def test_a03_curve_forward_fills_omitted_positions() -> None:
    frame = to_frame(parse_timeseries(fixture("a44_gr_pt15m_a03.xml"), "price.amount"))
    assert len(frame) == 96
    assert frame["delivery_start"].iloc[0] == pd.Timestamp("2026-01-14T22:00Z")
    assert frame["value"].iloc[:6].tolist() == [110.5, 105.25, 105.25, 105.25, -0.01, -0.01]
    assert frame["value"].iloc[-1] == 130
    assert set(frame["resolution_minutes"]) == {15}


def test_hourly_prices_and_other_namespace_versions() -> None:
    frame = to_frame(parse_timeseries(fixture("a44_gr_pt60m.xml"), "price.amount"))
    assert frame["delivery_start"].tolist() == [pd.Timestamp("2025-09-29T21:00Z"), pd.Timestamp("2025-09-29T22:00Z")]
    assert frame["resolution_minutes"].tolist() == [60, 60]


def test_load_quantities() -> None:
    frame = to_frame(parse_timeseries(fixture("a65_gr_load.xml"), "quantity"))
    assert frame["value"].tolist() == [5100, 5050, 5000, 4980]


def test_no_data_acknowledgement() -> None:
    with pytest.raises(DataNotAvailable, match="No matching data"):
        parse_timeseries(fixture("ack_no_data.xml"), "price.amount")


def client_with(handler: httpx.MockTransport) -> EntsoeClient:
    return EntsoeClient("token", http=httpx.Client(transport=handler))


def test_client_builds_the_documented_request_and_clips_to_window() -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(200, content=fixture("a44_gr_pt15m_a03.xml"))

    frame = client_with(httpx.MockTransport(handler)).day_ahead_prices(
        "GR", pd.Timestamp("2026-01-14T22:00Z"), pd.Timestamp("2026-01-14T23:00Z")
    )
    assert len(frame) == 4
    params = seen[0].url.params
    assert params["documentType"] == "A44"
    assert params["in_Domain"] == params["out_Domain"] == "10YGR-HTSO-----Y"
    assert params["periodStart"] == "202601142200" and params["periodEnd"] == "202601142300"
    assert params["securityToken"] == "token"


@pytest.mark.parametrize(
    ("status", "error"),
    [(503, TransientError), (429, TransientError), (401, EntsoeError), (400, EntsoeError)],
)
def test_http_errors_are_classified(status: int, error: type[Exception]) -> None:
    client = client_with(httpx.MockTransport(lambda r: httpx.Response(status, text="nope")))
    with pytest.raises(error):
        client.day_ahead_prices("GR", pd.Timestamp("2026-01-14T22:00Z"), pd.Timestamp("2026-01-15T22:00Z"))


def test_no_data_on_http_400_is_data_not_available() -> None:
    client = client_with(httpx.MockTransport(lambda r: httpx.Response(400, content=fixture("ack_no_data.xml"))))
    with pytest.raises(DataNotAvailable):
        client.day_ahead_prices("GR", pd.Timestamp("2026-01-15T22:00Z"), pd.Timestamp("2026-01-16T22:00Z"))


def test_network_failure_is_transient() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("boom")

    with pytest.raises(TransientError):
        client_with(httpx.MockTransport(handler)).day_ahead_prices(
            "GR", pd.Timestamp("2026-01-14T22:00Z"), pd.Timestamp("2026-01-15T22:00Z")
        )


def test_missing_token() -> None:
    with pytest.raises(EntsoeError, match="ENTSOE_API_TOKEN"):
        EntsoeClient("")
