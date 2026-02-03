from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.deps import get_db
from app.db.session import SessionLocal
from app.models.models import AnalysisJob, Conversation, User

router = APIRouter(prefix="/analysis-jobs", tags=["analysis"])


@router.get("/{job_id}")
def get_job_status(
    job_id: str,
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

    job = db.execute(
        select(AnalysisJob).where(
            AnalysisJob.id == job_id,
            AnalysisJob.conversation_id == convo.id,
        )
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    return {
        "job_id": str(job.id),
        "status": job.status.value,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


@router.get("/stream/{job_id}")
def stream_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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

    job_exists = db.execute(
        select(AnalysisJob.id).where(
            AnalysisJob.id == job_id,
            AnalysisJob.conversation_id == convo.id,
        )
    ).scalar_one_or_none()
    if job_exists is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found.",
        )

    async def event_stream():
        while True:
            with SessionLocal() as session:
                job = session.execute(
                    select(AnalysisJob).where(AnalysisJob.id == job_id)
                ).scalar_one_or_none()
                if job is None:
                    payload = {"status": "MISSING"}
                    yield f"data: {json.dumps(payload)}\n\n"
                    break
                payload = {
                    "job_id": str(job.id),
                    "status": job.status.value,
                    "error_message": job.error_message,
                    "updated_at": job.updated_at.isoformat(),
                }
                yield f"data: {json.dumps(payload)}\n\n"
                if job.status.value in {"DONE", "FAILED"}:
                    break
            await asyncio.sleep(2)

    return StreamingResponse(event_stream(), media_type="text/event-stream")
