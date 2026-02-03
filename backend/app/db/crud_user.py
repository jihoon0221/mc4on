from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import User


def get_user_by_google_sub(db: Session, google_sub: str) -> User | None:
    return db.execute(
        select(User).where(User.google_sub == google_sub)
    ).scalar_one_or_none()


def upsert_user(db: Session, google_sub: str, email: str | None) -> User:
    user = get_user_by_google_sub(db, google_sub)
    if user:
        return user

    user = User(google_sub=google_sub, nickname=email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
