import math
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from backend.app.db.models import Document, DocumentChunk, DocumentStatus
from backend.app.schemas.rag import DEFAULT_DEPARTMENT, DEFAULT_PROGRAM, RagSearchResult
from backend.app.services.embeddings import EMBEDDING_DIMENSIONS, EmbeddingError, EmbeddingProvider


@dataclass(frozen=True)
class SearchFilters:
    department: str = DEFAULT_DEPARTMENT
    program: str = DEFAULT_PROGRAM
    source_type: str | None = None
    academic_year: str | None = None
    document_id: uuid.UUID | None = None


def normalize_filters(filters: dict[str, Any]) -> SearchFilters:
    clean_filters = {key: value for key, value in filters.items() if value not in ("", None)}
    document_id = clean_filters.get("document_id")
    if document_id:
        document_id = uuid.UUID(str(document_id))

    return SearchFilters(
        department=str(clean_filters.get("department", DEFAULT_DEPARTMENT)),
        program=str(clean_filters.get("program", DEFAULT_PROGRAM)),
        source_type=clean_filters.get("source_type"),
        academic_year=clean_filters.get("academic_year"),
        document_id=document_id,
    )


def search_chunks(
    db: Session,
    query: str,
    filters: dict[str, Any],
    top_k: int,
    embedding_provider: EmbeddingProvider,
) -> list[RagSearchResult]:
    query_embedding = embedding_provider.embed(query)
    if len(query_embedding) != EMBEDDING_DIMENSIONS:
        raise EmbeddingError(
            f"Embedding provider returned {len(query_embedding)} dimensions; expected {EMBEDDING_DIMENSIONS}"
        )

    normalized_filters = normalize_filters(filters)
    if hasattr(db, "chunks"):
        return _search_in_memory(db, query_embedding, normalized_filters, top_k)

    return _search_pgvector(db, query_embedding, normalized_filters, top_k)


def _base_statement(query_embedding: list[float], filters: SearchFilters) -> Select:
    distance = DocumentChunk.embedding.op("<=>")(query_embedding).label("distance")
    statement = (
        select(DocumentChunk, Document.title.label("document_title"), distance)
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(Document.status != DocumentStatus.archived.value)
        .where(DocumentChunk.department == filters.department)
        .where(DocumentChunk.program == filters.program)
        .order_by(distance)
    )

    if filters.source_type:
        statement = statement.where(DocumentChunk.source_type == filters.source_type)
    if filters.academic_year:
        statement = statement.where(DocumentChunk.academic_year == filters.academic_year)
    if filters.document_id:
        statement = statement.where(DocumentChunk.document_id == filters.document_id)

    return statement


def _search_pgvector(
    db: Session,
    query_embedding: list[float],
    filters: SearchFilters,
    top_k: int,
) -> list[RagSearchResult]:
    statement = _base_statement(query_embedding, filters).limit(top_k)
    rows = db.execute(statement).all()
    return [
        _result_from_chunk(chunk=row[0], document_title=row[1], distance=float(row[2]))
        for row in rows
    ]


def _search_in_memory(
    db: Any,
    query_embedding: list[float],
    filters: SearchFilters,
    top_k: int,
) -> list[RagSearchResult]:
    rows = []
    documents = getattr(db, "documents", {})
    for chunk in getattr(db, "chunks", []):
        document = documents.get(chunk.document_id)
        if document is None or document.status == DocumentStatus.archived.value:
            continue
        if chunk.department != filters.department or chunk.program != filters.program:
            continue
        if filters.source_type and chunk.source_type != filters.source_type:
            continue
        if filters.academic_year and chunk.academic_year != filters.academic_year:
            continue
        if filters.document_id and chunk.document_id != filters.document_id:
            continue
        rows.append((chunk, document.title, _cosine_distance(query_embedding, chunk.embedding)))

    rows.sort(key=lambda row: row[2])
    return [_result_from_chunk(chunk, document_title, distance) for chunk, document_title, distance in rows[:top_k]]


def _cosine_distance(left: list[float], right: list[float]) -> float:
    dot = sum(left_value * right_value for left_value, right_value in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 1.0
    return 1.0 - (dot / (left_norm * right_norm))


def _result_from_chunk(chunk: DocumentChunk, document_title: str, distance: float) -> RagSearchResult:
    return RagSearchResult(
        chunk_id=chunk.id,
        document_id=chunk.document_id,
        document_title=document_title,
        text=chunk.text,
        score=max(0.0, min(1.0, 1.0 - distance)),
        page_number=chunk.page_number,
        section_title=chunk.section_title,
        source_type=chunk.source_type,
        department=chunk.department,
        program=chunk.program,
        academic_year=chunk.academic_year,
    )
