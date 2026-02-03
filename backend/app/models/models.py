import enum
import uuid

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import LargeBinary, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SenderEnum(str, enum.Enum):
    me = "ME"
    partner = "PARTNER"


class MessageTypeEnum(str, enum.Enum):
    text = "TEXT"
    image = "IMAGE"
    file = "FILE"


class EntityTypeEnum(str, enum.Enum):
    account = "ACCOUNT"
    phone = "PHONE"
    email = "EMAIL"
    address = "ADDRESS"
    link = "LINK"


class LearningContentTypeEnum(str, enum.Enum):
    word = "WORD"
    sentence = "SENTENCE"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    google_sub: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    nickname: Mapped[str | None] = mapped_column(Text)
    partner_name: Mapped[str | None] = mapped_column(Text)
    partner_country: Mapped[str | None] = mapped_column(Text)
    partner_job: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(Text, server_default="ko", nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )
    deleted_at: Mapped[DateTime | None] = mapped_column(DateTime)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )
    active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    last_ingested_date: Mapped[Date | None] = mapped_column(Date)


class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    upload_date: Mapped[Date] = mapped_column(Date, nullable=False)
    raw_file_path: Mapped[str | None] = mapped_column(Text)
    raw_file_sha256: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=False
    )
    sender: Mapped[SenderEnum] = mapped_column(
        SAEnum(SenderEnum, name="sender_enum"), nullable=False
    )
    sent_at: Mapped[DateTime | None] = mapped_column(DateTime)
    content_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary)
    content_masked: Mapped[str | None] = mapped_column(Text)
    message_type: Mapped[MessageTypeEnum] = mapped_column(
        SAEnum(MessageTypeEnum, name="message_type_enum"), nullable=False
    )
    has_sensitive: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class DetectedEntity(Base):
    __tablename__ = "detected_entities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id"), nullable=False
    )
    entity_type: Mapped[EntityTypeEnum] = mapped_column(
        SAEnum(EntityTypeEnum, name="entity_type_enum"), nullable=False
    )
    entity_value: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    analysis_date: Mapped[Date] = mapped_column(Date, nullable=False)
    risk_score: Mapped[float | None] = mapped_column(Float)
    risk_level: Mapped[int | None] = mapped_column(Integer)
    flow_risk_score: Mapped[float | None] = mapped_column(Float)
    summary_text: Mapped[str | None] = mapped_column(Text)
    summary_short_text: Mapped[str | None] = mapped_column(Text)
    warning_text: Mapped[str | None] = mapped_column(Text)
    warning_tags_text: Mapped[str | None] = mapped_column(Text)
    risk_explanation_text: Mapped[str | None] = mapped_column(Text)
    tags_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    analysis_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("analysis_results.id"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class LearningContent(Base):
    __tablename__ = "learning_contents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[LearningContentTypeEnum] = mapped_column(
        SAEnum(LearningContentTypeEnum, name="learning_content_type_enum"),
        nullable=False,
    )
    review_due_date: Mapped[Date | None] = mapped_column(Date)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class QuizItem(Base):
    __tablename__ = "quiz_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    quiz_date: Mapped[Date] = mapped_column(Date, nullable=False)
    quiz_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class AnalysisJobStatusEnum(str, enum.Enum):
    pending = "PENDING"
    running = "RUNNING"
    done = "DONE"
    failed = "FAILED"


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    upload_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("uploads.id"), nullable=False
    )
    target_date: Mapped[Date] = mapped_column(Date, nullable=False)
    status: Mapped[AnalysisJobStatusEnum] = mapped_column(
        SAEnum(AnalysisJobStatusEnum, name="analysis_job_status_enum"),
        nullable=False,
        server_default="PENDING",
    )
    webhook_url: Mapped[str | None] = mapped_column(Text)
    webhook_status_code: Mapped[int | None] = mapped_column(Integer)
    webhook_error: Mapped[str | None] = mapped_column(Text)
    photo_flags_text: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class TimelineEntry(Base):
    __tablename__ = "timeline_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id"), nullable=False
    )
    entry_date: Mapped[Date] = mapped_column(Date, nullable=False)
    bird_state: Mapped[str] = mapped_column(Text, nullable=False)
    summary_text: Mapped[str | None] = mapped_column(Text)
    summary_short_text: Mapped[str | None] = mapped_column(Text)
    tags_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )


class EntityCheck(Base):
    __tablename__ = "entity_checks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    detected_entity_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("detected_entities.id"), nullable=False
    )
    check_type: Mapped[str] = mapped_column(Text, nullable=False)
    is_risky: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    details: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=text("now()"), nullable=False
    )
