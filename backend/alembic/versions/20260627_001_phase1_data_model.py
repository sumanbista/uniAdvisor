"""create phase 1 data model

Revision ID: 20260627_001
Revises:
Create Date: 2026-06-27
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from backend.app.db.types import Vector


revision = "20260627_001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("department", sa.String(length=120), server_default="Computer Science", nullable=False),
        sa.Column("program", sa.String(length=120), server_default="Computer Science", nullable=False),
        sa.Column("academic_year", sa.String(length=32), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="uploaded", nullable=False),
        sa.Column("uploaded_by", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "source_type IN ('course_catalog', 'four_year_plan', 'major_checksheet', 'degree_audit', 'degree_requirements', 'department_advising', 'other')",
            name="ck_documents_source_type",
        ),
        sa.CheckConstraint(
            "status IN ('uploaded', 'processing', 'ready', 'failed', 'archived')",
            name="ck_documents_status",
        ),
    )
    op.create_index("ix_documents_source_type", "documents", ["source_type"])
    op.create_index("ix_documents_department", "documents", ["department"])
    op.create_index("ix_documents_program", "documents", ["program"])
    op.create_index("ix_documents_academic_year", "documents", ["academic_year"])
    op.create_index("ix_documents_status", "documents", ["status"])

    op.create_table(
        "document_chunks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(384), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("section_title", sa.String(length=255), nullable=True),
        sa.Column("source_type", sa.String(length=64), nullable=False),
        sa.Column("department", sa.String(length=120), nullable=False),
        sa.Column("program", sa.String(length=120), nullable=False),
        sa.Column("academic_year", sa.String(length=32), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "source_type IN ('course_catalog', 'four_year_plan', 'major_checksheet', 'degree_audit', 'degree_requirements', 'department_advising', 'other')",
            name="ck_document_chunks_source_type",
        ),
        sa.CheckConstraint("chunk_index >= 0", name="ck_document_chunks_chunk_index_nonnegative"),
        sa.CheckConstraint("token_count IS NULL OR token_count >= 0", name="ck_document_chunks_token_count_nonnegative"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_document_chunks_document_id", "document_chunks", ["document_id"])
    op.create_index("ix_document_chunks_source_type", "document_chunks", ["source_type"])
    op.create_index("ix_document_chunks_department", "document_chunks", ["department"])
    op.create_index("ix_document_chunks_program", "document_chunks", ["program"])
    op.create_index("ix_document_chunks_academic_year", "document_chunks", ["academic_year"])
    op.create_index("ix_document_chunks_content_hash", "document_chunks", ["content_hash"])
    op.create_index("uq_document_chunks_document_chunk_index", "document_chunks", ["document_id", "chunk_index"], unique=True)
    op.create_index(
        "ix_document_chunks_embedding",
        "document_chunks",
        ["embedding"],
        postgresql_using="ivfflat",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )

    op.create_table(
        "rag_queries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_question", sa.Text(), nullable=False),
        sa.Column("normalized_question", sa.Text(), nullable=True),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("confidence", sa.String(length=16), nullable=False),
        sa.Column("retrieved_chunk_ids", postgresql.ARRAY(postgresql.UUID(as_uuid=True)), server_default="{}", nullable=False),
        sa.Column("source_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("refused", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("refusal_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("confidence IN ('low', 'medium', 'high')", name="ck_rag_queries_confidence"),
        sa.CheckConstraint("source_count >= 0", name="ck_rag_queries_source_count_nonnegative"),
    )
    op.create_index("ix_rag_queries_created_at", "rag_queries", ["created_at"])
    op.create_index("ix_rag_queries_confidence", "rag_queries", ["confidence"])
    op.create_index("ix_rag_queries_refused", "rag_queries", ["refused"])

    op.create_table(
        "rag_feedback",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("query_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("rating", sa.String(length=32), nullable=False),
        sa.Column("feedback_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "rating IN ('helpful', 'not_helpful', 'incorrect', 'unclear', 'unsafe')",
            name="ck_rag_feedback_rating",
        ),
        sa.ForeignKeyConstraint(["query_id"], ["rag_queries.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_rag_feedback_query_id", "rag_feedback", ["query_id"])
    op.create_index("ix_rag_feedback_rating", "rag_feedback", ["rating"])


def downgrade() -> None:
    op.drop_index("ix_rag_feedback_rating", table_name="rag_feedback")
    op.drop_index("ix_rag_feedback_query_id", table_name="rag_feedback")
    op.drop_table("rag_feedback")

    op.drop_index("ix_rag_queries_refused", table_name="rag_queries")
    op.drop_index("ix_rag_queries_confidence", table_name="rag_queries")
    op.drop_index("ix_rag_queries_created_at", table_name="rag_queries")
    op.drop_table("rag_queries")

    op.drop_index("ix_document_chunks_embedding", table_name="document_chunks")
    op.drop_index("uq_document_chunks_document_chunk_index", table_name="document_chunks")
    op.drop_index("ix_document_chunks_content_hash", table_name="document_chunks")
    op.drop_index("ix_document_chunks_academic_year", table_name="document_chunks")
    op.drop_index("ix_document_chunks_program", table_name="document_chunks")
    op.drop_index("ix_document_chunks_department", table_name="document_chunks")
    op.drop_index("ix_document_chunks_source_type", table_name="document_chunks")
    op.drop_index("ix_document_chunks_document_id", table_name="document_chunks")
    op.drop_table("document_chunks")

    op.drop_index("ix_documents_status", table_name="documents")
    op.drop_index("ix_documents_academic_year", table_name="documents")
    op.drop_index("ix_documents_program", table_name="documents")
    op.drop_index("ix_documents_department", table_name="documents")
    op.drop_index("ix_documents_source_type", table_name="documents")
    op.drop_table("documents")
