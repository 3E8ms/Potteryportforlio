"""Database tables.

Translatable text is stored as JSON objects shaped {"en": ..., "hans": ..., "hant": ...}.
Money is stored in cents (integers) to avoid rounding errors.
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base

I18nJSON = JSON().with_variant(JSONB(), "postgresql")

ORDER_STATUSES = ("pending", "paid", "shipped", "cancelled")
SEASONS = ("spring", "summer", "autumn", "winter")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price_cents >= 0", name="ck_products_price"),
        CheckConstraint("stock >= 0", name="ck_products_stock"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[dict] = mapped_column(I18nJSON, nullable=False)
    description: Mapped[dict] = mapped_column(I18nJSON, nullable=False, default=dict)
    type: Mapped[dict] = mapped_column(I18nJSON, nullable=False, default=dict)
    theme: Mapped[dict] = mapped_column(I18nJSON, nullable=False, default=dict)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    season: Mapped[str | None] = mapped_column(String(10))
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image_path: Mapped[str | None] = mapped_column(String(255))
    tone: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_sample: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending','paid','shipped','cancelled')", name="ck_orders_status"
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    order_no: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(12), nullable=False, default="pending", index=True)
    lang: Mapped[str] = mapped_column(String(5), nullable=False, default="hant")

    customer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    address: Mapped[str] = mapped_column(String(200), nullable=False)
    city: Mapped[str] = mapped_column(String(80), nullable=False)
    province: Mapped[str] = mapped_column(String(2), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(7), nullable=False)
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")

    total_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    # True once this order's quantities have been subtracted from product stock.
    stock_applied: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    # True if payment arrived but there was not enough stock left to cover it.
    stock_short: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    stripe_session_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    stripe_payment_intent: Mapped[str | None] = mapped_column(String(255))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    shipped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_order_items_qty"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), index=True, nullable=False
    )
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"))
    # Snapshot of the product name at the time of purchase, in all languages.
    name: Mapped[dict] = mapped_column(I18nJSON, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    order: Mapped[Order] = relationship(back_populates="items")


class ShopSettings(Base):
    """A single row (id = 1) holding shop-wide settings."""

    __tablename__ = "shop_settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    name: Mapped[dict] = mapped_column(I18nJSON, nullable=False, default=dict)
    tagline: Mapped[dict] = mapped_column(I18nJSON, nullable=False, default=dict)
    market_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    market_place: Mapped[dict] = mapped_column(I18nJSON, nullable=False, default=dict)
    form_link: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
