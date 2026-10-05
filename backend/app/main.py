"""FastAPI application entry point."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import get_settings
from .routers import admin, checkout, public
from .services.images import upload_root

logging.basicConfig(level=logging.INFO)
settings = get_settings()

app = FastAPI(title="Little Grain Market API", version="1.0.0")

# Only needed when the frontend dev server runs on a different port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url.rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(checkout.router)
app.include_router(admin.router)
app.mount("/uploads", StaticFiles(directory=upload_root()), name="uploads")

if not settings.admin_password:
    logging.warning("ADMIN_PASSWORD is empty: the back office login is disabled.")
if not settings.payments_enabled:
    logging.warning("STRIPE_SECRET_KEY is empty: running in test mode, no real payments.")
