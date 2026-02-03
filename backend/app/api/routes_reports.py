from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import AnalysisResult, Conversation, LearningContent, User

router = APIRouter(prefix="/reports", tags=["reports"])


def _get_active_conversation(db: Session, user_id: str) -> Conversation | None:
    return db.execute(
        select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.active.is_(True),
        )
    ).scalar_one_or_none()


@router.get("/daily")
def daily_report(
    report_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object | None]:
    convo = _get_active_conversation(db, current_user.id)
    if convo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active conversation.",
        )

    result = db.execute(
        select(AnalysisResult).where(
            AnalysisResult.conversation_id == convo.id,
            AnalysisResult.analysis_date == report_date,
        )
    ).scalar_one_or_none()

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No report for that date.",
        )

    learning_items = db.execute(
        select(LearningContent)
        .where(LearningContent.conversation_id == convo.id)
        .where(func.date(LearningContent.created_at) == report_date)
        .order_by(LearningContent.created_at.desc())
    ).scalars().all()

    return {
        "report_date": result.analysis_date.isoformat(),
        "summary_text": result.summary_text,
        "warning_text": result.warning_text,
        "learning_contents": [
            {
                "content": item.content,
                "content_type": item.content_type.value,
                "review_due_date": item.review_due_date.isoformat()
                if item.review_due_date
                else None,
            }
            for item in learning_items
        ],
    }


@router.get("/history")
def history_reports(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | None]]]:
    convo = _get_active_conversation(db, current_user.id)
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
        "items": _build_history_items(db, results),
    }


def _build_history_items(db: Session, results: list[AnalysisResult]) -> list[dict[str, str | None]]:
    items: list[dict[str, str | None]] = []
    for r in results:
        has_events = (
            db.execute(
                select(RiskEvent.id).where(RiskEvent.analysis_id == r.id).limit(1)
            ).scalar_one_or_none()
            is not None
        )
        items.append(
            {
                "analysis_id": str(r.id),
                "date": r.analysis_date.isoformat(),
                "summary": {
                    "text": r.summary_text,
                    "warning": {
                        "text": r.warning_text,
                        "tags": r.tags_text.split(",") if r.tags_text else [],
                        "explanation_text": r.risk_explanation_text,
                    }
                    if has_events
                    else None,
                },
                "summary_short": r.summary_short_text,
                "should_prompt_report": bool(r.warning_text),
                "bird_state": bird_state_from_risk_level(r.risk_level or 1)
                if has_events
                else None,
            }
        )
    return items
