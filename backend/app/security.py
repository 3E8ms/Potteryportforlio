"""Admin login: a single owner account from environment variables, kept in a signed cookie."""
import hmac
import time
from collections import defaultdict, deque

import jwt
from fastapi import Cookie, HTTPException, Request, status

from .config import get_settings

COOKIE_NAME = "xl_admin"
SESSION_SECONDS = 7 * 24 * 3600

# Simple in-memory login throttle: at most 10 attempts per IP per 15 minutes.
_ATTEMPTS: dict[str, deque] = defaultdict(deque)
_WINDOW = 15 * 60
_MAX_ATTEMPTS = 10


def check_login_rate(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    q = _ATTEMPTS[ip]
    while q and now - q[0] > _WINDOW:
        q.popleft()
    if len(q) >= _MAX_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "too_many_attempts")
    q.append(now)


def verify_credentials(username: str, password: str) -> bool:
    s = get_settings()
    if not s.admin_password:
        return False
    user_ok = hmac.compare_digest(username.encode(), s.admin_username.encode())
    pass_ok = hmac.compare_digest(password.encode(), s.admin_password.encode())
    return user_ok and pass_ok


def create_token(username: str) -> str:
    now = int(time.time())
    payload = {"sub": username, "iat": now, "exp": now + SESSION_SECONDS, "role": "admin"}
    return jwt.encode(payload, get_settings().secret_key, algorithm="HS256")


def require_admin(xl_admin: str | None = Cookie(default=None)) -> str:
    if not xl_admin:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not_logged_in")
    try:
        payload = jwt.decode(xl_admin, get_settings().secret_key, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not_logged_in")
    if payload.get("role") != "admin" or payload.get("sub") != get_settings().admin_username:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "not_logged_in")
    return payload["sub"]
