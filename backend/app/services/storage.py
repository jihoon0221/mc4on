from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import date
from pathlib import Path
import uuid

from fastapi import UploadFile

from app.core.config import settings
from app.core.crypto import encrypt_bytes


@dataclass(frozen=True)
class StoredFile:
    path: str
    sha256: str


def store_encrypted_upload(upload_file: UploadFile) -> StoredFile:
    base_dir = Path(settings.data_dir) / "uploads" / date.today().isoformat()
    base_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}_{upload_file.filename or 'upload.bin'}"
    dest = base_dir / filename

    raw = upload_file.file.read()
    sha256 = hashlib.sha256(raw).hexdigest()
    encrypted = encrypt_bytes(raw)

    with dest.open("wb") as f:
        f.write(encrypted)

    return StoredFile(path=str(dest), sha256=sha256)


def store_encrypted_bytes(raw: bytes, filename: str) -> StoredFile:
    base_dir = Path(settings.data_dir) / "uploads" / date.today().isoformat()
    base_dir.mkdir(parents=True, exist_ok=True)
    safe_name = filename or "upload.bin"
    dest = base_dir / f"{uuid.uuid4()}_{safe_name}"

    sha256 = hashlib.sha256(raw).hexdigest()
    encrypted = encrypt_bytes(raw)

    with dest.open("wb") as f:
        f.write(encrypted)

    return StoredFile(path=str(dest), sha256=sha256)
