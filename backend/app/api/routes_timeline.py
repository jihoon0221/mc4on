from __future__ import annotations

from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import AnalysisResult, Conversation, TimelineEntry, User

router = APIRouter(prefix="/timeline", tags=["timeline"])


class TimelineCompleteRequest(BaseModel):
    entry_date: date
    bird_state: str = Field(min_length=1)
    summary_text: str | None = None
    summary_short: str | None = None
    tags: List[str] | None = None


@router.post("/complete")
def complete_learning(
    payload: TimelineCompleteRequest,
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

    existing = db.execute(
        select(TimelineEntry).where(
            TimelineEntry.conversation_id == convo.id,
            TimelineEntry.entry_date == payload.entry_date,
        )
    ).scalar_one_or_none()

    tags_text = ",".join(payload.tags) if payload.tags else None

    if existing:
        existing.bird_state = payload.bird_state
        existing.summary_text = payload.summary_text
        existing.summary_short_text = payload.summary_short
        existing.tags_text = tags_text
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return {"timeline_id": str(existing.id)}

    entry = TimelineEntry(
        conversation_id=convo.id,
        entry_date=payload.entry_date,
        bird_state=payload.bird_state,
        summary_text=payload.summary_text,
        summary_short_text=payload.summary_short,
        tags_text=tags_text,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"timeline_id": str(entry.id)}


@router.get("")
def list_timeline(
    limit: int = 60,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, object | None]]]:
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

    results = db.execute(
        select(AnalysisResult)
        .where(AnalysisResult.conversation_id == convo.id)
        .order_by(AnalysisResult.analysis_date.desc())
        .limit(limit)
    ).scalars().all()

    return {
        "items": [
            {
                "entry_date": result.analysis_date.isoformat(),
                "day_count": _day_count(convo, result.analysis_date),
                "bird_state": 1 if result.warning_text else 0,
                "summary_short": result.summary_short_text,
                "tags": result.tags_text.split(",") if result.tags_text else [],
                "warning_text": result.warning_text,
                "warning_tags": result.warning_tags_text.split(",") if result.warning_tags_text else [],
            }
            for result in results
        ]
    }


@router.get("/{entry_date}")
def get_timeline_entry(
    entry_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object | None]:
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

    result = db.execute(
        select(AnalysisResult).where(
            AnalysisResult.conversation_id == convo.id,
            AnalysisResult.analysis_date == entry_date,
        )
    ).scalar_one_or_none()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Timeline entry not found.",
        )

    return {
        "entry_date": result.analysis_date.isoformat(),
        "day_count": _day_count(convo, result.analysis_date),
        "bird_state": 1 if result.warning_text else 0,
        "summary_short": result.summary_short_text,
        "tags": result.tags_text.split(",") if result.tags_text else [],
        "warning_text": result.warning_text,
        "warning_tags": result.warning_tags_text.split(",") if result.warning_tags_text else [],
    }


def _day_count(convo: Conversation, analysis_date: date) -> int | None:
    if not convo.created_at:
        return None
    start_date = convo.created_at.date()
    return (analysis_date - start_date).days + 1
