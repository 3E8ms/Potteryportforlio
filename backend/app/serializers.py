"""Convert database rows to API responses."""
from sqlalchemy.orm import Session

from .config import get_settings
from .models import Product, ShopSettings
from .schemas import ProductOut, SettingsOut
from .services.images import image_url


def product_out(p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        name=p.name,
        description=p.description,
        type=p.type,
        theme=p.theme,
        year=p.year,
        season=p.season,
        price_cents=p.price_cents,
        stock=p.stock,
        tone=p.tone,
        image_url=image_url(p.image_path),
        is_sample=p.is_sample,
        is_active=p.is_active,
    )


def get_shop_settings(db: Session) -> ShopSettings:
    row = db.get(ShopSettings, 1)
    if row is None:
        row = ShopSettings(id=1, name={"en": "Shop", "hans": "小店", "hant": "小店"})
        db.add(row)
        db.commit()
    return row


def settings_out(row: ShopSettings) -> SettingsOut:
    return SettingsOut(
        name=row.name,
        tagline=row.tagline,
        market_at=row.market_at,
        market_place=row.market_place,
        form_link=row.form_link,
        payments_enabled=get_settings().payments_enabled,
    )
