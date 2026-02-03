from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.models import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def me(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    return {
        "id": str(current_user.id),
        "google_sub": current_user.google_sub,
    }
