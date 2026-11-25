"""Anonymous visitors can ask about the public demo portfolio, and only that."""
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.demo_portfolio import DEMO_HOLDINGS, DEMO_TRANSACTIONS
from app.main import _requests, app

client = TestClient(app)

SEED_TS = Path(__file__).resolve().parents[2] / "src" / "services" / "seed.ts"


def _demo_payload() -> dict:
    holdings = [
        {
            "id": f"h_{i}", "symbol": symbol, "name": symbol, "assetClass": "equity",
            "quantity": quantity, "costBasis": cost, "price": cost * 1.1,
            "dayChangePct": 0.01, "currency": "USD",
        }
        for i, (symbol, quantity, cost) in enumerate(sorted(DEMO_HOLDINGS), start=1)
    ]
    transactions = [
        {
            "id": tid, "date": "2026-01-01", "type": ttype, "symbol": symbol,
            "description": "seeded", "amount": amount, "currency": "USD", "status": status,
        }
        for tid, ttype, symbol, amount, status in sorted(DEMO_TRANSACTIONS, key=lambda t: t[0])
    ]
    return {
        "question": "Am I over-concentrated in any position?",
        "portfolio": {"holdings": holdings, "transactions": transactions, "baseCurrency": "USD"},
    }


@pytest.fixture(autouse=True)
def _offline(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    _requests.clear()


def test_anonymous_visitor_can_ask_about_demo_portfolio():
    r = client.post("/api/insights", json=_demo_payload())
    assert r.status_code == 200
    assert r.json()["answer"]


def test_demo_prices_and_filtered_transactions_still_count_as_demo():
    payload = _demo_payload()
    for h in payload["portfolio"]["holdings"]:
        h["price"] *= 1.37  # the dashboard simulates price ticks
    payload["portfolio"]["transactions"] = payload["portfolio"]["transactions"][:3]
    assert client.post("/api/insights", json=payload).status_code == 200


def test_anonymous_visitor_cannot_ask_about_another_portfolio():
    payload = _demo_payload()
    payload["portfolio"]["holdings"][0]["quantity"] += 1
    r = client.post("/api/insights", json=payload)
    assert r.status_code == 401


def test_anonymous_visitor_cannot_add_holdings_or_transactions():
    extra_holding = _demo_payload()
    extra_holding["portfolio"]["holdings"].append(
        dict(extra_holding["portfolio"]["holdings"][0], id="h_x", symbol="TSLA")
    )
    assert client.post("/api/insights", json=extra_holding).status_code == 401

    extra_txn = _demo_payload()
    extra_txn["portfolio"]["transactions"].append(
        dict(extra_txn["portfolio"]["transactions"][0], id="t_x")
    )
    assert client.post("/api/insights", json=extra_txn).status_code == 401


def test_invalid_credential_is_rejected_even_for_demo_portfolio(monkeypatch):
    monkeypatch.setenv("FINVISION_API_KEY", "test-api-key")
    r = client.post(
        "/api/insights", json=_demo_payload(), headers={"Authorization": "Bearer wrong"}
    )
    assert r.status_code == 401


def test_backend_demo_portfolio_matches_frontend_seed():
    source = SEED_TS.read_text()
    holdings = {
        (symbol, float(qty), float(cost))
        for symbol, qty, cost in re.findall(
            r"symbol: '([A-Z]+)',[^}]*?quantity: ([\d.]+),\s*costBasis: ([\d.]+)",
            source,
            flags=re.S,
        )
    }
    assert holdings == {(s, float(q), float(c)) for s, q, c in DEMO_HOLDINGS}

    transactions = {
        (tid, ttype, symbol or None, float(amount), status)
        for tid, ttype, symbol, amount, status in re.findall(
            r"\{ id: '(t_\d+)'.*?type: '(\w+)',(?: symbol: '(\w+)',)?.*?"
            r"amount: (-?[\d.]+),.*?status: '(\w+)' \}",
            source,
        )
    }
    assert transactions == {
        (tid, ttype, symbol, float(amount), status)
        for tid, ttype, symbol, amount, status in DEMO_TRANSACTIONS
    }
