from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import User

router = APIRouter(prefix="/profile", tags=["profile"])


@router.put("")
def update_profile(
    nickname: str | None = None,
    partner_name: str | None = None,
    partner_country: str | None = None,
    partner_job: str | None = None,
    language: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    if nickname is not None:
        current_user.nickname = nickname
    if partner_name is not None:
        current_user.partner_name = partner_name
    if partner_country is not None:
        current_user.partner_country = partner_country
    if partner_job is not None:
        current_user.partner_job = partner_job
    if language is not None:
        current_user.language = language

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "nickname": current_user.nickname,
        "partner_name": current_user.partner_name,
        "partner_country": current_user.partner_country,
        "partner_job": current_user.partner_job,
        "language": current_user.language,
    }
