"""Stripe Pro subscription: Checkout, signed idempotent webhooks, and the
server-side Pro check on AI insights. Stripe API calls are faked; signatures
are real HMACs, verified by the real Stripe SDK."""
from __future__ import annotations

import hashlib
import hmac
import json
import time
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app import billing
from app import main as main_module
from app.main import app

client = TestClient(app)

WEBHOOK_SECRET = "whsec_test_finvision_billing"
PORTFOLIO = {
    "holdings": [{"id": "1", "symbol": "AAPL", "name": "Apple", "assetClass": "equity",
                  "quantity": 2, "costBasis": 100, "price": 150, "dayChangePct": 0.5,
                  "currency": "USD"}],
    "transactions": [],
    "baseCurrency": "USD",
}


class FakeStripe:
    """Records calls and returns Stripe-shaped dicts."""

    def __init__(self) -> None:
        self.customers: list[dict] = []
        self.checkouts: list[dict] = []
        self.subscriptions: dict[str, dict] = {}
        self.retrieves = 0
        fake = self

        class Customer:
            @staticmethod
            def create(**kwargs):
                fake.customers.append(kwargs)
                return {"id": f"cus_{len(fake.customers)}_{uuid4().hex[:6]}"}

        class _CheckoutSession:
            @staticmethod
            def create(**kwargs):
                fake.checkouts.append(kwargs)
                return {"id": "cs_test", "url": "https://checkout.stripe.com/c/pay/cs_test"}

        class _Checkout:
            Session = _CheckoutSession

        class _PortalSession:
            @staticmethod
            def create(**kwargs):
                return {"url": f"https://billing.stripe.com/p/session/{kwargs['customer']}"}

        class _Portal:
            Session = _PortalSession

        class Subscription:
            @staticmethod
            def retrieve(subscription_id):
                fake.retrieves += 1
                return fake.subscriptions[subscription_id]

        self.Customer = Customer
        self.checkout = _Checkout
        self.billing_portal = _Portal
        self.Subscription = Subscription


@pytest.fixture(autouse=True)
def _fresh_rate_limit():
    """These tests register many users; keep the shared per-IP limiter from
    leaking into this or other test modules."""
    main_module._requests.clear()
    yield
    main_module._requests.clear()


@pytest.fixture
def stripe_on(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_fake")
    monkeypatch.setenv("STRIPE_PRICE_ID", "price_pro_monthly")
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET)
    monkeypatch.setenv("FINVISION_APP_URL", "https://example.github.io/finvision/app")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    fake = FakeStripe()
    monkeypatch.setattr(billing, "_stripe", lambda: fake)
    return fake


def _user() -> dict[str, str]:
    response = client.post(
        "/api/auth/register",
        json={"email": f"pro-{uuid4().hex}@example.com", "password": "correct horse battery staple"},
    )
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}


def _signed(event: dict, secret: str = WEBHOOK_SECRET) -> dict:
    payload = json.dumps(event).encode()
    ts = int(time.time())
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + payload, hashlib.sha256).hexdigest()
    return {"content": payload, "headers": {"Stripe-Signature": f"t={ts},v1={sig}"}}


def _subscription_event(sub_id: str, event_type="customer.subscription.updated", event_id=None):
    return {
        "id": event_id or f"evt_{uuid4().hex}",
        "object": "event",
        "type": event_type,
        "data": {"object": {"id": sub_id, "object": "subscription"}},
    }


def _subscribe(fake: FakeStripe, headers: dict, status: str = "active") -> str:
    """Run checkout, then deliver the webhook Stripe would send."""
    client.post("/api/billing/checkout", headers=headers)
    customer_id = fake.checkouts[-1]["customer"]
    sub_id = f"sub_{uuid4().hex[:10]}"
    fake.subscriptions[sub_id] = {
        "id": sub_id, "customer": customer_id, "status": status,
        "items": {"data": [{"current_period_end": int(time.time()) + 30 * 86400}]},
    }
    response = client.post("/api/billing/webhook", **_signed(_subscription_event(sub_id)))
    assert response.status_code == 200
    return sub_id


def _ask(headers: dict):
    return client.post("/api/insights", headers=headers,
                       json={"question": "How concentrated am I?", "portfolio": PORTFOLIO})


# --- Checkout ---------------------------------------------------------------


def test_checkout_disabled_without_stripe_config(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("STRIPE_PRICE_ID", raising=False)
    headers = _user()
    assert client.post("/api/billing/checkout", headers=headers).status_code == 503
    status = client.get("/api/billing/status", headers=headers).json()
    assert status == {"billingEnabled": False, "plan": "free", "status": "none",
                      "currentPeriodEnd": None}


def test_checkout_requires_sign_in(stripe_on):
    assert client.post("/api/billing/checkout").status_code == 401


def test_checkout_uses_server_price_and_urls_and_reuses_customer(stripe_on):
    headers = _user()
    first = client.post("/api/billing/checkout", headers=headers)
    second = client.post("/api/billing/checkout", headers={**headers, "Idempotency-Key": "upgrade-click-1"})

    assert first.status_code == second.status_code == 200
    assert first.json()["url"].startswith("https://checkout.stripe.com/")
    assert len(stripe_on.customers) == 1  # one Stripe customer per user
    call = stripe_on.checkouts[-1]
    assert call["mode"] == "subscription"
    assert call["line_items"] == [{"price": "price_pro_monthly", "quantity": 1}]
    assert call["success_url"] == "https://example.github.io/finvision/app?billing=success"
    assert call["customer"] == stripe_on.checkouts[0]["customer"]
    assert call["idempotency_key"].endswith("-upgrade-click-1")


def test_checkout_ignores_client_supplied_price(stripe_on):
    headers = _user()
    client.post("/api/billing/checkout", headers=headers, json={"price": "price_free_hack"})
    assert stripe_on.checkouts[-1]["line_items"][0]["price"] == "price_pro_monthly"


def test_checkout_rejects_malformed_idempotency_key(stripe_on):
    response = client.post("/api/billing/checkout",
                           headers={**_user(), "Idempotency-Key": "bad key!"})
    assert response.status_code == 422


def test_already_subscribed_user_is_sent_to_portal(stripe_on):
    headers = _user()
    _subscribe(stripe_on, headers)
    assert client.post("/api/billing/checkout", headers=headers).status_code == 409
    portal = client.post("/api/billing/portal", headers=headers)
    assert portal.status_code == 200
    assert portal.json()["url"].startswith("https://billing.stripe.com/")


# --- Webhook ----------------------------------------------------------------


def test_webhook_rejects_forged_signature(stripe_on):
    response = client.post("/api/billing/webhook",
                           **_signed(_subscription_event("sub_x"), secret="whsec_guess"))
    assert response.status_code == 400


def test_webhook_rejects_missing_signature(stripe_on):
    response = client.post("/api/billing/webhook",
                           content=json.dumps(_subscription_event("sub_x")).encode())
    assert response.status_code == 400


def test_webhook_disabled_without_secret(monkeypatch):
    monkeypatch.delenv("STRIPE_WEBHOOK_SECRET", raising=False)
    response = client.post("/api/billing/webhook", **_signed(_subscription_event("sub_x")))
    assert response.status_code == 503


def test_active_subscription_unlocks_pro(stripe_on):
    headers = _user()
    _subscribe(stripe_on, headers)
    status = client.get("/api/billing/status", headers=headers).json()
    assert status["plan"] == "pro"
    assert status["status"] == "active"
    assert status["currentPeriodEnd"] is not None


def test_replayed_event_is_applied_once(stripe_on):
    headers = _user()
    sub_id = _subscribe(stripe_on, headers)
    event = _subscription_event(sub_id)  # same event ID delivered twice
    first = client.post("/api/billing/webhook", **_signed(event))
    retrieves = stripe_on.retrieves
    second = client.post("/api/billing/webhook", **_signed(event))
    assert first.json()["status"] == "subscription_active"
    assert second.json()["status"] == "duplicate"
    assert stripe_on.retrieves == retrieves  # nothing re-applied


def test_status_comes_from_stripe_not_event_body(stripe_on):
    """Events can arrive out of order; the handler re-reads the subscription."""
    headers = _user()
    sub_id = _subscribe(stripe_on, headers)
    stripe_on.subscriptions[sub_id]["status"] = "canceled"
    stale = _subscription_event(sub_id)
    stale["data"]["object"]["status"] = "active"  # stale body claims active
    client.post("/api/billing/webhook", **_signed(stale))
    assert client.get("/api/billing/status", headers=headers).json()["plan"] == "free"


def test_unknown_customer_is_never_granted_pro(stripe_on):
    stripe_on.subscriptions["sub_stranger"] = {
        "id": "sub_stranger", "customer": "cus_not_ours", "status": "active",
    }
    response = client.post("/api/billing/webhook", **_signed(_subscription_event("sub_stranger")))
    assert response.json()["status"] == "unknown_customer"


def test_checkout_completed_event_activates_subscription(stripe_on):
    headers = _user()
    client.post("/api/billing/checkout", headers=headers)
    customer_id = stripe_on.checkouts[-1]["customer"]
    sub_id = f"sub_{uuid4().hex[:10]}"
    stripe_on.subscriptions[sub_id] = {"id": sub_id, "customer": customer_id, "status": "active"}
    event = {
        "id": f"evt_{uuid4().hex}", "object": "event", "type": "checkout.session.completed",
        "data": {"object": {"id": "cs_test", "mode": "subscription",
                            "subscription": sub_id, "customer": customer_id}},
    }
    client.post("/api/billing/webhook", **_signed(event))
    assert client.get("/api/billing/status", headers=headers).json()["plan"] == "pro"


# --- Paywall on AI insights -------------------------------------------------


def test_free_user_gets_402_and_pro_user_gets_insights(stripe_on):
    headers = _user()
    assert _ask(headers).status_code == 402
    _subscribe(stripe_on, headers)
    response = _ask(headers)
    assert response.status_code == 200
    assert response.json()["answer"]


def test_failed_renewal_and_cancellation_revoke_pro(stripe_on):
    headers = _user()
    sub_id = _subscribe(stripe_on, headers)
    for status in ("past_due", "canceled"):
        stripe_on.subscriptions[sub_id]["status"] = status
        client.post("/api/billing/webhook", **_signed(_subscription_event(sub_id)))
        assert _ask(headers).status_code == 402


def test_service_api_key_cannot_bypass_paywall(stripe_on, monkeypatch):
    monkeypatch.setenv("FINVISION_API_KEY", "shared-service-key")
    response = _ask({"Authorization": "Bearer shared-service-key"})
    assert response.status_code == 401


def test_insights_unchanged_when_billing_is_off(monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert _ask(_user()).status_code == 200


# --- Hardening ----------------------------------------------------------------


def test_past_due_user_cannot_start_a_second_subscription(stripe_on):
    """A second Checkout while the first subscription is past_due would double
    bill once the first recovers; send them to the portal instead."""
    headers = _user()
    sub_id = _subscribe(stripe_on, headers)
    stripe_on.subscriptions[sub_id]["status"] = "past_due"
    client.post("/api/billing/webhook", **_signed(_subscription_event(sub_id)))
    checkouts = len(stripe_on.checkouts)
    assert client.post("/api/billing/checkout", headers=headers).status_code == 409
    assert len(stripe_on.checkouts) == checkouts


def test_canceled_user_can_subscribe_again(stripe_on):
    headers = _user()
    sub_id = _subscribe(stripe_on, headers)
    stripe_on.subscriptions[sub_id]["status"] = "canceled"
    client.post("/api/billing/webhook", **_signed(_subscription_event(sub_id)))
    assert client.post("/api/billing/checkout", headers=headers).status_code == 200


def test_stripe_outage_returns_502_not_500(stripe_on, monkeypatch):
    import stripe

    def down(**_):
        raise stripe.error.APIConnectionError("Stripe unreachable")

    monkeypatch.setattr(stripe_on.checkout.Session, "create", staticmethod(down))
    response = client.post("/api/billing/checkout", headers=_user())
    assert response.status_code == 502
    assert response.json()["detail"] == "Payment provider error"


def test_checkout_is_rate_limited(stripe_on, monkeypatch):
    monkeypatch.setenv("FINVISION_RATE_LIMIT", "3")
    headers = _user()  # registration counts toward the same per-IP window
    codes = [client.post("/api/billing/checkout", headers=headers).status_code for _ in range(4)]
    assert 429 in codes


def test_customer_idempotency_key_differs_across_databases(stripe_on):
    """Same user ID, different account (e.g. preview vs production DB)."""
    headers = _user()
    client.post("/api/billing/checkout", headers=headers)
    key = stripe_on.customers[-1]["idempotency_key"]
    assert key.startswith("finvision-customer-")
    assert len(key.split("-")[-1]) == 16  # email-derived suffix


def test_agentcore_assistant_is_behind_the_same_paywall(stripe_on, monkeypatch):
    monkeypatch.setenv("FINVISION_ENABLE_AGENTCORE", "true")
    response = client.post("/api/agentcore/portfolio/ask", headers=_user(),
                           json={"question": "How diversified am I?"})
    assert response.status_code == 402


# --- Public demo portfolio with billing on -----------------------------------


def _ask_demo(headers: dict):
    from tests.test_demo_portfolio import _demo_payload

    return client.post("/api/insights", headers=headers, json=_demo_payload())


def test_demo_portfolio_stays_free_for_anonymous_visitors(stripe_on):
    assert _ask_demo({}).status_code == 200


def test_demo_portfolio_stays_free_for_signed_in_free_users(stripe_on):
    assert _ask_demo(_user()).status_code == 200


def test_invalid_credential_is_rejected_on_demo_portfolio_with_billing_on(stripe_on):
    assert _ask_demo({"Authorization": "Bearer wrong"}).status_code == 401


def test_anonymous_visitor_cannot_ask_about_another_portfolio(stripe_on):
    assert _ask({}).status_code == 401
