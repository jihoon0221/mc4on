from __future__ import annotations

from datetime import date
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.crypto import encrypt_text
from app.db.deps import get_db
from app.models.models import Conversation, DetectedEntity, Message, MessageTypeEnum
from app.models.models import SenderEnum, Upload, User
from app.services.analysis_jobs import enqueue_analysis_job
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

router = APIRouter(prefix="/upload", tags=["upload"])


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
    file: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
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

    return {
        "upload_id": str(upload.id),
        "conversation_id": str(convo.id),
        "analysis_job_id": str(job.id),
        "analysis_status": job.status.value,
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


@router.post("/kakao")
def upload_kakao(
    chat_file: UploadFile = File(...),
    me_name: str | None = Form(None),
    webhook_url: str | None = Form(None),
    photos: list[UploadFile] | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, object]:
    convo = _get_or_create_conversation(db, current_user.id)
    last_date = convo.last_ingested_date

    raw = chat_file.file.read()
    text = _decode_kakao_bytes(raw)
    chat_file.file.seek(0)
    messages = parse_kakao_text(text)
    new_messages = filter_new_messages(messages, last_date)
    new_messages = dedupe_messages(new_messages)
    max_text_date = max_message_date(new_messages)

    photo_dates: list[date] = []
    photo_flags: list[str] = []
    for photo in photos or []:
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
        raw_file_path, raw_file_sha256 = stored.path, stored.sha256
        db.add(
            Upload(
                conversation_id=convo.id,
                upload_date=photo_date,
                raw_file_path=raw_file_path,
                raw_file_sha256=raw_file_sha256,
            )
        )

    if not new_messages and not photo_dates:
        return {
            "conversation_id": str(convo.id),
            "ingested_messages": 0,
            "skipped_messages": len(messages),
            "last_ingested_date": convo.last_ingested_date.isoformat()
            if convo.last_ingested_date
            else None,
        }

    chat_raw_file_path, chat_raw_file_sha256 = _save_upload_file(chat_file)
    upload = Upload(
        conversation_id=convo.id,
        upload_date=max_text_date or date.today(),
        raw_file_path=chat_raw_file_path,
        raw_file_sha256=chat_raw_file_sha256,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    for message in new_messages:
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

    message_texts = [m.content for m in new_messages]
    all_entities: list[tuple] = []
    for msg in new_messages:
        all_entities.extend(detect_entities(msg.content))

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

    job = None
    if max_text_date:
        job = enqueue_analysis_job(
            db=db,
            conversation_id=convo.id,
            upload_id=upload.id,
            target_date=max_text_date,
            webhook_url=webhook_url,
            photo_flags=photo_flags,
        )

    return {
        "conversation_id": str(convo.id),
        "upload_id": str(upload.id),
        "ingested_messages": len(new_messages),
        "skipped_messages": len(messages) - len(new_messages),
        "analysis_job_id": str(job.id) if job else None,
        "analysis_status": job.status.value if job else None,
        "last_ingested_date": convo.last_ingested_date.isoformat()
        if convo.last_ingested_date
        else None,
    }
