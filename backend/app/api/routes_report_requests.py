from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import Conversation, User
from app.models.reporting import ReportRequest, ReportStatusEnum
from app.services.evidence import build_evidence_bundle_for_range

router = APIRouter(prefix="/reports/request", tags=["report"])


@router.post("")
def create_report_request(
    start_date: date,
    end_date: date,
    report_note: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str | None]:
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

    bundle_path = build_evidence_bundle_for_range(db, convo.id, start_date, end_date)
    request = ReportRequest(
        conversation_id=convo.id,
        status=ReportStatusEnum.pending,
        report_note=report_note,
        evidence_bundle_path=bundle_path,
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    return {
        "report_request_id": str(request.id),
        "status": request.status.value,
        "evidence_bundle_path": request.evidence_bundle_path,
    }


@router.get("")
def list_report_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | None]]]:
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

    requests = db.execute(
        select(ReportRequest)
        .where(ReportRequest.conversation_id == convo.id)
        .order_by(ReportRequest.requested_at.desc())
    ).scalars().all()

    return {
        "items": [
            {
                "report_request_id": str(item.id),
                "status": item.status.value,
                "requested_at": item.requested_at.isoformat(),
                "report_note": item.report_note,
                "evidence_bundle_path": item.evidence_bundle_path,
            }
            for item in requests
        ]
    }
