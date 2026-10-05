"""Application settings, read from environment variables (or a .env file)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://xiaoli:xiaoli@localhost:5432/xiaoli"

    # Signs the admin session cookie. Must be a long random string in production.
    secret_key: str = "dev-only-change-me"
    admin_username: str = "admin"
    # Empty password disables admin login entirely.
    admin_password: str = ""
    # Set true when the site is served over HTTPS.
    cookie_secure: bool = False

    # Public address of the shop, used for Stripe return URLs.
    frontend_url: str = "http://localhost:5173"

    # Leave empty to run in test mode: checkout creates orders but takes no payment.
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    currency: str = "cad"

    upload_dir: str = "uploads"
    max_upload_mb: int = 15

    seed_sample_data: bool = True

    @property
    def payments_enabled(self) -> bool:
        return bool(self.stripe_secret_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
