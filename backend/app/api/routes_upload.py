from __future__ import annotations

from datetime import date
import logging
import json
from io import BytesIO
import uuid
import zipfile

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.crypto import encrypt_text
from app.db.deps import get_db
from app.models.models import (
    AnalysisResult,
    Conversation,
    DetectedEntity,
    LearningContent,
    Message,
    MessageTypeEnum,
)
from app.models.models import SenderEnum, Upload, User
from app.services.analysis_jobs import enqueue_analysis_job, process_job
from app.services.kakao_import import (
    dedupe_messages,
    extract_photo_date,
    filter_new_messages,
    max_message_date,
    parse_kakao_text,
)
from app.services.external_checks import check_photo
from app.services.sensitive import detect_entities, mask_text
from app.services.storage import store_encrypted_bytes, store_encrypted_upload
from app.services.kakao_samples import get_sample_kakao_text

router = APIRouter(prefix="/upload", tags=["upload"])
logger = logging.getLogger(__name__)


def _get_or_create_conversation(db: Session, user_id: uuid.UUID) -> Conversation:
    convo = db.execute(
        select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.active.is_(True),
        )
    ).scalar_one_or_none()
    if convo:
        return convo

    convo = Conversation(user_id=user_id, active=True)
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return convo


def _save_upload_file(upload_file: UploadFile) -> tuple[str, str]:
    stored = store_encrypted_upload(upload_file)
    return stored.path, stored.sha256


@router.post("")
def upload(
    text: str = Form(...),
    upload_date: date | None = Form(None),
    sender: SenderEnum = Form(SenderEnum.me),
    webhook_url: str | None = Form(None),
    sync_analysis: bool = Form(False),
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    convo = _get_or_create_conversation(db, current_user.id)

    raw_file_path = None
    raw_file_sha256 = None
    if file is not None:
        raw_file_path, raw_file_sha256 = _save_upload_file(file)

    upload = Upload(
        conversation_id=convo.id,
        upload_date=upload_date or date.today(),
        raw_file_path=raw_file_path,
        raw_file_sha256=raw_file_sha256,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    entities = detect_entities(text)
    masked_text = mask_text(text) if sender == SenderEnum.me else None
    encrypted_text = encrypt_text(text)

    message = Message(
        upload_id=upload.id,
        sender=sender,
        content_encrypted=encrypted_text,
        content_masked=masked_text,
        message_type=MessageTypeEnum.text,
        has_sensitive=bool(entities),
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    if entities:
        for entity_type, entity_value in entities:
            db.add(
                DetectedEntity(
                    message_id=message.id,
                    entity_type=entity_type,
                    entity_value=entity_value,
                )
            )
        db.commit()

    job = enqueue_analysis_job(
        db=db,
        conversation_id=convo.id,
        upload_id=upload.id,
        target_date=upload.upload_date,
        webhook_url=webhook_url,
        photo_flags=[],
    )

    analysis_result = process_job(db, job) if sync_analysis else None
    learning_items = (
        _load_learning_items(db, convo.id, analysis_result.analysis_date)
        if analysis_result
        else []
    )
    return {
        "upload_id": str(upload.id),
        "conversation_id": str(convo.id),
        "analysis_job_id": str(job.id),
        "analysis_status": job.status.value,
        "upload_date": upload.upload_date.isoformat(),
        "analysis_result": _serialize_analysis_result(analysis_result, learning_items),
    }


def _resolve_sender(sender_name: str | None, me_name: str | None, user: User) -> SenderEnum:
    if sender_name is None:
        return SenderEnum.partner
    normalized = sender_name.strip()
    if me_name and normalized == me_name.strip():
        return SenderEnum.me
    if user.nickname and normalized == user.nickname.strip():
        return SenderEnum.me
    return SenderEnum.partner


def _decode_kakao_bytes(raw: bytes) -> str:
    try:
        return raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return raw.decode("cp949", errors="replace")


def _extract_zip_payload(raw: bytes) -> tuple[str, list[tuple[str, bytes]]]:
    try:
        with zipfile.ZipFile(BytesIO(raw)) as zf:
            files = [info for info in zf.infolist() if not info.is_dir()]
            if not files:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="zip_no_files",
                )
            txt_candidates = [f for f in files if f.filename.lower().endswith(".txt")]
            txt_info = txt_candidates[0] if txt_candidates else None
            if txt_info is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="zip_no_txt",
                )
            text_raw = zf.read(txt_info)
            text = _decode_kakao_bytes(text_raw)

            image_extensions = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic")
            photos: list[tuple[str, bytes]] = []
            for info in files:
                name = info.filename
                if name.lower().endswith(image_extensions):
                    photos.append((name, zf.read(info)))
            return text, photos
    except zipfile.BadZipFile as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="zip_parse_failed",
        ) from exc


@router.post("/kakao")
def upload_kakao(
    chat_file: UploadFile = File(...),
    me_name: str | None = Form(None),
    webhook_url: str | None = Form(None),
    sync_analysis: bool = Form(False),
    force: bool = Form(False),
    photos: list[UploadFile] | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    convo = _get_or_create_conversation(db, current_user.id)
    last_date = None if force else convo.last_ingested_date

    raw = chat_file.file.read()
    is_zip = zipfile.is_zipfile(BytesIO(raw))
    if is_zip:
        text, zip_photos = _extract_zip_payload(raw)
    else:
        text = _decode_kakao_bytes(raw)
        zip_photos = []
    chat_file.file.seek(0)

    photo_dates, photo_flags = _ingest_photos(
        db=db,
        convo=convo,
        photos=photos or [],
        zip_photos=zip_photos,
        last_date=last_date,
    )

    stored = _save_upload_file(chat_file)
    return _ingest_kakao_text(
        db=db,
        convo=convo,
        text=text,
        me_name=me_name,
        current_user=current_user,
        webhook_url=webhook_url,
        sync_analysis=sync_analysis,
        last_date=last_date,
        photo_dates=photo_dates,
        photo_flags=photo_flags,
        chat_raw_file_path=stored[0],
        chat_raw_file_sha256=stored[1],
    )


@router.post("/kakao/sample")
def upload_kakao_sample(
    me_name: str | None = Form(None),
    webhook_url: str | None = Form(None),
    sync_analysis: bool = Form(False),
    force: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    convo = _get_or_create_conversation(db, current_user.id)
    last_date = None if force else convo.last_ingested_date

    text = get_sample_kakao_text()
    stored = store_encrypted_bytes(text.encode("utf-8"), "sample_kakao.txt")

    return _ingest_kakao_text(
        db=db,
        convo=convo,
        text=text,
        me_name=me_name,
        current_user=current_user,
        webhook_url=webhook_url,
        sync_analysis=sync_analysis,
        last_date=last_date,
        photo_dates=[],
        photo_flags=[],
        chat_raw_file_path=stored.path,
        chat_raw_file_sha256=stored.sha256,
    )


def _ingest_photos(
    db: Session,
    convo: Conversation,
    photos: list[UploadFile],
    zip_photos: list[tuple[str, bytes]],
    last_date: date | None,
) -> tuple[list[date], list[str]]:
    photo_dates: list[date] = []
    photo_flags: list[str] = []
    for photo in photos:
        photo_date = extract_photo_date(photo.filename or "")
        if photo_date is None:
            continue
        if last_date and photo_date <= last_date:
            continue
        photo_dates.append(photo_date)
        raw = photo.file.read()
        risky, detail = check_photo(photo.filename or "", raw)
        if risky:
            photo_flags.append(detail.reasons[0] if detail and detail.reasons else "photo_risk")
        stored = store_encrypted_bytes(raw, photo.filename or "photo.bin")
        db.add(
            Upload(
                conversation_id=convo.id,
                upload_date=photo_date,
                raw_file_path=stored.path,
                raw_file_sha256=stored.sha256,
            )
        )
    for name, photo_raw in zip_photos:
        photo_date = extract_photo_date(name)
        if photo_date is None:
            continue
        if last_date and photo_date <= last_date:
            continue
        photo_dates.append(photo_date)
        risky, detail = check_photo(name, photo_raw)
        if risky:
            photo_flags.append(detail.reasons[0] if detail and detail.reasons else "photo_risk")
        stored = store_encrypted_bytes(photo_raw, name)
        db.add(
            Upload(
                conversation_id=convo.id,
                upload_date=photo_date,
                raw_file_path=stored.path,
                raw_file_sha256=stored.sha256,
            )
        )
    return photo_dates, photo_flags


def _ingest_kakao_text(
    db: Session,
    convo: Conversation,
    text: str,
    me_name: str | None,
    current_user: User,
    webhook_url: str | None,
    sync_analysis: bool,
    last_date: date | None,
    photo_dates: list[date],
    photo_flags: list[str],
    chat_raw_file_path: str | None,
    chat_raw_file_sha256: str | None,
) -> dict[str, object]:
    messages = parse_kakao_text(text)
    new_messages = filter_new_messages(messages, last_date)
    new_messages = dedupe_messages(new_messages)
    max_text_date = max_message_date(new_messages)

    if not new_messages and not photo_dates:
        return {
            "conversation_id": str(convo.id),
            "ingested_messages": 0,
            "skipped_messages": len(messages),
            "analysis_job_id": None,
            "analysis_status": None,
            "analysis_result": None,
            "last_ingested_date": convo.last_ingested_date.isoformat()
            if convo.last_ingested_date
            else None,
        }

    messages_by_date: dict[date, list] = {}
    for message in new_messages:
        msg_date = message.sent_at.date()
        messages_by_date.setdefault(msg_date, []).append(message)

    analysis_jobs: list[dict[str, object | None]] = []
    analysis_result = None
    analysis_results: list[dict[str, object | None]] = []
    upload = None
    for msg_date in sorted(messages_by_date.keys()):
        day_messages = messages_by_date[msg_date]
        upload = Upload(
            conversation_id=convo.id,
            upload_date=msg_date,
            raw_file_path=chat_raw_file_path,
            raw_file_sha256=chat_raw_file_sha256,
        )
        db.add(upload)
        db.commit()
        db.refresh(upload)

        for message in day_messages:
            sender = _resolve_sender(message.sender_name, me_name, current_user)
            entities = detect_entities(message.content)
            masked_text = mask_text(message.content) if sender == SenderEnum.me else None
            encrypted_text = encrypt_text(message.content)
            message_row = Message(
                upload_id=upload.id,
                sender=sender,
                sent_at=message.sent_at,
                content_encrypted=encrypted_text,
                content_masked=masked_text,
                message_type=MessageTypeEnum.text,
                has_sensitive=bool(entities),
            )
            db.add(message_row)
            db.flush()
            for entity_type, entity_value in entities:
                db.add(
                    DetectedEntity(
                        message_id=message_row.id,
                        entity_type=entity_type,
                        entity_value=entity_value,
                    )
                )
        db.commit()

        job = enqueue_analysis_job(
            db=db,
            conversation_id=convo.id,
            upload_id=upload.id,
            target_date=msg_date,
            webhook_url=webhook_url,
            photo_flags=photo_flags,
        )
        analysis_jobs.append(
            {
                "analysis_date": msg_date.isoformat(),
                "analysis_job_id": str(job.id),
                "analysis_status": job.status.value,
            }
        )
        if sync_analysis:
            analysis_result = process_job(db, job)
            analysis_results.append(
                _serialize_analysis_result(
                    analysis_result,
                    _load_learning_items(db, convo.id, analysis_result.analysis_date)
                    if analysis_result
                    else [],
                )
                if analysis_result
                else None
            )

    if new_messages:
        last_text_date = max_text_date
    else:
        last_text_date = None
    last_photo_date = max(photo_dates) if photo_dates else None
    candidates = [d for d in [last_text_date, last_photo_date] if d is not None]
    if candidates:
        convo.last_ingested_date = max(candidates)
        db.add(convo)
        db.commit()
        db.refresh(convo)

    learning_items = (
        _load_learning_items(db, convo.id, analysis_result.analysis_date)
        if analysis_result
        else []
    )

    payload = {
        "conversation_id": str(convo.id),
        "upload_id": str(upload.id) if upload else None,
        "ingested_messages": len(new_messages),
        "skipped_messages": len(messages) - len(new_messages),
        "analysis_jobs": analysis_jobs,
        "analysis_job_id": analysis_jobs[0]["analysis_job_id"] if analysis_jobs else None,
        "analysis_status": analysis_jobs[0]["analysis_status"] if analysis_jobs else None,
        "upload_date": upload.upload_date.isoformat() if upload else None,
        "analysis_results": [r for r in analysis_results if r is not None],
        "analysis_result": _serialize_analysis_result(analysis_result, learning_items),
        "last_ingested_date": convo.last_ingested_date.isoformat()
        if convo.last_ingested_date
        else None,
    }
    logger.info(
        "upload_kakao_response",
        extra={
            "conversation_id": payload.get("conversation_id"),
            "upload_id": payload.get("upload_id"),
            "ingested_messages": payload.get("ingested_messages"),
            "skipped_messages": payload.get("skipped_messages"),
            "analysis_jobs": payload.get("analysis_jobs"),
            "analysis_status": payload.get("analysis_status"),
            "analysis_result_present": bool(payload.get("analysis_result")),
            "analysis_results_count": len(payload.get("analysis_results") or []),
            "last_ingested_date": payload.get("last_ingested_date"),
        },
    )
    return payload


def _serialize_analysis_result(
    result: AnalysisResult | None,
    learning_items: list[LearningContent] | None = None,
) -> dict[str, object | None] | None:
    if result is None:
        return None
    learning_payload = _serialize_learning_items(learning_items or [])
    return {
        "analysis_date": result.analysis_date.isoformat(),
        "summary_text": result.summary_text,
        "tags": result.tags_text.split(",") if result.tags_text else [],
        "warning_text": result.warning_text,
        "warning_tags": result.warning_tags_text.split(",") if result.warning_tags_text else [],
        "risk_level": result.risk_level,
        "learning_items": learning_payload,
    }


def _serialize_learning_items(
    items: list[LearningContent],
) -> list[dict[str, str | None]]:
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
                "content_type": item.content_type.value,
                "review_due_date": item.review_due_date.isoformat()
                if item.review_due_date
                else None,
            }
        )
    return payloads


def _load_learning_items(
    db: Session,
    conversation_id: uuid.UUID,
    target_date: date,
) -> list[LearningContent]:
    return (
        db.execute(
            select(LearningContent).where(
                LearningContent.conversation_id == conversation_id,
                func.date(LearningContent.created_at) == target_date,
            )
        )
        .scalars()
        .all()
    )
