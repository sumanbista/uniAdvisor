from sqlalchemy import CheckConstraint, ForeignKeyConstraint, Index

from backend.app.db.models import Document, DocumentChunk, RagFeedback, RagQuery
from backend.app.db.types import Vector


def column_names(model: type) -> set[str]:
    return set(model.__table__.columns.keys())


def index_names(model: type) -> set[str]:
    return {idx.name for idx in model.__table__.indexes}


def check_names(model: type) -> set[str]:
    return {
        constraint.name
        for constraint in model.__table__.constraints
        if isinstance(constraint, CheckConstraint)
    }


def test_documents_schema_matches_phase1_spec() -> None:
    assert column_names(Document) == {
        "id",
        "title",
        "file_name",
        "file_path",
        "source_type",
        "department",
        "program",
        "academic_year",
        "status",
        "uploaded_by",
        "error_message",
        "created_at",
        "updated_at",
    }
    assert Document.__table__.c.department.default.arg == "Computer Science"
    assert Document.__table__.c.program.default.arg == "Computer Science"
    assert Document.__table__.c.status.default.arg == "uploaded"
    assert {
        "ix_documents_source_type",
        "ix_documents_department",
        "ix_documents_program",
        "ix_documents_academic_year",
        "ix_documents_status",
    }.issubset(index_names(Document))
    assert {"ck_documents_source_type", "ck_documents_status"}.issubset(check_names(Document))


def test_document_chunks_schema_matches_phase1_spec() -> None:
    assert column_names(DocumentChunk) == {
        "id",
        "document_id",
        "chunk_index",
        "text",
        "embedding",
        "page_number",
        "section_title",
        "source_type",
        "department",
        "program",
        "academic_year",
        "token_count",
        "content_hash",
        "created_at",
    }
    assert isinstance(DocumentChunk.__table__.c.embedding.type, Vector)
    assert DocumentChunk.__table__.c.embedding.type.dimensions == 384
    assert {
        "ix_document_chunks_document_id",
        "ix_document_chunks_source_type",
        "ix_document_chunks_department",
        "ix_document_chunks_program",
        "ix_document_chunks_academic_year",
        "ix_document_chunks_content_hash",
        "ix_document_chunks_embedding",
    }.issubset(index_names(DocumentChunk))


def test_rag_queries_schema_matches_phase1_spec() -> None:
    assert column_names(RagQuery) == {
        "id",
        "user_question",
        "normalized_question",
        "answer",
        "confidence",
        "retrieved_chunk_ids",
        "source_count",
        "refused",
        "refusal_reason",
        "created_at",
    }
    assert {
        "ix_rag_queries_created_at",
        "ix_rag_queries_confidence",
        "ix_rag_queries_refused",
    }.issubset(index_names(RagQuery))
    assert "ck_rag_queries_confidence" in check_names(RagQuery)


def test_rag_feedback_schema_matches_phase1_spec() -> None:
    assert column_names(RagFeedback) == {
        "id",
        "query_id",
        "rating",
        "feedback_text",
        "created_at",
    }
    assert {"ix_rag_feedback_query_id", "ix_rag_feedback_rating"}.issubset(index_names(RagFeedback))
    assert "ck_rag_feedback_rating" in check_names(RagFeedback)


def test_foreign_keys_cascade_for_dependent_rows() -> None:
    chunk_fk = next(
        constraint
        for constraint in DocumentChunk.__table__.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    )
    feedback_fk = next(
        constraint
        for constraint in RagFeedback.__table__.constraints
        if isinstance(constraint, ForeignKeyConstraint)
    )

    assert chunk_fk.ondelete == "CASCADE"
    assert feedback_fk.ondelete == "CASCADE"
