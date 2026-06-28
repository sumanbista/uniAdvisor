import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base
from backend.app.db.types import Vector


class SourceType(str, enum.Enum):
    course_catalog = "course_catalog"
    four_year_plan = "four_year_plan"
    major_checksheet = "major_checksheet"
    degree_audit = "degree_audit"
    degree_requirements = "degree_requirements"
    department_advising = "department_advising"
    other = "other"


class DocumentStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    ready = "ready"
    failed = "failed"
    archived = "archived"


class RagConfidence(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class FeedbackRating(str, enum.Enum):
    helpful = "helpful"
    not_helpful = "not_helpful"
    incorrect = "incorrect"
    unclear = "unclear"
    unsafe = "unsafe"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[SourceType] = mapped_column(String(64), nullable=False)
    department: Mapped[str] = mapped_column(String(120), nullable=False, default="Computer Science", server_default="Computer Science")
    program: Mapped[str] = mapped_column(String(120), nullable=False, default="Computer Science", server_default="Computer Science")
    academic_year: Mapped[str | None] = mapped_column(String(32))
    status: Mapped[DocumentStatus] = mapped_column(String(32), nullable=False, default=DocumentStatus.uploaded.value, server_default=DocumentStatus.uploaded.value)
    uploaded_by: Mapped[str | None] = mapped_column(String(255))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('course_catalog', 'four_year_plan', 'major_checksheet', 'degree_audit', 'degree_requirements', 'department_advising', 'other')",
            name="ck_documents_source_type",
        ),
        CheckConstraint(
            "status IN ('uploaded', 'processing', 'ready', 'failed', 'archived')",
            name="ck_documents_status",
        ),
        Index("ix_documents_source_type", "source_type"),
        Index("ix_documents_department", "department"),
        Index("ix_documents_program", "program"),
        Index("ix_documents_academic_year", "academic_year"),
        Index("ix_documents_status", "status"),
    )


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(384), nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer)
    section_title: Mapped[str | None] = mapped_column(String(255))
    source_type: Mapped[SourceType] = mapped_column(String(64), nullable=False)
    department: Mapped[str] = mapped_column(String(120), nullable=False)
    program: Mapped[str] = mapped_column(String(120), nullable=False)
    academic_year: Mapped[str | None] = mapped_column(String(32))
    token_count: Mapped[int | None] = mapped_column(Integer)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    document: Mapped[Document] = relationship(back_populates="chunks")

    __table_args__ = (
        CheckConstraint(
            "source_type IN ('course_catalog', 'four_year_plan', 'major_checksheet', 'degree_audit', 'degree_requirements', 'department_advising', 'other')",
            name="ck_document_chunks_source_type",
        ),
        CheckConstraint("chunk_index >= 0", name="ck_document_chunks_chunk_index_nonnegative"),
        CheckConstraint("token_count IS NULL OR token_count >= 0", name="ck_document_chunks_token_count_nonnegative"),
        Index("ix_document_chunks_document_id", "document_id"),
        Index("ix_document_chunks_source_type", "source_type"),
        Index("ix_document_chunks_department", "department"),
        Index("ix_document_chunks_program", "program"),
        Index("ix_document_chunks_academic_year", "academic_year"),
        Index("ix_document_chunks_content_hash", "content_hash"),
        Index("ix_document_chunks_embedding", "embedding", postgresql_using="ivfflat", postgresql_ops={"embedding": "vector_cosine_ops"}),
        Index("uq_document_chunks_document_chunk_index", "document_id", "chunk_index", unique=True),
    )


class RagQuery(Base):
    __tablename__ = "rag_queries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_question: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_question: Mapped[str | None] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[RagConfidence] = mapped_column(String(16), nullable=False)
    retrieved_chunk_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False, default=list, server_default="{}")
    source_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    refused: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    refusal_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    feedback: Mapped[list["RagFeedback"]] = relationship(
        back_populates="query",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("confidence IN ('low', 'medium', 'high')", name="ck_rag_queries_confidence"),
        CheckConstraint("source_count >= 0", name="ck_rag_queries_source_count_nonnegative"),
        Index("ix_rag_queries_created_at", "created_at"),
        Index("ix_rag_queries_confidence", "confidence"),
        Index("ix_rag_queries_refused", "refused"),
    )


class RagFeedback(Base):
    __tablename__ = "rag_feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("rag_queries.id", ondelete="CASCADE"), nullable=False)
    rating: Mapped[FeedbackRating] = mapped_column(String(32), nullable=False)
    feedback_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

    query: Mapped[RagQuery] = relationship(back_populates="feedback")

    __table_args__ = (
        CheckConstraint(
            "rating IN ('helpful', 'not_helpful', 'incorrect', 'unclear', 'unsafe')",
            name="ck_rag_feedback_rating",
        ),
        Index("ix_rag_feedback_query_id", "query_id"),
        Index("ix_rag_feedback_rating", "rating"),
    )
