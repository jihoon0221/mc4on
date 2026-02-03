from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import Conversation, Upload, User
from app.services.evidence import build_evidence_bundle, build_evidence_bundle_for_range

router = APIRouter(prefix="/evidence", tags=["evidence"])


@router.post("/export")
def export_evidence(
    upload_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    convo = db.execute(
        select(Conversation).where(
            Conversation.user_id == current_user.id,
            Conversation.active.is_(True),
        )
    ).scalar_one_or_none()
    if convo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active conversation.",
        )

    if upload_id:
        upload = db.execute(
            select(Upload).where(
                Upload.id == upload_id,
                Upload.conversation_id == convo.id,
            )
        ).scalar_one_or_none()
        if upload is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found.",
            )
        bundle_path = build_evidence_bundle(db, upload)
        return {"bundle_path": bundle_path}

    if start_date is None or end_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide upload_id or start_date/end_date.",
        )

    bundle_path = build_evidence_bundle_for_range(db, convo.id, start_date, end_date)
    return {"bundle_path": bundle_path}
