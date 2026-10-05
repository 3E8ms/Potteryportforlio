from app.db import SessionLocal
from app.models import Order, Product
from app.services import payments


def checkout(client, customer, items, lang="hant"):
    return client.post("/api/checkout", json={"items": items, "customer": customer, "lang": lang})


def test_checkout_creates_pending_order_and_normalizes_fields(client, customer):
    r = checkout(client, customer, [{"product_id": 1, "quantity": 2}, {"product_id": 2, "quantity": 1}])
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["order_no"].startswith("XL")
    assert body["payments_enabled"] is False
    assert body["checkout_url"].startswith("http://shop.test/success?order=")
    with SessionLocal() as db:
        order = db.query(Order).one()
        assert order.status == "pending"
        assert order.total_cents == 2 * 400 + 3500
        assert order.phone == "613-555-0123"
        assert order.postal_code == "K1P 1J1"
        assert order.stock_applied is False
        # stock is untouched until payment
        assert db.get(Product, 1).stock == 5


def test_checkout_rejects_bad_customer_details(client, customer):
    customer.update(phone="12345", postal_code="D1A 1A1", email="nope")
    r = checkout(client, customer, [{"product_id": 1, "quantity": 1}])
    assert r.status_code == 422
    fields = {e["loc"][-1] for e in r.json()["detail"]}
    assert {"phone", "postal_code", "email"} <= fields


def test_checkout_rejects_too_many(client, customer):
    r = checkout(client, customer, [{"product_id": 2, "quantity": 2}])
    assert r.status_code == 409
    assert r.json()["detail"] == {"code": "not_enough_stock", "product_id": 2, "available": 1}


def test_checkout_merges_duplicate_lines_before_stock_check(client, customer):
    r = checkout(client, customer, [{"product_id": 2, "quantity": 1}, {"product_id": 2, "quantity": 1}])
    assert r.status_code == 409


def test_checkout_rejects_inactive_product(client, customer):
    r = checkout(client, customer, [{"product_id": 3, "quantity": 1}])
    assert r.status_code == 409
    assert r.json()["detail"]["code"] == "product_unavailable"


def test_order_result_requires_matching_session(client, customer):
    no = checkout(client, customer, [{"product_id": 1, "quantity": 1}]).json()["order_no"]
    assert client.get(f"/api/orders/{no}", params={"session_id": "wrong-id"}).status_code == 404
    r = client.get(f"/api/orders/{no}", params={"session_id": f"{payments.TEST_SESSION_PREFIX}{no}"})
    assert r.status_code == 200
    assert r.json()["status"] == "pending"
    assert "phone" not in r.json()  # the public view hides address details


def _webhook(client, monkeypatch, event):
    monkeypatch.setattr(payments, "construct_event", lambda payload, sig: event)
    return client.post("/api/stripe/webhook", content=b"{}", headers={"Stripe-Signature": "t=1,v1=x"})


def _event(kind, order_no, payment_status="paid"):
    return {"type": kind, "data": {"object": {
        "metadata": {"order_no": order_no}, "client_reference_id": order_no,
        "payment_status": payment_status, "payment_intent": "pi_123"}}}


def test_webhook_marks_paid_and_subtracts_stock_once(client, customer, monkeypatch):
    no = checkout(client, customer, [{"product_id": 1, "quantity": 2}]).json()["order_no"]
    for _ in range(2):  # Stripe may deliver the same event twice
        assert _webhook(client, monkeypatch, _event("checkout.session.completed", no)).status_code == 200
    with SessionLocal() as db:
        order = db.query(Order).one()
        assert order.status == "paid"
        assert order.stripe_payment_intent == "pi_123"
        assert order.paid_at is not None
        assert db.get(Product, 1).stock == 3


def test_webhook_unpaid_completion_leaves_order_pending(client, customer, monkeypatch):
    no = checkout(client, customer, [{"product_id": 1, "quantity": 1}]).json()["order_no"]
    _webhook(client, monkeypatch, _event("checkout.session.completed", no, "unpaid"))
    with SessionLocal() as db:
        assert db.query(Order).one().status == "pending"


def test_webhook_expired_cancels_pending(client, customer, monkeypatch):
    no = checkout(client, customer, [{"product_id": 1, "quantity": 1}]).json()["order_no"]
    _webhook(client, monkeypatch, _event("checkout.session.expired", no, "unpaid"))
    with SessionLocal() as db:
        assert db.query(Order).one().status == "cancelled"
        assert db.get(Product, 1).stock == 5


def test_paid_after_stock_ran_out_is_flagged(client, customer, monkeypatch):
    a = checkout(client, customer, [{"product_id": 2, "quantity": 1}]).json()["order_no"]
    b = checkout(client, customer, [{"product_id": 2, "quantity": 1}]).json()["order_no"]
    _webhook(client, monkeypatch, _event("checkout.session.completed", a))
    _webhook(client, monkeypatch, _event("checkout.session.completed", b))
    with SessionLocal() as db:
        second = db.query(Order).filter_by(order_no=b).one()
        assert second.status == "paid" and second.stock_short is True
        assert db.get(Product, 2).stock == 0


def test_webhook_rejects_bad_signature(client):
    r = client.post("/api/stripe/webhook", content=b"{}", headers={"Stripe-Signature": "bad"})
    assert r.status_code == 400
