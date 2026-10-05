"""Stripe Checkout integration.

Without STRIPE_SECRET_KEY the shop runs in test mode: checkout still creates the
order, but sends the customer straight to the result page without charging them.
"""
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import stripe

from ..config import get_settings
from ..models import Order
from ..schemas import pick

STRIPE_LOCALE = {"en": "en", "hans": "zh", "hant": "zh-TW"}
TEST_SESSION_PREFIX = "test_"


def success_url(order_no: str, session_id: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    return f"{base}/success?order={quote(order_no)}&session_id={session_id}"


def create_checkout_session(order: Order) -> tuple[str, str]:
    """Return (session_id, url) for the customer to pay this order."""
    settings = get_settings()
    if not settings.payments_enabled:
        session_id = f"{TEST_SESSION_PREFIX}{order.order_no}"
        return session_id, success_url(order.order_no, session_id)

    base = settings.frontend_url.rstrip("/")
    session = stripe.checkout.Session.create(
        api_key=settings.stripe_secret_key,
        mode="payment",
        locale=STRIPE_LOCALE.get(order.lang, "auto"),
        customer_email=order.email,
        client_reference_id=order.order_no,
        metadata={"order_no": order.order_no},
        payment_intent_data={"metadata": {"order_no": order.order_no}},
        line_items=[
            {
                "quantity": item.quantity,
                "price_data": {
                    "currency": settings.currency,
                    "unit_amount": item.unit_price_cents,
                    "product_data": {"name": pick(item.name, order.lang) or "Item"},
                },
            }
            for item in order.items
        ],
        success_url=f"{base}/success?order={quote(order.order_no)}&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{base}/cart?cancelled={quote(order.order_no)}",
        expires_at=int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
    )
    return session.id, session.url


def retrieve_session(session_id: str):
    settings = get_settings()
    return stripe.checkout.Session.retrieve(session_id, api_key=settings.stripe_secret_key)


def construct_event(payload: bytes, signature: str):
    settings = get_settings()
    return stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)
