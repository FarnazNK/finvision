from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PAYLOAD = {
    "question": "How is my portfolio doing?",
    "portfolio": {
        "holdings": [{
            "id": "h1", "symbol": "AAA", "name": "A", "assetClass": "equity",
            "quantity": 10, "costBasis": 100, "price": 150,
            "dayChangePct": 0.01, "currency": "USD"
        }],
        "transactions": [], "baseCurrency": "USD"
    },
}


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_insights_offline(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    r = client.post("/api/insights", json=PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert "1,500" in body["answer"] or "1500" in body["answer"]
    assert body["model"] == "offline-fallback"
