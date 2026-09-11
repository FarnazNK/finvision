"""Password hashing and short-lived JWT authentication."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt


JWT_ALGORITHM = "HS256"


def _secret() -> str:
    secret = os.getenv("FINVISION_JWT_SECRET", "")
    if not secret and os.getenv("ENVIRONMENT", "development") == "production":
        raise RuntimeError("FINVISION_JWT_SECRET is required in production")
    return secret or "local-development-only-change-me"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, salt_hex, digest_hex = encoded.split("$")
        if algorithm != "scrypt":
            return False
        expected = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1
        )
        return hmac.compare_digest(expected.hex(), digest_hex)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + timedelta(hours=2)},
        _secret(),
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, _secret(), algorithms=[JWT_ALGORITHM])
    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id.isdigit():
        raise jwt.InvalidTokenError("Invalid subject")
    return int(user_id)
