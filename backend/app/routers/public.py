"""Public shop data: products and shop settings."""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Product
from ..schemas import ProductOut, SettingsOut
from ..serializers import get_shop_settings, product_out, settings_out

router = APIRouter(prefix="/api", tags=["public"])


@router.get("/health")
def health() -> dict:
    return {"ok": True}


@router.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Product).where(Product.is_active.is_(True)).order_by(Product.year.desc(), Product.id)
    )
    return [product_out(p) for p in rows]


@router.get("/settings", response_model=SettingsOut)
def shop_settings(db: Session = Depends(get_db)):
    return settings_out(get_shop_settings(db))
