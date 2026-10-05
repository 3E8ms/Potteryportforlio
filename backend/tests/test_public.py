def test_products_hide_inactive(client):
    r = client.get("/api/products")
    assert r.status_code == 200
    ids = [p["id"] for p in r.json()]
    assert ids == [1, 2]  # newest year first, inactive product hidden


def test_settings(client):
    r = client.get("/api/settings")
    assert r.status_code == 200
    body = r.json()
    assert body["name"]["en"] == "Shop"
    assert body["payments_enabled"] is False
