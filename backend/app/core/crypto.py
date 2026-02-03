from __future__ import annotations

from fastapi import HTTPException, status

from app.core.config import settings

try:
    from cryptography.fernet import Fernet
except Exception:  # pragma: no cover - optional dependency
    Fernet = None


def _get_fernet() -> "Fernet":
    if not settings.encryption_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ENCRYPTION_KEY is not set.",
        )
    if Fernet is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="cryptography dependency is missing. Install cryptography.",
        )
    return Fernet(settings.encryption_key.encode())


def encrypt_text(plaintext: str) -> bytes:
    if plaintext is None:
        return b""
    return _get_fernet().encrypt(plaintext.encode("utf-8"))


def decrypt_text(ciphertext: bytes) -> str:
    return _get_fernet().decrypt(ciphertext).decode("utf-8")


def encrypt_bytes(data: bytes) -> bytes:
    return _get_fernet().encrypt(data)


def decrypt_bytes(data: bytes) -> bytes:
    return _get_fernet().decrypt(data)
