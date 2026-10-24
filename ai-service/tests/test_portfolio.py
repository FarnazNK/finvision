"""Server-side portfolio snapshots, AI grounding and exact-decimal storage."""
from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app import main
from app.market_data import MarketDataError
from app.persistence import HoldingRecord, SessionLocal

client = TestClient(main.app)


class FakeQuotes:
    """Stands in for Finnhub: known prices for some symbols, errors for others."""

    def __init__(self, prices: dict[str, dict]) -> None:
        self.prices = prices

    def quote(self, symbol: str) -> dict:
        if symbol not in self.prices:
            raise MarketDataError("no quote")
        return self.prices[symbol]


@pytest.fixture
def no_market(monkeypatch):
    monkeypatch.setattr(main, "market_client", FakeQuotes({}))


def _signed_in_user() -> dict[str, str]:
    registered = client.post(
        "/api/auth/register",
        json={"email": f"user-{uuid4().hex}@example.com", "password": "correct horse battery"},
    )
    assert registered.status_code == 201
    return {"Authorization": f"Bearer {registered.json()['accessToken']}"}


def _add(headers, symbol, quantity, cost_basis, asset_class="equity"):
    response = client.post(
        "/api/portfolio/holdings",
        headers=headers,
        json={
            "symbol": symbol,
            "name": symbol,
            "assetClass": asset_class,
            "quantity": quantity,
            "costBasis": cost_basis,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_quantities_and_cost_basis_are_stored_exactly(no_market):
    headers = _signed_in_user()
    created = _add(headers, "BTC", "0.12345678", "0.1")

    with SessionLocal() as session:
        record = session.scalar(select(HoldingRecord).where(HoldingRecord.id == created["id"]))
    assert record.quantity == Decimal("0.12345678")
    assert record.cost_basis == Decimal("0.1")
    # Clients still receive plain JSON numbers.
    assert created["quantity"] == pytest.approx(0.12345678)


def test_excess_precision_is_rejected_not_silently_rounded(no_market):
    headers = _signed_in_user()
    response = client.post(
        "/api/portfolio/holdings",
        headers=headers,
        json={"symbol": "X", "name": "X", "quantity": "1.123456789", "costBasis": 1},
    )
    assert response.status_code == 422


def test_snapshot_is_built_from_the_users_saved_holdings(monkeypatch):
    monkeypatch.setattr(
        main, "market_client", FakeQuotes({"AAPL": {"c": 200.0, "dp": 1.5}})
    )
    headers = _signed_in_user()
    _add(headers, "AAPL", 2, 150)
    _add(headers, "ZZZZ", 4, 25)  # no quote: valued at cost

    snapshot = client.get("/api/portfolio/snapshot", headers=headers)
    assert snapshot.status_code == 200
    body = snapshot.json()
    by_symbol = {h["symbol"]: h for h in body["holdings"]}
    assert by_symbol["AAPL"]["price"] == 200.0
    assert by_symbol["AAPL"]["dayChangePct"] == pytest.approx(0.015)
    assert by_symbol["ZZZZ"]["price"] == 25.0
    assert body["priceSource"] == "mixed"


def test_empty_portfolio_snapshot(no_market):
    body = client.get("/api/portfolio/snapshot", headers=_signed_in_user()).json()
    assert body["holdings"] == []
    assert body["priceSource"] == "empty"


def test_snapshot_requires_sign_in():
    assert client.get("/api/portfolio/snapshot").status_code == 401


def test_insights_use_the_server_snapshot_and_ignore_client_figures(monkeypatch, no_market):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    headers = _signed_in_user()
    _add(headers, "AAPL", 3, 100)  # worth 300 at cost

    forged = {
        "question": "How is my portfolio doing?",
        # A client trying to make the model reason over fake numbers.
        "portfolio": {
            "holdings": [{
                "id": "x", "symbol": "FAKE", "name": "Fake", "assetClass": "equity",
                "quantity": 1_000_000, "costBasis": 1, "price": 999,
                "dayChangePct": 0, "currency": "USD",
            }],
            "transactions": [],
            "baseCurrency": "USD",
        },
    }
    response = client.post("/api/insights", json=forged, headers=headers)
    assert response.status_code == 200
    answer = response.json()["answer"]
    assert "300" in answer
    assert "999" not in answer and "FAKE" not in answer


def test_users_cannot_see_or_delete_each_others_holdings(no_market):
    owner = _signed_in_user()
    other = _signed_in_user()
    holding = _add(owner, "MSFT", 1, 400)

    assert client.get("/api/portfolio/snapshot", headers=other).json()["holdings"] == []
    stolen = client.delete(f"/api/portfolio/holdings/{holding['id']}", headers=other)
    assert stolen.status_code == 404

    deleted = client.delete(f"/api/portfolio/holdings/{holding['id']}", headers=owner)
    assert deleted.status_code == 204
    assert client.get("/api/portfolio/snapshot", headers=owner).json()["holdings"] == []
