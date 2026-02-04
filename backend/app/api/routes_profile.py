from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import User

router = APIRouter(prefix="/profile", tags=["profile"])


class ProfilePayload(BaseModel):
    nickname: str | None = None
    partner_name: str | None = None
    partner_country: str | None = None
    partner_job: str | None = None
    language: str | None = None


@router.get("")
def get_profile(
    current_user: User = Depends(get_current_user),
) -> dict[str, str | None]:
    return {
        "nickname": current_user.nickname,
        "partner_name": current_user.partner_name,
        "partner_country": current_user.partner_country,
        "partner_job": current_user.partner_job,
        "language": current_user.language,
    }


@router.put("")
def update_profile(
    payload: ProfilePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
    if payload.nickname is not None:
        current_user.nickname = payload.nickname
    if payload.partner_name is not None:
        current_user.partner_name = payload.partner_name
    if payload.partner_country is not None:
        current_user.partner_country = payload.partner_country
    if payload.partner_job is not None:
        current_user.partner_job = payload.partner_job
    if payload.language is not None:
        current_user.language = payload.language

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
