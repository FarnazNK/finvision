from dataclasses import dataclass

from fastapi.testclient import TestClient

from app.main import app, market_client
from app.market_data import FinnhubClient

client = TestClient(app)


@dataclass
class FakeResponse:
    payload: dict

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_finnhub_client_caches_quote(monkeypatch):
    calls = []

    def fake_get(url, params, timeout):
        calls.append((url, params, timeout))
        return FakeResponse({"c": 123.4})

    monkeypatch.setattr("app.market_data.httpx.get", fake_get)
    provider = FinnhubClient(api_key="test-key", cache_ttl=60)

    assert provider.quote("aapl")["c"] == 123.4
    assert provider.quote("AAPL")["c"] == 123.4
    assert len(calls) == 1
    assert calls[0][1]["symbol"] == "AAPL"


def test_quote_endpoint_maps_provider_response(monkeypatch):
    monkeypatch.setattr(
        market_client,
        "quote",
        lambda symbol: {
            "c": 190.2,
            "d": 1.2,
            "dp": 0.63,
            "h": 191,
            "l": 188,
            "o": 189,
            "pc": 189,
            "t": 1700000000,
        },
    )
    response = client.get("/api/markets/quote?symbol=aapl")
    assert response.status_code == 200
    assert response.json()["symbol"] == "AAPL"
    assert response.json()["current"] == 190.2


def test_markets_require_provider_configuration(monkeypatch):
    monkeypatch.setattr(market_client, "api_key", "")
    response = client.get("/api/markets/quote?symbol=AAPL")
    assert response.status_code == 503
