"""GraphQL authorization and bounded read-only portfolio regression tests."""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def _create_account(client, name):
    response = client.post(
        "/api/auth/register",
        json={"email": f"{name}-{uuid4().hex}@example.com", "password": "long-safe-test-password"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def test_graphql_requires_jwt_and_disables_get():
    client = TestClient(app)
    assert client.post("/api/graphql", json={"query": "{ holdings { symbol } }"}).status_code == 401
    assert client.get("/api/graphql?query=%7Bholdings%7Bsymbol%7D%7D").status_code in (404, 405)


def test_graphql_isolates_portfolios():
    client = TestClient(app)
    a = _create_account(client, "graphql-owner")
    b = _create_account(client, "graphql-other")
    created = client.post(
        "/api/portfolio/holdings",
        headers=a,
        json={
            "symbol": "DEMO",
            "name": "Synthetic Demo",
            "assetClass": "equity",
            "quantity": 1,
            "costBasis": 1,
        },
    )
    assert created.status_code == 201
    query = {"query": "{ holdings(limit: 10) { symbol name assetClass currency } }"}
    owner = client.post("/api/graphql", json=query, headers=a)
    other = client.post("/api/graphql", json=query, headers=b)
    assert owner.status_code == other.status_code == 200
    assert any(h["symbol"] == "DEMO" for h in owner.json()["data"]["holdings"])
    assert other.json()["data"]["holdings"] == []


def test_graphql_rejects_introspection_mutation_fragments_and_large_requests():
    client = TestClient(app)
    headers = _create_account(client, "graphql-bound")
    for query in [
        "{ __schema { types { name } } }",
        "mutation { holdings { symbol } }",
        "{ holdings { ...Frag } } fragment Frag on Holding { symbol }",
        "{ one: holdings { symbol } two: holdings { symbol } }",
    ]:
        response = client.post("/api/graphql", json={"query": query}, headers=headers)
        assert response.status_code == 400
    response = client.post(
        "/api/graphql",
        json={"query": "{ holdings { symbol } }", "padding": "x" * 5000},
        headers=headers,
    )
    assert response.status_code == 413


def test_graphql_limits_holdings_count():
    client = TestClient(app)
    headers = _create_account(client, "graphql-limit")
    response = client.post(
        "/api/graphql",
        json={"query": "{ holdings(limit: 51) { symbol } }"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json().get("errors")
