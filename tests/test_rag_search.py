import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from backend.app.db.models import Document, DocumentChunk, DocumentStatus
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.embeddings import EMBEDDING_DIMENSIONS, get_embedding_provider
from tests.route_helpers import route_paths


class DeterministicEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        vector = [0.0] * EMBEDDING_DIMENSIONS
        normalized = text.lower()
        if "math" in normalized:
            vector[0] = 1.0
        elif "systems" in normalized:
            vector[1] = 1.0
        else:
            vector[2] = 1.0
        return vector

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(text) for text in texts]


class FakeSession:
    def __init__(self) -> None:
        self.documents: dict[uuid.UUID, Document] = {}
        self.chunks: list[DocumentChunk] = []


class FailingDatabaseSession:
    def execute(self, statement: object) -> object:
        raise SQLAlchemyError("pgvector query failed")


@pytest.fixture()
def fake_session() -> FakeSession:
    session = FakeSession()

    ready_doc = add_document(
        session,
        title="CS Major Checksheet",
        source_type="major_checksheet",
        academic_year="2025-2026",
    )
    plan_doc = add_document(
        session,
        title="CS Four Year Plan",
        source_type="four_year_plan",
        academic_year="2024-2025",
    )
    other_program_doc = add_document(
        session,
        title="Math Program Guide",
        source_type="major_checksheet",
        department="Mathematics",
        program="Mathematics",
        academic_year="2025-2026",
    )
    archived_doc = add_document(
        session,
        title="Archived CS Checksheet",
        source_type="major_checksheet",
        academic_year="2025-2026",
        status=DocumentStatus.archived.value,
    )

    add_chunk(
        session,
        ready_doc,
        text="Computer Science students complete Calculus I and Discrete Math.",
        embedding_axis=0,
        page_number=2,
        section_title="Major Requirements",
    )
    add_chunk(
        session,
        ready_doc,
        text="Computer Science students complete Systems Programming.",
        embedding_axis=1,
        page_number=3,
        section_title="Core Courses",
    )
    add_chunk(
        session,
        plan_doc,
        text="The four year plan places math in the first year.",
        embedding_axis=0,
        source_type="four_year_plan",
        academic_year="2024-2025",
    )
    add_chunk(
        session,
        other_program_doc,
        text="Mathematics majors complete advanced calculus.",
        embedding_axis=0,
        department="Mathematics",
        program="Mathematics",
    )
    add_chunk(
        session,
        archived_doc,
        text="Archived checksheet math requirements should not be returned.",
        embedding_axis=0,
    )

    return session


@pytest.fixture()
def client(fake_session: FakeSession) -> TestClient:
    def override_db() -> FakeSession:
        return fake_session

    def override_embedding_provider() -> DeterministicEmbeddingProvider:
        return DeterministicEmbeddingProvider()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_embedding_provider] = override_embedding_provider
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def add_document(
    session: FakeSession,
    title: str,
    source_type: str,
    department: str = "Computer Science",
    program: str = "Computer Science",
    academic_year: str = "2025-2026",
    status: str = DocumentStatus.ready.value,
) -> Document:
    document = Document(
        id=uuid.uuid4(),
        title=title,
        file_name=f"{title}.txt",
        file_path=f"backend/storage/documents/{title}.txt",
        source_type=source_type,
        department=department,
        program=program,
        academic_year=academic_year,
        status=status,
    )
    session.documents[document.id] = document
    return document


def add_chunk(
    session: FakeSession,
    document: Document,
    text: str,
    embedding_axis: int,
    source_type: str | None = None,
    department: str | None = None,
    program: str | None = None,
    academic_year: str | None = None,
    page_number: int | None = None,
    section_title: str | None = None,
) -> DocumentChunk:
    embedding = [0.0] * EMBEDDING_DIMENSIONS
    embedding[embedding_axis] = 1.0
    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=document.id,
        chunk_index=len(session.chunks),
        text=text,
        embedding=embedding,
        page_number=page_number,
        section_title=section_title,
        source_type=source_type or document.source_type,
        department=department or document.department,
        program=program or document.program,
        academic_year=academic_year or document.academic_year,
        content_hash=uuid.uuid4().hex,
    )
    session.chunks.append(chunk)
    return chunk


def test_rag_search_endpoint_is_registered() -> None:
    assert "/rag/search" in route_paths(app)


def test_search_returns_ranked_chunks_with_source_metadata(client: TestClient) -> None:
    response = client.post(
        "/rag/search",
        json={
            "query": "What math courses are required?",
            "filters": {"source_type": "major_checksheet"},
            "top_k": 2,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["query"] == "What math courses are required?"
    assert [result["text"] for result in payload["results"]] == [
        "Computer Science students complete Calculus I and Discrete Math.",
        "Computer Science students complete Systems Programming.",
    ]
    first = payload["results"][0]
    assert first["document_title"] == "CS Major Checksheet"
    assert first["score"] == 1.0
    assert first["page_number"] == 2
    assert first["section_title"] == "Major Requirements"
    assert first["source_type"] == "major_checksheet"
    assert first["department"] == "Computer Science"
    assert first["program"] == "Computer Science"
    assert first["academic_year"] == "2025-2026"


def test_search_applies_default_computer_science_filters(client: TestClient) -> None:
    response = client.post("/rag/search", json={"query": "math requirements", "top_k": 5})

    assert response.status_code == 200
    assert all(result["department"] == "Computer Science" for result in response.json()["results"])
    assert all(result["program"] == "Computer Science" for result in response.json()["results"])
    assert "Mathematics majors complete advanced calculus." not in {
        result["text"] for result in response.json()["results"]
    }


def test_search_filters_by_source_type(client: TestClient) -> None:
    response = client.post(
        "/rag/search",
        json={"query": "math requirements", "filters": {"source_type": "four_year_plan"}},
    )

    assert response.status_code == 200
    assert [result["source_type"] for result in response.json()["results"]] == ["four_year_plan"]


def test_search_filters_by_academic_year(client: TestClient) -> None:
    response = client.post(
        "/rag/search",
        json={"query": "math requirements", "filters": {"academic_year": "2024-2025"}},
    )

    assert response.status_code == 200
    assert [result["academic_year"] for result in response.json()["results"]] == ["2024-2025"]


def test_search_filters_by_document_id(client: TestClient, fake_session: FakeSession) -> None:
    document_id = next(
        document.id for document in fake_session.documents.values() if document.title == "CS Four Year Plan"
    )

    response = client.post(
        "/rag/search",
        json={"query": "math requirements", "filters": {"document_id": str(document_id)}},
    )

    assert response.status_code == 200
    assert {result["document_id"] for result in response.json()["results"]} == {str(document_id)}


def test_search_ignores_empty_filter_values(client: TestClient) -> None:
    response = client.post(
        "/rag/search",
        json={"query": "math requirements", "filters": {"academic_year": ""}},
    )

    assert response.status_code == 200
    assert len(response.json()["results"]) == 3


def test_search_rejects_unsupported_filters(client: TestClient) -> None:
    response = client.post(
        "/rag/search",
        json={"query": "math requirements", "filters": {"campus": "main"}},
    )

    assert response.status_code == 400
    assert "Unsupported filters" in str(response.json()["detail"])


def test_search_rejects_invalid_document_id_filter(client: TestClient) -> None:
    response = client.post(
        "/rag/search",
        json={"query": "math requirements", "filters": {"document_id": "not-a-uuid"}},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid document_id filter"


def test_search_returns_empty_results_when_no_chunks_match(client: TestClient) -> None:
    response = client.post(
        "/rag/search",
        json={"query": "math requirements", "filters": {"academic_year": "2030-2031"}},
    )

    assert response.status_code == 200
    assert response.json() == {"query": "math requirements", "results": []}


def test_search_excludes_archived_documents(client: TestClient) -> None:
    response = client.post("/rag/search", json={"query": "math requirements", "top_k": 10})

    assert response.status_code == 200
    assert "Archived checksheet math requirements should not be returned." not in {
        result["text"] for result in response.json()["results"]
    }


def test_search_validates_top_k(client: TestClient) -> None:
    response = client.post("/rag/search", json={"query": "math requirements", "top_k": 0})

    assert response.status_code == 422
    assert "top_k" in str(response.json()["detail"])


def test_search_returns_sanitized_503_when_database_query_fails() -> None:
    def override_db() -> FailingDatabaseSession:
        return FailingDatabaseSession()

    def override_embedding_provider() -> DeterministicEmbeddingProvider:
        return DeterministicEmbeddingProvider()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_embedding_provider] = override_embedding_provider
    try:
        with TestClient(app) as test_client:
            response = test_client.post("/rag/search", json={"query": "math requirements"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json()["detail"] == "Advising data is unavailable. Please try again."
