from __future__ import annotations

import enum
import uuid

from sqlalchemy import DateTime, ForeignKey, Text, text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReportStatusEnum(str, enum.Enum):
    pending = "PENDING"
    submitted = "SUBMITTED"
    closed = "CLOSED"


class ReportRequest(Base):
    __tablename__ = "report_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    requested_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )
    status: Mapped[ReportStatusEnum] = mapped_column(
        SAEnum(ReportStatusEnum, name="report_status_enum"),
        nullable=False,
        server_default="PENDING",
    )
    report_note: Mapped[str | None] = mapped_column(Text)
    evidence_bundle_path: Mapped[str | None] = mapped_column(Text)
