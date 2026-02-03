from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Upload


def cleanup_retention(db: Session) -> int:
    cutoff = date.today() - timedelta(days=settings.retention_days)
    uploads = db.execute(
        select(Upload).where(
            Upload.upload_date < cutoff,
            Upload.raw_file_path.isnot(None),
        )
    ).scalars().all()

    removed = 0
    for upload in uploads:
        if upload.raw_file_path:
            try:
                Path(upload.raw_file_path).unlink(missing_ok=True)
            except Exception:
                pass
            upload.raw_file_path = None
            upload.raw_file_sha256 = None
            removed += 1

    if removed:
        db.commit()

    return removed
