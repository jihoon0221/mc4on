from __future__ import annotations

import base64
import json
from datetime import datetime
from pathlib import Path
import uuid
import zipfile

from sqlalchemy import false, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import AnalysisResult, DetectedEntity, Message, RiskEvent, Upload


def build_evidence_bundle(db: Session, upload: Upload) -> str:
    base_dir = Path(settings.data_dir) / "evidence_exports"
    base_dir.mkdir(parents=True, exist_ok=True)

    bundle_name = f"evidence_{upload.id}_{uuid.uuid4()}.zip"
    bundle_path = base_dir / bundle_name

    metadata = _build_upload_metadata(upload)

    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("metadata.json", json.dumps(metadata, ensure_ascii=False, indent=2))
        if upload.raw_file_path:
            raw_path = Path(upload.raw_file_path)
            if raw_path.exists():
                zf.write(raw_path, arcname=f"raw/{raw_path.name}")

    return str(bundle_path)


def build_evidence_bundle_for_range(
    db: Session,
    conversation_id: str,
    start_date,
    end_date,
) -> str:
    base_dir = Path(settings.data_dir) / "evidence_exports"
    base_dir.mkdir(parents=True, exist_ok=True)

    bundle_name = f"evidence_{conversation_id}_{uuid.uuid4()}.zip"
    bundle_path = base_dir / bundle_name

    uploads = db.execute(
        select(Upload).where(
            Upload.conversation_id == conversation_id,
            Upload.upload_date >= start_date,
            Upload.upload_date <= end_date,
        )
    ).scalars().all()

    upload_ids = [u.id for u in uploads]
    messages_query = select(Message)
    if upload_ids:
        messages_query = messages_query.where(Message.upload_id.in_(upload_ids))
    else:
        messages_query = messages_query.where(false())
    messages = db.execute(messages_query).scalars().all()

    message_ids = [m.id for m in messages]
    entities_query = select(DetectedEntity)
    if message_ids:
        entities_query = entities_query.where(DetectedEntity.message_id.in_(message_ids))
    else:
        entities_query = entities_query.where(false())
    entities = db.execute(entities_query).scalars().all()

    analyses = db.execute(
        select(AnalysisResult).where(
            AnalysisResult.conversation_id == conversation_id,
            AnalysisResult.analysis_date >= start_date,
            AnalysisResult.analysis_date <= end_date,
        )
    ).scalars().all()

    analysis_ids = [a.id for a in analyses]
    risk_events_query = select(RiskEvent)
    if analysis_ids:
        risk_events_query = risk_events_query.where(RiskEvent.analysis_id.in_(analysis_ids))
    else:
        risk_events_query = risk_events_query.where(false())
    risk_events = db.execute(risk_events_query).scalars().all()

    metadata = {
        "conversation_id": str(conversation_id),
        "range": {"start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
        "uploads": [_build_upload_metadata(u) for u in uploads],
        "messages": [
            {
                "id": str(m.id),
                "upload_id": str(m.upload_id),
                "sender": m.sender.value,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "message_type": m.message_type.value,
                "has_sensitive": m.has_sensitive,
                "content_masked": m.content_masked,
                "content_encrypted_base64": base64.b64encode(m.content_encrypted).decode("ascii")
                if m.content_encrypted
                else None,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
        "detected_entities": [
            {
                "id": str(e.id),
                "message_id": str(e.message_id),
                "entity_type": e.entity_type.value,
                "entity_value": e.entity_value,
                "created_at": e.created_at.isoformat(),
            }
            for e in entities
        ],
        "analysis_results": [
            {
                "id": str(a.id),
                "analysis_date": a.analysis_date.isoformat(),
                "risk_score": a.risk_score,
                "risk_level": a.risk_level,
                "flow_risk_score": a.flow_risk_score,
                "summary_text": a.summary_text,
                "warning_text": a.warning_text,
                "risk_explanation_text": a.risk_explanation_text,
                "tags": a.tags_text.split(",") if a.tags_text else [],
                "created_at": a.created_at.isoformat(),
            }
            for a in analyses
        ],
        "risk_events": [
            {
                "id": str(r.id),
                "analysis_id": str(r.analysis_id),
                "event_type": r.event_type,
                "severity": r.severity,
                "created_at": r.created_at.isoformat(),
            }
            for r in risk_events
        ],
        "exported_at": datetime.utcnow().isoformat() + "Z",
    }

    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("metadata.json", json.dumps(metadata, ensure_ascii=False, indent=2))
        for upload in uploads:
            if upload.raw_file_path:
                raw_path = Path(upload.raw_file_path)
                if raw_path.exists():
                    zf.write(raw_path, arcname=f"raw/{raw_path.name}")

    return str(bundle_path)


def _build_upload_metadata(upload: Upload) -> dict[str, str | None]:
    return {
        "upload_id": str(upload.id),
        "conversation_id": str(upload.conversation_id),
        "upload_date": upload.upload_date.isoformat(),
        "raw_file_path": upload.raw_file_path,
        "raw_file_sha256": upload.raw_file_sha256,
        "created_at": upload.created_at.isoformat(),
    }
