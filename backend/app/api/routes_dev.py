from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.deps import get_db
from app.models.models import User
from app.services.reset import reset_all

router = APIRouter(prefix="/dev", tags=["dev"])


@router.post("/reset")
def reset_state(
    clear_files: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    if not settings.dev_bypass_auth and settings.environment != "development":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Reset is only available in development.",
        )
    # Avoid touching ORM objects after reset_all() because rows are truncated.
    user_id = str(current_user.id)
    reset_all(db, clear_files=clear_files)
    return {
        "ok": True,
        "cleared_files": clear_files,
        "user_id": user_id,
    }
