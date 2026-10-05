"""Checkout, payment result, and the Stripe webhook."""
import logging

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Order
from ..schemas import CheckoutIn, CheckoutOut, OrderPublic
from ..services import payments
from ..services.orders import CheckoutError, create_order, mark_paid

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["checkout"])


@router.post("/checkout", response_model=CheckoutOut, status_code=status.HTTP_201_CREATED)
def checkout(data: CheckoutIn, db: Session = Depends(get_db)):
    try:
        order = create_order(db, data)
    except CheckoutError as err:
        db.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            {"code": err.code, "product_id": err.product_id, "available": err.available},
        )
    try:
        session_id, url = payments.create_checkout_session(order)
    except stripe.StripeError:
        db.rollback()
        log.exception("Stripe checkout session failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, {"code": "payment_unavailable"})
    order.stripe_session_id = session_id
    db.commit()
    return CheckoutOut(
        order_no=order.order_no, checkout_url=url, payments_enabled=get_settings().payments_enabled
    )


@router.get("/orders/{order_no}", response_model=OrderPublic)
def order_result(order_no: str, session_id: str = Query(min_length=5), db: Session = Depends(get_db)):
    """Payment result page. The session id acts as proof the visitor placed this order."""
    order = db.scalar(select(Order).where(Order.order_no == order_no))
    if order is None or order.stripe_session_id != session_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, {"code": "order_not_found"})

    # If the customer returns before the webhook arrives, confirm with Stripe directly.
    if order.status == "pending" and get_settings().payments_enabled:
        try:
            session = payments.retrieve_session(session_id)
            if session.payment_status == "paid":
                mark_paid(db, order, session.payment_intent)
                db.commit()
        except stripe.StripeError:
            log.warning("Could not confirm session %s with Stripe", session_id)
    return order


@router.post("/stripe/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    payload = await request.body()
    try:
        event = payments.construct_event(payload, stripe_signature)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "invalid_signature")

    kind = event["type"]
    session = event["data"]["object"]
    order_no = (session.get("metadata") or {}).get("order_no") or session.get("client_reference_id")
    order = db.scalar(select(Order).where(Order.order_no == order_no)) if order_no else None
    if order is None:
        log.warning("Webhook %s for unknown order %s", kind, order_no)
        return {"received": True}

    if kind in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        if session.get("payment_status") == "paid":
            mark_paid(db, order, session.get("payment_intent"))
    elif kind in ("checkout.session.expired", "checkout.session.async_payment_failed"):
        if order.status == "pending":
            order.status = "cancelled"
    db.commit()
    return {"received": True}
