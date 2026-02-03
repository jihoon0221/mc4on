from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status

from app.core.config import settings

try:
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests
except Exception:  # pragma: no cover - optional dependency
    google_id_token = None
    google_requests = None


@dataclass(frozen=True)
class GoogleTokenPayload:
    sub: str
    email: str | None


def _require_google_auth() -> None:
    if google_id_token is None or google_requests is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="google-auth dependency is missing. Install google-auth.",
        )


def verify_google_id_token(token: str) -> GoogleTokenPayload:
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID is not set.",
        )

    _require_google_auth()

    try:
        payload: dict[str, Any] = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token.",
        ) from None

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google ID token missing sub.",
        )

    email = payload.get("email")
    if settings.allowlist and (not email or email.lower() not in settings.allowlist):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not in allowlist.",
        )

    return GoogleTokenPayload(sub=sub, email=email)
