from __future__ import annotations

from datetime import date, datetime
import json
from typing import Iterable

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.models import (
    AnalysisJob,
    AnalysisJobStatusEnum,
    AnalysisResult,
    Conversation,
    DetectedEntity,
    EntityCheck,
    EntityTypeEnum,
    Message,
    RiskEvent,
    User,
)
from app.core.crypto import decrypt_text
from app.services.analysis import run_daily_analysis
from app.services.external_checks import check_account, check_link
from app.services.risk import bird_state_from_risk_level


def _normalize_text(value: str | None) -> str:
    return " ".join((value or "").strip().split())


def _language_from_country(country: str | None) -> str | None:
    if not country:
        return None
    normalized = _normalize_text(country).lower()
    mapping = {
        "korea": "Korean",
        "south korea": "Korean",
        "대한민국": "Korean",
        "한국": "Korean",
        "japan": "Japanese",
        "일본": "Japanese",
        "china": "Chinese",
        "중국": "Chinese",
        "usa": "English",
        "united states": "English",
        "미국": "English",
        "uk": "English",
        "united kingdom": "English",
        "영국": "English",
        "canada": "English",
        "australia": "English",
        "singapore": "English",
        "philippines": "English",
        "india": "English",
        "malaysia": "Malay",
        "vietnam": "Vietnamese",
        "thailand": "Thai",
        "indonesia": "Indonesian",
        "russia": "Russian",
        "france": "French",
        "germany": "German",
        "spain": "Spanish",
        "italy": "Italian",
        "turkey": "Turkish",
        "brazil": "Portuguese",
        "mexico": "Spanish",
    }
    return mapping.get(normalized)


def _language_from_user_pref(language: str | None) -> str | None:
    if not language:
        return None
    normalized = _normalize_text(language).lower()
    mapping = {
        "ko": "Korean",
        "kr": "Korean",
        "korean": "Korean",
        "en": "English",
        "english": "English",
        "ja": "Japanese",
        "jp": "Japanese",
        "japanese": "Japanese",
        "zh": "Chinese",
        "chinese": "Chinese",
        "vi": "Vietnamese",
        "vietnamese": "Vietnamese",
        "th": "Thai",
        "thai": "Thai",
        "id": "Indonesian",
        "indonesian": "Indonesian",
        "ms": "Malay",
        "malay": "Malay",
        "ru": "Russian",
        "russian": "Russian",
        "fr": "French",
        "french": "French",
        "de": "German",
        "german": "German",
        "es": "Spanish",
        "spanish": "Spanish",
        "it": "Italian",
        "italian": "Italian",
        "tr": "Turkish",
        "turkish": "Turkish",
        "pt": "Portuguese",
        "portuguese": "Portuguese",
    }
    return mapping.get(normalized, language)


def _resolve_learning_language(user: User) -> str | None:
    by_country = _language_from_country(user.partner_country)
    if by_country:
        return by_country
    return "English"


def enqueue_analysis_job(
    db: Session,
    conversation_id,
    upload_id,
    target_date: date,
    webhook_url: str | None = None,
    photo_flags: list[str] | None = None,
) -> AnalysisJob:
    job = AnalysisJob(
        conversation_id=conversation_id,
        upload_id=upload_id,
        target_date=target_date,
        status=AnalysisJobStatusEnum.pending,
        webhook_url=webhook_url,
        photo_flags_text=",".join(photo_flags) if photo_flags else None,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def fetch_next_job(db: Session) -> AnalysisJob | None:
    job = (
        db.execute(
            select(AnalysisJob)
            .where(AnalysisJob.status == AnalysisJobStatusEnum.pending)
            # Process earliest day first to keep summaries chronological.
            .order_by(AnalysisJob.target_date.asc(), AnalysisJob.created_at.asc())
            .limit(1)
        )
        .scalar_one_or_none()
    )
    if job is None:
        return None
    job.status = AnalysisJobStatusEnum.running
    job.updated_at = datetime.utcnow()
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def process_job(db: Session, job: AnalysisJob) -> AnalysisResult | None:
    try:
        existing = db.execute(
            select(AnalysisResult).where(
                AnalysisResult.conversation_id == job.conversation_id,
                AnalysisResult.analysis_date == job.target_date,
            )
        ).scalar_one_or_none()
        if existing:
            job.status = AnalysisJobStatusEnum.done
            job.updated_at = datetime.utcnow()
            db.add(job)
            db.commit()
            return existing
        conversation = db.execute(
            select(Conversation).where(Conversation.id == job.conversation_id)
        ).scalar_one()
        user = db.execute(select(User).where(User.id == conversation.user_id)).scalar_one()

        messages = db.execute(
            select(Message).where(Message.upload_id == job.upload_id)
        ).scalars().all()
        message_texts: list[str] = []
        for msg in messages:
            if msg.content_masked:
                message_texts.append(msg.content_masked)
                continue
            if msg.content_encrypted:
                try:
                    message_texts.append(decrypt_text(msg.content_encrypted))
                except Exception:
                    continue
        if not message_texts:
            message_texts = ["(텍스트 없음)"]

        message_ids = [m.id for m in messages]
        if message_ids:
            entities = db.execute(
                select(DetectedEntity).where(DetectedEntity.message_id.in_(message_ids))
            ).scalars().all()
        else:
            entities = []
        entity_pairs = [(e.entity_type, e.entity_value or "") for e in entities]
        _store_entity_checks(db, entities)

        photo_flags = job.photo_flags_text.split(",") if job.photo_flags_text else []
        result = run_daily_analysis(
            db=db,
            conversation=conversation,
            target_date=job.target_date,
            message_texts=message_texts,
            entities=entity_pairs,
            photo_flags=photo_flags,
            partner_country=user.partner_country,
            partner_job=user.partner_job,
            learning_language=_resolve_learning_language(user),
        ).result

        job.status = AnalysisJobStatusEnum.done
        job.updated_at = datetime.utcnow()
        db.add(job)
        db.commit()

        if job.webhook_url:
            _send_webhook(db, job, result)

        return result
    except Exception as exc:  # pragma: no cover - defensive logging for worker
        job.status = AnalysisJobStatusEnum.failed
        job.error_message = str(exc)
        job.updated_at = datetime.utcnow()
        db.add(job)
        db.commit()
        return None


def _send_webhook(db: Session, job: AnalysisJob, result: AnalysisResult) -> None:
    has_events = (
        db.execute(
            select(RiskEvent.id).where(RiskEvent.analysis_id == result.id).limit(1)
        ).scalar_one_or_none()
        is not None
    )
    bird_state = bird_state_from_risk_level(result.risk_level or 1) if has_events else None
    payload = {
        "job_id": str(job.id),
        "conversation_id": str(job.conversation_id),
        "upload_id": str(job.upload_id),
        "analysis_date": result.analysis_date.isoformat(),
        "risk_level": result.risk_level,
        "warning_text": result.warning_text,
        "bird_state": bird_state,
        "risk_explanation_text": result.risk_explanation_text,
        "tags": result.tags_text.split(",") if result.tags_text else [],
    }
    try:
        response = httpx.post(job.webhook_url, json=payload, timeout=5.0)
        job.webhook_status_code = response.status_code
        job.webhook_error = None
    except Exception as exc:  # pragma: no cover - best effort
        job.webhook_status_code = None
        job.webhook_error = str(exc)
    job.updated_at = datetime.utcnow()
    db.add(job)
    db.commit()


def _store_entity_checks(db: Session, entities: list[DetectedEntity]) -> None:
    for entity in entities:
        if entity.entity_type == EntityTypeEnum.link:
            risky, detail = check_link(entity.entity_value or "")
            db.add(
                EntityCheck(
                    detected_entity_id=entity.id,
                    check_type="link_reputation",
                    is_risky=risky,
                    details=_serialize_detail(detail),
                )
            )
        if entity.entity_type == EntityTypeEnum.account:
            risky, detail = check_account(entity.entity_value or "")
            db.add(
                EntityCheck(
                    detected_entity_id=entity.id,
                    check_type="account_risk",
                    is_risky=risky,
                    details=_serialize_detail(detail),
                )
            )
    db.commit()


def _serialize_detail(detail) -> str | None:
    if detail is None:
        return None
    try:
        payload = {
            "provider": detail.provider,
            "verdict": detail.verdict,
            "score": detail.score,
            "reasons": detail.reasons,
            "raw": detail.raw,
            "request_id": detail.request_id,
        }
        return json.dumps(payload, ensure_ascii=False)
    except Exception:
        return None
