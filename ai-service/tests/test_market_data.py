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


def _fake_quotes(prices):
    def quote(symbol):
        if symbol not in prices:
            from app.market_data import MarketDataError
            raise MarketDataError("boom")
        c = prices[symbol]
        return {"c": c, "d": 1.0, "dp": 0.5, "h": c, "l": c, "o": c, "pc": c - 1, "t": 1700000000}
    return quote


def test_batch_quotes_returns_priced_and_unavailable(monkeypatch):
    monkeypatch.setattr(market_client, "api_key", "test-key")
    monkeypatch.setattr(market_client, "quote", _fake_quotes({"AAPL": 190.2, "VTI": 246.1, "ZZZZ": 0}))
    r = client.get("/api/markets/quotes?symbols=aapl,VTI,ZZZZ,MISSING,aapl")
    assert r.status_code == 200
    body = r.json()
    assert [q["symbol"] for q in body["quotes"]] == ["AAPL", "VTI"]
    assert body["quotes"][0]["changePercent"] == 0.5
    assert body["unavailable"] == ["ZZZZ", "MISSING"]


def test_batch_quotes_validation_and_configuration(monkeypatch):
    monkeypatch.setattr(market_client, "api_key", "test-key")
    assert client.get("/api/markets/quotes?symbols=").status_code == 400
    many = ",".join(f"S{i}" for i in range(26))
    assert client.get(f"/api/markets/quotes?symbols={many}").status_code == 400
    monkeypatch.setattr(market_client, "quote", _fake_quotes({}))
    assert client.get("/api/markets/quotes?symbols=AAPL").status_code == 503
    monkeypatch.setattr(market_client, "api_key", "")
    assert client.get("/api/markets/quotes?symbols=AAPL").status_code == 503
