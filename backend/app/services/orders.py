"""Order rules: numbering, stock checks and status changes.

Stock is subtracted when an order becomes paid (not when it is created), so
abandoned checkouts never hold stock. Cancelling a paid order puts stock back.
"""
import secrets
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Order, OrderItem, Product
from ..schemas import CheckoutIn

ORDER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L


class CheckoutError(Exception):
    """A problem the customer can fix (sold out, not enough stock...)."""

    def __init__(self, code: str, product_id: int | None = None, available: int | None = None):
        super().__init__(code)
        self.code = code
        self.product_id = product_id
        self.available = available


def new_order_no(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    suffix = "".join(secrets.choice(ORDER_ALPHABET) for _ in range(4))
    return f"XL{now:%y%m%d}-{suffix}"


def _unique_order_no(db: Session) -> str:
    for _ in range(20):
        no = new_order_no()
        if not db.scalar(select(Order.id).where(Order.order_no == no)):
            return no
    raise RuntimeError("Could not generate a unique order number")


def create_order(db: Session, data: CheckoutIn) -> Order:
    """Validate the cart against current stock and create a pending order."""
    wanted: dict[int, int] = {}
    for item in data.items:
        wanted[item.product_id] = wanted.get(item.product_id, 0) + item.quantity

    products = {
        p.id: p
        for p in db.scalars(select(Product).where(Product.id.in_(wanted), Product.is_active.is_(True)))
    }
    for pid, qty in wanted.items():
        product = products.get(pid)
        if product is None:
            raise CheckoutError("product_unavailable", pid, 0)
        if product.stock < qty:
            raise CheckoutError("not_enough_stock", pid, product.stock)

    c = data.customer
    order = Order(
        order_no=_unique_order_no(db),
        status="pending",
        lang=data.lang,
        customer_name=c.name,
        email=str(c.email),
        phone=c.phone,
        address=c.address,
        city=c.city,
        province=c.province,
        postal_code=c.postal_code,
        note=c.note,
        total_cents=sum(products[pid].price_cents * qty for pid, qty in wanted.items()),
        items=[
            OrderItem(
                product_id=pid,
                name=dict(products[pid].name),
                unit_price_cents=products[pid].price_cents,
                quantity=qty,
            )
            for pid, qty in wanted.items()
        ],
    )
    db.add(order)
    db.flush()
    return order


def _locked_products(db: Session, order: Order) -> dict[int, Product]:
    ids = [i.product_id for i in order.items if i.product_id is not None]
    if not ids:
        return {}
    rows = db.scalars(select(Product).where(Product.id.in_(ids)).with_for_update())
    return {p.id: p for p in rows}


def apply_stock(db: Session, order: Order) -> None:
    if order.stock_applied:
        return
    products = _locked_products(db, order)
    short = False
    for item in order.items:
        product = products.get(item.product_id) if item.product_id else None
        if product is None:
            continue
        if product.stock < item.quantity:
            short = True
        product.stock = max(0, product.stock - item.quantity)
    order.stock_applied = True
    order.stock_short = short


def restore_stock(db: Session, order: Order) -> None:
    if not order.stock_applied:
        return
    products = _locked_products(db, order)
    for item in order.items:
        product = products.get(item.product_id) if item.product_id else None
        if product is not None:
            product.stock += item.quantity
    order.stock_applied = False
    order.stock_short = False


def mark_paid(db: Session, order: Order, payment_intent: str | None = None) -> bool:
    """Mark an order paid. Safe to call more than once. Returns True if it changed."""
    if order.status in ("paid", "shipped"):
        return False
    apply_stock(db, order)
    order.status = "paid"
    order.paid_at = datetime.now(timezone.utc)
    if payment_intent:
        order.stripe_payment_intent = payment_intent
    return True


def change_status(db: Session, order: Order, status: str) -> None:
    """Admin status change, keeping stock in step with the order."""
    if status == order.status:
        return
    if status in ("paid", "shipped"):
        apply_stock(db, order)
        if order.paid_at is None:
            order.paid_at = datetime.now(timezone.utc)
    if status == "shipped" and order.shipped_at is None:
        order.shipped_at = datetime.now(timezone.utc)
    if status in ("pending", "cancelled"):
        restore_stock(db, order)
    order.status = status
