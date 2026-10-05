from types import SimpleNamespace

from app.config import get_settings
from app.db import SessionLocal
from app.models import Order
from app.services import payments


def test_stripe_session_built_from_order(client, customer, monkeypatch):
    captured = {}

    def fake_create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(id="cs_test_123", url="https://checkout.stripe.com/c/pay/cs_test_123")

    monkeypatch.setattr(get_settings(), "stripe_secret_key", "sk_test_x")
    monkeypatch.setattr(payments.stripe.checkout.Session, "create", staticmethod(fake_create))

    r = client.post("/api/checkout", json={"items": [{"product_id": 1, "quantity": 3}],
                                           "customer": customer, "lang": "en"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["checkout_url"].startswith("https://checkout.stripe.com/")
    assert body["payments_enabled"] is True

    assert captured["client_reference_id"] == body["order_no"]
    assert captured["customer_email"] == "lily@example.com"
    assert captured["locale"] == "en"
    item = captured["line_items"][0]
    assert item["quantity"] == 3
    assert item["price_data"]["unit_amount"] == 400
    assert item["price_data"]["currency"] == "cad"
    assert item["price_data"]["product_data"]["name"] == "Postcard"
    assert "{CHECKOUT_SESSION_ID}" in captured["success_url"]
    with SessionLocal() as db:
        assert db.query(Order).one().stripe_session_id == "cs_test_123"


def test_result_page_confirms_with_stripe_if_webhook_is_late(client, customer, monkeypatch):
    monkeypatch.setattr(get_settings(), "stripe_secret_key", "sk_test_x")
    monkeypatch.setattr(payments.stripe.checkout.Session, "create",
                        staticmethod(lambda **k: SimpleNamespace(id="cs_test_9", url="https://x")))
    monkeypatch.setattr(payments, "retrieve_session",
                        lambda sid: SimpleNamespace(payment_status="paid", payment_intent="pi_9"))
    no = client.post("/api/checkout", json={"items": [{"product_id": 1, "quantity": 1}],
                                            "customer": customer}).json()["order_no"]
    r = client.get(f"/api/orders/{no}", params={"session_id": "cs_test_9"})
    assert r.json()["status"] == "paid"
