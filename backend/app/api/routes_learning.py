from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import Conversation, LearningContent, User

router = APIRouter(prefix="/learning", tags=["learning"])


def _get_active_conversation(db: Session, user_id: str) -> Conversation | None:
    return db.execute(
        select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.active.is_(True),
        )
    ).scalar_one_or_none()


@router.get("/today")
def today_learning(
    target_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str | None]]]:
    convo = _get_active_conversation(db, current_user.id)
    if convo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active conversation.",
        )

    query = select(LearningContent).where(LearningContent.conversation_id == convo.id)
    if target_date is not None:
        query = query.where(func.date(LearningContent.created_at) == target_date)

    items = db.execute(query.order_by(LearningContent.created_at.desc())).scalars().all()
    return {
        "items": [
            {
                "content": item.content,
                "content_type": item.content_type.value,
                "review_due_date": item.review_due_date.isoformat()
                if item.review_due_date
                else None,
            }
            for item in items
        ]
    }
