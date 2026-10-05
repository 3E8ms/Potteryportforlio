"""Owner back office: login, orders, products, shop settings."""
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Order, Product
from ..schemas import (
    AdminMe,
    LoginIn,
    OrderAdmin,
    OrderList,
    OrderStatusIn,
    ProductIn,
    ProductOut,
    SettingsIn,
    SettingsOut,
)
from ..security import (
    COOKIE_NAME,
    SESSION_SECONDS,
    check_login_rate,
    create_token,
    require_admin,
    verify_credentials,
)
from ..serializers import get_shop_settings, product_out, settings_out
from ..services.images import ImageError, delete_image, save_product_image
from ..services.orders import change_status

router = APIRouter(prefix="/api/admin", tags=["admin"])
auth = [Depends(require_admin)]


# ---------- session ----------

@router.post("/login", response_model=AdminMe)
def login(data: LoginIn, request: Request, response: Response):
    check_login_rate(request)
    if not verify_credentials(data.username, data.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong_credentials")
    response.set_cookie(
        COOKIE_NAME,
        create_token(data.username),
        max_age=SESSION_SECONDS,
        httponly=True,
        samesite="strict",
        secure=get_settings().cookie_secure,
        path="/api",
    )
    return AdminMe(username=data.username)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/api")


@router.get("/me", response_model=AdminMe)
def me(username: str = Depends(require_admin)):
    return AdminMe(username=username)


# ---------- orders ----------

@router.get("/orders", response_model=OrderList, dependencies=auth)
def list_orders(
    q: str = Query("", max_length=100),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    stmt = select(Order).order_by(Order.created_at.desc(), Order.id.desc()).limit(limit)
    if q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Order.order_no.ilike(like), Order.customer_name.ilike(like), Order.email.ilike(like))
        )
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    counts = dict(db.execute(select(Order.status, func.count()).group_by(Order.status)).all())
    return OrderList(orders=list(db.scalars(stmt)), counts=counts)


@router.get("/orders/{order_no}", response_model=OrderAdmin, dependencies=auth)
def get_order(order_no: str, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).where(Order.order_no == order_no))
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "order_not_found")
    return order


@router.patch("/orders/{order_no}", response_model=OrderAdmin, dependencies=auth)
def update_order(order_no: str, data: OrderStatusIn, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).where(Order.order_no == order_no).with_for_update())
    if order is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "order_not_found")
    change_status(db, order, data.status)
    db.commit()
    db.refresh(order)
    return order


# ---------- products ----------

@router.get("/products", response_model=list[ProductOut], dependencies=auth)
def admin_products(db: Session = Depends(get_db)):
    rows = db.scalars(select(Product).order_by(Product.year.desc(), Product.id))
    return [product_out(p) for p in rows]


@router.post("/products", response_model=ProductOut, status_code=201, dependencies=auth)
def create_product(data: ProductIn, db: Session = Depends(get_db)):
    p = Product(**data.model_dump(), is_sample=False)
    db.add(p)
    db.commit()
    return product_out(p)


def _product(db: Session, product_id: int) -> Product:
    p = db.get(Product, product_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "product_not_found")
    return p


@router.put("/products/{product_id}", response_model=ProductOut, dependencies=auth)
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db)):
    p = _product(db, product_id)
    for key, value in data.model_dump().items():
        setattr(p, key, value)
    p.is_sample = False
    db.commit()
    return product_out(p)


@router.delete("/products/{product_id}", status_code=204, dependencies=auth)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    p = _product(db, product_id)
    delete_image(p.image_path)
    db.delete(p)  # past orders keep their own copy of the name and price
    db.commit()


@router.post("/products/{product_id}/image", response_model=ProductOut, dependencies=auth)
async def upload_image(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    p = _product(db, product_id)
    limit = get_settings().max_upload_mb * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "image_too_large")
    try:
        rel = save_product_image(p.id, data)
    except ImageError as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err))
    old = p.image_path
    p.image_path = rel
    db.commit()
    delete_image(old)
    return product_out(p)


@router.delete("/products/{product_id}/image", response_model=ProductOut, dependencies=auth)
def remove_image(product_id: int, db: Session = Depends(get_db)):
    p = _product(db, product_id)
    delete_image(p.image_path)
    p.image_path = None
    db.commit()
    return product_out(p)


# ---------- settings ----------

@router.put("/settings", response_model=SettingsOut, dependencies=auth)
def update_settings(data: SettingsIn, db: Session = Depends(get_db)):
    row = get_shop_settings(db)
    row.name = data.name.model_dump()
    row.tagline = data.tagline.model_dump()
    row.market_at = data.market_at
    row.market_place = data.market_place.model_dump()
    row.form_link = str(data.form_link)
    db.commit()
    return settings_out(row)
