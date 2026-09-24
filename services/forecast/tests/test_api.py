import pytest
from fastapi.testclient import TestClient

from forecast.api.app import create_app
from forecast.settings import get_settings


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setenv("FORECAST_INTERNAL_API_KEY", "test-key")
    get_settings.cache_clear()
    return TestClient(create_app())


def test_health(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["time_utc"].endswith("Z") or "+00:00" in body["time_utc"]


@pytest.mark.parametrize("headers", [{}, {"X-Internal-Api-Key": "wrong"}])
def test_internal_endpoints_require_key(client: TestClient, headers: dict[str, str]) -> None:
    assert client.get("/internal/ping", headers=headers).status_code == 401


def test_internal_endpoint_with_key(client: TestClient) -> None:
    assert client.get("/internal/ping", headers={"X-Internal-Api-Key": "test-key"}).status_code == 200


def test_internal_endpoints_disabled_without_configured_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("FORECAST_INTERNAL_API_KEY", raising=False)
    get_settings.cache_clear()
    client = TestClient(create_app())
    assert client.get("/internal/ping", headers={"X-Internal-Api-Key": ""}).status_code == 503
