from __future__ import annotations

from datetime import date
import json

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
        "summary_tags": result.tags_text.split(",") if result.tags_text else [],
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
) -> dict[str, list[dict[str, object]]]:
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

    return {"items": _build_history_items(db, results)}


def _build_history_items(db: Session, results: list[AnalysisResult]) -> list[dict[str, object]]:
    items: list[dict[str, object]] = []
    for r in results:
        learning_items = db.execute(
            select(LearningContent)
            .where(LearningContent.conversation_id == r.conversation_id)
            .where(func.date(LearningContent.created_at) == r.analysis_date)
            .order_by(LearningContent.created_at.desc())
        ).scalars().all()
        items.append(
            {
                "analysis_date": r.analysis_date.isoformat(),
                "summary_text": r.summary_text,
                "tags": r.tags_text.split(",") if r.tags_text else [],
                "warning_text": r.warning_text,
                "warning_tags": r.warning_tags_text.split(",") if r.warning_tags_text else [],
                "risk_level": r.risk_level,
                "learning_items": _serialize_learning_items(learning_items),
            }
        )
    return items


def _serialize_learning_items(items: list[LearningContent]) -> list[dict[str, str | None]]:
    payloads: list[dict[str, str | None]] = []
    for item in items:
        content_kr = None
        content_fl = None
        raw = (item.content or "").strip()
        if raw.startswith("{") and raw.endswith("}"):
            try:
                decoded = json.loads(raw)
                content_kr = decoded.get("content_kr")
                content_fl = decoded.get("content_fl")
            except Exception:
                content_kr = None
                content_fl = None
        if not content_kr:
            content_kr = item.content
        if not content_fl:
            content_fl = content_kr
        payloads.append(
            {
                "content_kr": content_kr,
                "content_fl": content_fl,
            }
        )
    return payloads
