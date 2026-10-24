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


def test_demo_insights_offline_without_sign_in(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    r = client.post("/api/demo/insights", json=PAYLOAD)
    assert r.status_code == 200
    body = r.json()
    assert "1,500" in body["answer"] or "1500" in body["answer"]
    assert body["model"] == "offline-fallback"


def test_demo_insights_rejects_oversized_portfolio():
    holding = PAYLOAD["portfolio"]["holdings"][0]
    too_many = [{**holding, "id": f"h{i}"} for i in range(201)]
    body = {**PAYLOAD, "portfolio": {**PAYLOAD["portfolio"], "holdings": too_many}}
    assert client.post("/api/demo/insights", json=body).status_code == 422


def test_signed_in_insights_require_a_user_token(monkeypatch):
    # The old service key no longer unlocks the per-user endpoint.
    monkeypatch.setenv("FINVISION_API_KEY", "test-api-key")
    r = client.post(
        "/api/insights",
        json=PAYLOAD,
        headers={"Authorization": "Bearer test-api-key"},
    )
    assert r.status_code == 401
    assert client.post("/api/insights", json=PAYLOAD).status_code == 401


def test_metrics_routes_are_distinct(monkeypatch):
    monkeypatch.setenv("FINVISION_API_KEY", "test-api-key")
    summary = client.get(
        "/metrics/summary", headers={"Authorization": "Bearer test-api-key"}
    )
    assert summary.status_code == 200
    assert "requests_total" in summary.json()

    prometheus = client.get("/metrics")
    assert prometheus.status_code == 200
    assert prometheus.headers["content-type"].startswith("text/plain")
