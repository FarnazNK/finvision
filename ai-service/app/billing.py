"""FinVision Pro: Stripe subscription billing.

Flow
1. A signed-in user calls POST /api/billing/checkout. The server creates (or
   reuses) their Stripe customer and a Checkout Session for the configured
   price, then returns Stripe's hosted URL. The browser never sends a price,
   an amount or a redirect URL, so none of them can be tampered with. Card
   details go only to Stripe.
2. Stripe calls POST /api/billing/webhook. Every event's signature is checked
   over the raw body, each event ID is applied at most once, and the
   subscription is re-read from Stripe so out-of-order deliveries can't leave
   a stale status.
3. AI insights check the stored subscription status on the server
   (`require_insights_access`); a free user gets 402.
4. POST /api/billing/portal opens Stripe's customer portal to update the card
   or cancel.

Billing is off unless STRIPE_SECRET_KEY and STRIPE_PRICE_ID are set; with it
off, the API behaves exactly as before. Test mode keys cost nothing.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from typing import Any, Callable

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool

from .persistence import BillingAccount, SessionLocal, StripeEventRecord, UserRecord

PRO_STATUSES = frozenset({"active", "trialing"})
# Any subscription that isn't finished. A user in one of these states must fix
# it in the portal; a second Checkout would create a second, double-billed
# subscription once the first one recovers.
OPEN_STATUSES = PRO_STATUSES | {"past_due", "unpaid", "incomplete", "paused"}
IDEMPOTENCY_KEY_PATTERN = r"^[A-Za-z0-9_-]{8,64}$"
SUBSCRIPTION_EVENTS = frozenset(
    {
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
    }
)


class BillingStatus(BaseModel):
    billingEnabled: bool
    plan: str  # "pro" or "free"
    status: str
    currentPeriodEnd: datetime | None = None


class BillingRedirect(BaseModel):
    url: str


def billing_enabled() -> bool:
    return bool(os.getenv("STRIPE_SECRET_KEY") and os.getenv("STRIPE_PRICE_ID"))


def _stripe() -> Any:
    if not billing_enabled():
        raise HTTPException(status_code=503, detail="Billing is not enabled")
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
    return stripe


def _app_url() -> str:
    # Redirect targets come from server config, never from the request, so
    # Checkout can't be turned into an open redirect.
    return os.getenv("FINVISION_APP_URL", "http://localhost:3000/app").rstrip("/")


def _plain(obj: Any) -> dict[str, Any]:
    """Stripe SDK objects aren't dicts; convert so the rest of the code is SDK-agnostic."""
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict_recursive"):  # older stripe-python
        return obj.to_dict_recursive()
    return obj.to_dict()  # recursive by default in current stripe-python


def _has_open_subscription(user_id: int) -> bool:
    with SessionLocal() as session:
        account = session.get(BillingAccount, user_id)
        return account is not None and account.status in OPEN_STATUSES


def is_pro(user_id: int) -> bool:
    with SessionLocal() as session:
        account = session.get(BillingAccount, user_id)
        return account is not None and account.status in PRO_STATUSES


def _status_for(user_id: int) -> BillingStatus:
    with SessionLocal() as session:
        account = session.get(BillingAccount, user_id)
    status = account.status if account else "none"
    return BillingStatus(
        billingEnabled=billing_enabled(),
        plan="pro" if status in PRO_STATUSES else "free",
        status=status,
        currentPeriodEnd=account.current_period_end if account else None,
    )


def _get_or_create_customer(user: UserRecord) -> str:
    with SessionLocal() as session:
        account = session.get(BillingAccount, user.id)
        if account is not None:
            return account.stripe_customer_id
    customer = _stripe().Customer.create(
        email=user.email,
        metadata={"user_id": str(user.id)},
        # One customer per user even if two first-time checkouts race. The
        # email hash keeps keys distinct when two databases (e.g. preview and
        # production) share a Stripe account and reuse the same user IDs.
        idempotency_key=(
            f"finvision-customer-{user.id}-"
            f"{hashlib.sha256(user.email.encode()).hexdigest()[:16]}"
        ),
    )
    with SessionLocal() as session:
        session.add(BillingAccount(user_id=user.id, stripe_customer_id=customer["id"]))
        try:
            session.commit()
        except IntegrityError:
            session.rollback()  # the racing request stored the same customer
    return customer["id"]


# --- Webhook handling -------------------------------------------------------


def verify_event(payload: bytes, signature: str | None, secret: str) -> dict[str, Any]:
    if not signature:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")
    try:
        stripe.Webhook.construct_event(payload, signature, secret)
    except (ValueError, stripe.error.SignatureVerificationError) as exc:
        raise HTTPException(status_code=400, detail="Invalid webhook signature") from exc
    return json.loads(payload)


def _period_end(subscription: dict[str, Any]) -> datetime | None:
    # Newer Stripe API versions moved current_period_end onto subscription items.
    ts = subscription.get("current_period_end")
    if ts is None:
        items = (subscription.get("items") or {}).get("data") or []
        ts = items[0].get("current_period_end") if items else None
    return datetime.fromtimestamp(ts, tz=timezone.utc) if ts else None


def _apply_subscription(session: Any, subscription_id: str) -> str:
    # Re-read from Stripe: events can arrive out of order, so the event body
    # may already be stale. The live object is the source of truth.
    subscription = _plain(_stripe().Subscription.retrieve(subscription_id))
    account = session.scalar(
        select(BillingAccount).where(
            BillingAccount.stripe_customer_id == subscription["customer"]
        )
    )
    if account is None:
        # Not a customer this app created; never grant access from metadata alone.
        return "unknown_customer"

    status = subscription["status"]
    if (
        account.stripe_subscription_id not in (None, subscription["id"])
        and account.status in PRO_STATUSES
        and status not in PRO_STATUSES
    ):
        # An old/other subscription ending must not cancel the one that's active.
        return "ignored_inactive_other_subscription"

    account.stripe_subscription_id = subscription["id"]
    account.status = status
    account.current_period_end = _period_end(subscription)
    return f"subscription_{status}"


def apply_event(event: dict[str, Any]) -> str:
    """Apply a verified event exactly once. Returns a short outcome label."""
    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        if obj.get("mode") != "subscription" or not obj.get("subscription"):
            return "ignored"
        subscription_id = obj["subscription"]
    elif event_type in SUBSCRIPTION_EVENTS:
        subscription_id = obj["id"]
    else:
        return "ignored"

    with SessionLocal() as session:
        if session.get(StripeEventRecord, event["id"]) is not None:
            return "duplicate"
        outcome = _apply_subscription(session, subscription_id)
        session.add(StripeEventRecord(id=event["id"], type=event_type))
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            if session.get(StripeEventRecord, event["id"]) is not None:
                # A concurrent delivery of the same event committed first.
                return "duplicate"
            raise  # a real conflict: let Stripe retry and surface it in logs
    return outcome


# --- Routes -----------------------------------------------------------------


def build_billing_router(
    current_user: Callable[..., UserRecord], rate_limit: Callable[..., None]
) -> APIRouter:
    router = APIRouter(prefix="/api/billing", tags=["billing"])

    @router.get("/status", response_model=BillingStatus)
    def billing_status(user: UserRecord = Depends(current_user)) -> BillingStatus:
        return _status_for(user.id)

    @router.post("/checkout", response_model=BillingRedirect)
    def create_checkout(
        user: UserRecord = Depends(current_user),
        _: None = Depends(rate_limit),
        idempotency_key: str | None = Header(
            default=None, alias="Idempotency-Key", pattern=IDEMPOTENCY_KEY_PATTERN
        ),
    ) -> BillingRedirect:
        api = _stripe()
        if _has_open_subscription(user.id):
            raise HTTPException(
                status_code=409,
                detail="You already have a subscription; manage it in the billing portal",
            )
        try:
            customer_id = _get_or_create_customer(user)
        except stripe.error.StripeError as exc:
            raise HTTPException(status_code=502, detail="Payment provider error") from exc
        params: dict[str, Any] = {
            "mode": "subscription",
            "customer": customer_id,
            "client_reference_id": str(user.id),
            "line_items": [{"price": os.environ["STRIPE_PRICE_ID"], "quantity": 1}],
            "success_url": f"{_app_url()}?billing=success",
            "cancel_url": f"{_app_url()}?billing=cancelled",
            "subscription_data": {"metadata": {"user_id": str(user.id)}},
        }
        if idempotency_key:
            # A double-clicked Upgrade button gets the same Checkout Session back.
            params["idempotency_key"] = f"finvision-checkout-{user.id}-{idempotency_key}"
        try:
            session = api.checkout.Session.create(**params)
        except stripe.error.StripeError as exc:
            raise HTTPException(status_code=502, detail="Payment provider error") from exc
        return BillingRedirect(url=session["url"])

    @router.post("/portal", response_model=BillingRedirect)
    def create_portal(
        user: UserRecord = Depends(current_user),
        _: None = Depends(rate_limit),
    ) -> BillingRedirect:
        api = _stripe()
        with SessionLocal() as db:
            account = db.get(BillingAccount, user.id)
        if account is None:
            raise HTTPException(status_code=404, detail="No billing account yet")
        try:
            portal = api.billing_portal.Session.create(
                customer=account.stripe_customer_id, return_url=_app_url()
            )
        except stripe.error.StripeError as exc:
            raise HTTPException(status_code=502, detail="Payment provider error") from exc
        return BillingRedirect(url=portal["url"])

    @router.post("/webhook", include_in_schema=False)
    async def stripe_webhook(request: Request) -> dict[str, str]:
        secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        if not secret:
            raise HTTPException(status_code=503, detail="Billing webhook is not configured")
        # The signature covers the exact bytes Stripe sent: read the raw body.
        payload = await request.body()
        event = verify_event(payload, request.headers.get("stripe-signature"), secret)
        # apply_event calls Stripe synchronously; keep it off the event loop.
        return {"status": await run_in_threadpool(apply_event, event)}

    return router
