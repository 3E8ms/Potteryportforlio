"""Test setup.

Uses TEST_DATABASE_URL (a throwaway Postgres database) when set, otherwise a
temporary SQLite file so the tests also run without Postgres.
"""
import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="xl-test-")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_tmp}/test.db"
os.environ["ADMIN_USERNAME"] = "owner"
os.environ["ADMIN_PASSWORD"] = "correct horse"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"
os.environ["UPLOAD_DIR"] = f"{_tmp}/uploads"
os.environ["STRIPE_SECRET_KEY"] = ""
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_test"
os.environ["FRONTEND_URL"] = "http://shop.test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import security  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Product, ShopSettings  # noqa: E402


def i18n(text: str) -> dict:
    return {"en": text, "hans": text, "hant": text}


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    security._ATTEMPTS.clear()
    with SessionLocal() as db:
        db.add(ShopSettings(id=1, name=i18n("Shop"), tagline=i18n(""), market_place=i18n(""), form_link=""))
        # Inserted in order on a fresh schema, so they get ids 1, 2, 3.
        for product in [
            Product(name=i18n("Postcard"), description=i18n(""), type=i18n("Postcards"),
                    theme=i18n("City"), year=2026, price_cents=400, stock=5, tone=0),
            Product(name=i18n("Print"), description=i18n(""), type=i18n("Prints"),
                    theme=i18n("Seasons"), year=2025, price_cents=3500, stock=1, tone=1),
            Product(name=i18n("Hidden"), description=i18n(""), type=i18n("Goods"),
                    theme=i18n("Food"), year=2024, price_cents=100, stock=9, tone=2, is_active=False),
        ]:
            db.add(product)
            db.flush()
        db.commit()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin(client):
    r = client.post("/api/admin/login", json={"username": "owner", "password": "correct horse"})
    assert r.status_code == 200
    return client


CUSTOMER = {
    "name": "Lily Chen",
    "email": "lily@example.com",
    "phone": "(613) 555-0123",
    "address": "123 Bank Street, Unit 4",
    "city": "Ottawa",
    "province": "ON",
    "postal_code": "k1p1j1",
    "note": "",
}


@pytest.fixture
def customer():
    return dict(CUSTOMER)
