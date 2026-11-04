"""GET /api/portfolio/concentration: the endpoint behind the n8n concentration alert."""
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import _requests, app, market_client

client = TestClient(app)

PRICES = {"AAPL": 200.0, "VTI": 250.0}


@pytest.fixture(autouse=True)
def _offline(monkeypatch):
    monkeypatch.setenv("FINVISION_RATE_LIMIT", "1000")

    def fake_quote(symbol):
        price = PRICES.get(symbol.upper())
        if price is None:
            return {"c": 0}
        return {"c": price, "dp": 1.5}

    monkeypatch.setattr(market_client, "quote", fake_quote)
    yield
    # Don't leave this module's requests in the shared rate-limit window.
    _requests.clear()


def _user_with(holdings):
    email = f"alert-{uuid4().hex}@example.com"
    token = client.post(
        "/api/auth/register",
        json={"email": email, "password": "correct horse battery staple"},
    ).json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}
    for holding in holdings:
        assert client.post("/api/portfolio/holdings", headers=headers, json=holding).status_code == 201
    return headers


AAPL = {"symbol": "AAPL", "name": "Apple", "quantity": 10, "costBasis": 150}  # 2,000
VTI = {"symbol": "VTI", "name": "Total Market", "quantity": 20, "costBasis": 200}  # 5,000
CASH = {"symbol": "USD", "name": "Cash", "assetClass": "cash", "quantity": 3000, "costBasis": 1}  # 3,000


def test_weights_use_live_prices_and_flag_breaches():
    headers = _user_with([AAPL, VTI, CASH])

    body = client.get("/api/portfolio/concentration?threshold=0.4", headers=headers).json()

    assert body["marketValue"] == 10_000
    assert [p["symbol"] for p in body["positions"]] == ["VTI", "USD", "AAPL"]
    assert body["positions"][0]["weight"] == 0.5
    assert [b["symbol"] for b in body["breaches"]] == ["VTI"]


def test_no_breaches_below_threshold_and_top_n_limits_positions():
    headers = _user_with([AAPL, VTI, CASH])

    body = client.get("/api/portfolio/concentration?threshold=0.6&top_n=1", headers=headers).json()

    assert body["breaches"] == []
    assert len(body["positions"]) == 1


def test_only_the_signed_in_users_holdings_are_used():
    _user_with([VTI])
    headers = _user_with([AAPL])

    body = client.get("/api/portfolio/concentration", headers=headers).json()

    assert [p["symbol"] for p in body["positions"]] == ["AAPL"]
    assert body["positions"][0]["weight"] == 1.0


def test_empty_portfolio_returns_no_positions():
    body = client.get("/api/portfolio/concentration", headers=_user_with([])).json()

    assert body["marketValue"] == 0
    assert body["positions"] == [] and body["breaches"] == []


def test_missing_price_fails_instead_of_skewing_weights():
    headers = _user_with([AAPL, {"symbol": "ZZZZ", "name": "Unknown", "quantity": 1, "costBasis": 1}])

    response = client.get("/api/portfolio/concentration", headers=headers)

    assert response.status_code == 503
    assert "ZZZZ" in response.json()["detail"]


def test_requires_auth_and_validates_threshold():
    assert client.get("/api/portfolio/concentration").status_code == 401
    headers = _user_with([AAPL])
    assert client.get("/api/portfolio/concentration?threshold=0", headers=headers).status_code == 422
    assert client.get("/api/portfolio/concentration?threshold=1.5", headers=headers).status_code == 422
