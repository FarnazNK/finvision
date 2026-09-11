from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app

client = TestClient(app)


def test_register_login_and_user_scoped_holdings():
    email = f"owner-{uuid4().hex}@example.com"
    password = "correct horse battery staple"
    registered = client.post(
        "/api/auth/register",
        json={"email": email, "password": password},
    )
    assert registered.status_code == 201
    token = registered.json()["accessToken"]
    headers = {"Authorization": f"Bearer {token}"}

    created = client.post(
        "/api/portfolio/holdings",
        headers=headers,
        json={
            "symbol": "AAPL",
            "name": "Apple",
            "assetClass": "equity",
            "quantity": 2,
            "costBasis": 300,
        },
    )
    assert created.status_code == 201
    assert created.json()["symbol"] == "AAPL"

    listed = client.get("/api/portfolio/holdings", headers=headers)
    assert listed.status_code == 200
    assert [item["symbol"] for item in listed.json()] == ["AAPL"]

    logged_in = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert logged_in.status_code == 200


def test_portfolio_requires_bearer_token():
    response = client.get("/api/portfolio/holdings")
    assert response.status_code == 401
