from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.models.models import Conversation, QuizItem, User

router = APIRouter(prefix="/quiz", tags=["quiz"])


def _get_active_conversation(db: Session, user_id: str) -> Conversation | None:
    return db.execute(
        select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.active.is_(True),
        )
    ).scalar_one_or_none()


@router.get("/today")
def today_quiz(
    target_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str]]]:
    convo = _get_active_conversation(db, current_user.id)
    if convo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active conversation.",
        )

    query = select(QuizItem).where(QuizItem.conversation_id == convo.id)
    if target_date is None:
        target_date = date.today()
    query = query.where(QuizItem.quiz_date == target_date)

    items = db.execute(query.order_by(QuizItem.created_at.desc())).scalars().all()
    return {
        "items": [
            {
                "quiz_id": str(item.id),
                "quiz_date": item.quiz_date.isoformat(),
                "quiz_text": item.quiz_text,
            }
            for item in items
        ]
    }
