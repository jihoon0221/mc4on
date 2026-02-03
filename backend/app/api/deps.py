from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.auth import verify_google_id_token
from app.core.config import settings
from app.db.crud_user import upsert_user
from app.db.deps import get_db
from app.models.models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if settings.dev_bypass_auth:
        return upsert_user(db, "dev-sub", "dev@example.com")

    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
        )

    payload = verify_google_id_token(creds.credentials)
    return upsert_user(db, payload.sub, payload.email)
