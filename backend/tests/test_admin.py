import io

from PIL import Image

from app.db import SessionLocal
from app.models import Product


def test_admin_requires_login(client):
    assert client.get("/api/admin/orders").status_code == 401
    assert client.get("/api/admin/me").status_code == 401


def test_wrong_password_and_throttle(client):
    for _ in range(10):
        r = client.post("/api/admin/login", json={"username": "owner", "password": "nope"})
        assert r.status_code == 401
    r = client.post("/api/admin/login", json={"username": "owner", "password": "correct horse"})
    assert r.status_code == 429


def test_login_logout(admin):
    assert admin.get("/api/admin/me").json() == {"username": "owner"}
    admin.post("/api/admin/logout")
    assert admin.get("/api/admin/me").status_code == 401


def test_status_changes_move_stock(admin, customer):
    no = admin.post("/api/checkout", json={"items": [{"product_id": 1, "quantity": 2}],
                                           "customer": customer}).json()["order_no"]
    assert admin.patch(f"/api/admin/orders/{no}", json={"status": "paid"}).json()["stock_applied"] is True
    with SessionLocal() as db:
        assert db.get(Product, 1).stock == 3
    admin.patch(f"/api/admin/orders/{no}", json={"status": "shipped"})
    with SessionLocal() as db:
        assert db.get(Product, 1).stock == 3  # shipping doesn't subtract again
    r = admin.patch(f"/api/admin/orders/{no}", json={"status": "cancelled"})
    assert r.json()["status"] == "cancelled"
    with SessionLocal() as db:
        assert db.get(Product, 1).stock == 5


def test_order_search_and_counts(admin, customer):
    no = admin.post("/api/checkout", json={"items": [{"product_id": 1, "quantity": 1}],
                                           "customer": customer}).json()["order_no"]
    body = admin.get("/api/admin/orders", params={"q": no[-4:]}).json()
    assert [o["order_no"] for o in body["orders"]] == [no]
    assert body["counts"] == {"pending": 1}
    assert admin.get("/api/admin/orders", params={"q": "nobody"}).json()["orders"] == []


def test_product_crud_and_image(admin):
    new = {"name": {"en": "Mug", "hans": "马克杯", "hant": "馬克杯"}, "year": 2026, "season": "winter",
           "price_cents": 4200, "stock": 2, "type": {"en": "Pottery"}, "theme": {"en": "Home"}}
    r = admin.post("/api/admin/products", json=new)
    assert r.status_code == 201, r.text
    pid = r.json()["id"]

    buf = io.BytesIO()
    Image.new("RGB", (3000, 2000), "tan").save(buf, "JPEG")
    r = admin.post(f"/api/admin/products/{pid}/image", files={"file": ("mug.jpg", buf.getvalue(), "image/jpeg")})
    assert r.status_code == 200
    url = r.json()["image_url"]
    assert url.startswith("/uploads/products/") and url.endswith(".webp")
    img = Image.open(io.BytesIO(admin.get(url).content))
    assert max(img.size) == 1400

    bad = admin.post(f"/api/admin/products/{pid}/image", files={"file": ("x.txt", b"hello", "text/plain")})
    assert bad.status_code == 400

    new["stock"] = 7
    assert admin.put(f"/api/admin/products/{pid}", json=new).json()["stock"] == 7
    assert admin.delete(f"/api/admin/products/{pid}").status_code == 204
    assert admin.get(f"/api/admin/products").json()[-1]["id"] != pid


def test_product_needs_a_name(admin):
    r = admin.post("/api/admin/products", json={"name": {}, "year": 2026, "price_cents": 1, "stock": 1})
    assert r.status_code == 422


def test_settings_update(admin):
    body = {"name": {"en": "Little Grain", "hans": "小粒", "hant": "小粒"}, "tagline": {},
            "market_at": "2026-11-07T10:00:00-05:00", "market_place": {"en": "Lansdowne"},
            "form_link": "https://forms.gle/abc"}
    r = admin.put("/api/admin/settings", json=body)
    assert r.status_code == 200, r.text
    assert admin.get("/api/settings").json()["form_link"] == "https://forms.gle/abc"
    body["market_at"] = None
    assert admin.put("/api/admin/settings", json=body).json()["market_at"] is None
