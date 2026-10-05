"""Request and response shapes for the API."""
import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator

Lang = Literal["en", "hans", "hant"]
Season = Literal["spring", "summer", "autumn", "winter"]
Province = Literal["ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU"]
OrderStatus = Literal["pending", "paid", "shipped", "cancelled"]

# First letters D, F, I, O, Q, U are never used in Canadian postal codes; W, Z not as first.
POSTAL_RE = re.compile(r"^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$")


class I18nText(BaseModel):
    en: str = Field("", max_length=2000)
    hans: str = Field("", max_length=2000)
    hant: str = Field("", max_length=2000)

    @field_validator("en", "hans", "hant")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    def any(self) -> bool:
        return bool(self.en or self.hans or self.hant)


def pick(text: dict | None, lang: str) -> str:
    """Return text in the requested language, falling back to the others."""
    text = text or {}
    order = {"en": ["en", "hant", "hans"], "hans": ["hans", "hant", "en"], "hant": ["hant", "hans", "en"]}
    for key in order.get(lang, ["hant", "hans", "en"]):
        if text.get(key):
            return text[key]
    return ""


# ---------- products ----------

class ProductBase(BaseModel):
    name: I18nText
    description: I18nText = I18nText()
    type: I18nText = I18nText()
    theme: I18nText = I18nText()
    year: int = Field(ge=1990, le=2100)
    season: Season | None = None
    price_cents: int = Field(ge=0, le=10_000_000)
    stock: int = Field(ge=0, le=100_000)
    tone: int = Field(0, ge=0, le=3)


class ProductIn(ProductBase):
    is_active: bool = True

    @field_validator("name")
    @classmethod
    def _name_required(cls, v: I18nText) -> I18nText:
        if not v.any():
            raise ValueError("A name is required in at least one language.")
        return v


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    image_url: str | None = None
    is_sample: bool
    is_active: bool


# ---------- settings ----------

class SettingsIn(BaseModel):
    name: I18nText
    tagline: I18nText = I18nText()
    market_at: datetime | None = None
    market_place: I18nText = I18nText()
    form_link: HttpUrl | Literal[""] = ""


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: I18nText
    tagline: I18nText
    market_at: datetime | None
    market_place: I18nText
    form_link: str
    payments_enabled: bool = True


# ---------- checkout ----------

class CartItem(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=99)


class CustomerIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=120)]
    email: EmailStr
    phone: str
    address: Annotated[str, Field(min_length=5, max_length=200)]
    city: Annotated[str, Field(min_length=2, max_length=80)]
    province: Province
    postal_code: str
    note: Annotated[str, Field(max_length=1000)] = ""

    @field_validator("name", "address", "city", "note", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) == 11 and digits.startswith("1"):
            digits = digits[1:]
        if len(digits) != 10:
            raise ValueError("Enter a 10-digit phone number.")
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"

    @field_validator("postal_code")
    @classmethod
    def _postal(cls, v: str) -> str:
        code = re.sub(r"[\s-]", "", v).upper()
        if not POSTAL_RE.match(code):
            raise ValueError("Postal code should look like A1A 1A1.")
        return f"{code[:3]} {code[3:]}"


class CheckoutIn(BaseModel):
    items: Annotated[list[CartItem], Field(min_length=1, max_length=50)]
    customer: CustomerIn
    lang: Lang = "hant"


class CheckoutOut(BaseModel):
    order_no: str
    checkout_url: str
    payments_enabled: bool


# ---------- orders ----------

class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_id: int | None
    name: I18nText
    unit_price_cents: int
    quantity: int


class OrderPublic(BaseModel):
    """What a customer sees on the payment-result page."""

    model_config = ConfigDict(from_attributes=True)

    order_no: str
    status: OrderStatus
    total_cents: int
    email: str
    created_at: datetime
    items: list[OrderItemOut]


class OrderAdmin(OrderPublic):
    id: int
    lang: Lang
    customer_name: str
    phone: str
    address: str
    city: str
    province: str
    postal_code: str
    note: str
    stock_applied: bool
    stock_short: bool
    stripe_session_id: str | None
    paid_at: datetime | None
    shipped_at: datetime | None


class OrderStatusIn(BaseModel):
    status: OrderStatus


class OrderList(BaseModel):
    orders: list[OrderAdmin]
    counts: dict[str, int]


# ---------- admin auth ----------

class LoginIn(BaseModel):
    username: str
    password: str


class AdminMe(BaseModel):
    username: str
