import uuid

import pytest
from fastapi.testclient import TestClient

from backend.app.db.models import Document, DocumentChunk, DocumentStatus, RagQuery
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.embeddings import EMBEDDING_DIMENSIONS, get_embedding_provider
from backend.app.services.llm import get_llm_provider
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


class FakeLLMProvider:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return "The uploaded documents say CS students complete Calculus I and Discrete Math. [Source 1]"


class FakeSession:
    def __init__(self) -> None:
        self.documents: dict[uuid.UUID, Document] = {}
        self.chunks: list[DocumentChunk] = []
        self.logs: list[RagQuery] = []
        self.commit_count = 0

    def add(self, item: object) -> None:
        if isinstance(item, RagQuery):
            self.logs.append(item)

    def commit(self) -> None:
        self.commit_count += 1


@pytest.fixture()
def fake_llm() -> FakeLLMProvider:
    return FakeLLMProvider()


@pytest.fixture()
def fake_session() -> FakeSession:
    session = FakeSession()
    document = Document(
        id=uuid.uuid4(),
        title="CS Major Checksheet",
        file_name="cs-major.txt",
        file_path="backend/storage/documents/cs-major.txt",
        source_type="major_checksheet",
        department="Computer Science",
        program="Computer Science",
        academic_year="2025-2026",
        status=DocumentStatus.ready.value,
    )
    session.documents[document.id] = document
    session.chunks.append(
        DocumentChunk(
            id=uuid.uuid4(),
            document_id=document.id,
            chunk_index=0,
            text="Computer Science students complete Calculus I and Discrete Math.",
            embedding=axis_embedding(0),
            page_number=2,
            section_title="Major Requirements",
            source_type="major_checksheet",
            department="Computer Science",
            program="Computer Science",
            academic_year="2025-2026",
            content_hash=uuid.uuid4().hex,
        )
    )
    session.chunks.append(
        DocumentChunk(
            id=uuid.uuid4(),
            document_id=document.id,
            chunk_index=1,
            text="Students also complete Systems Programming.",
            embedding=axis_embedding(1),
            page_number=3,
            section_title="Core Courses",
            source_type="major_checksheet",
            department="Computer Science",
            program="Computer Science",
            academic_year="2025-2026",
            content_hash=uuid.uuid4().hex,
        )
    )
    return session


@pytest.fixture()
def client(fake_session: FakeSession, fake_llm: FakeLLMProvider) -> TestClient:
    def override_db() -> FakeSession:
        return fake_session

    def override_embedding_provider() -> DeterministicEmbeddingProvider:
        return DeterministicEmbeddingProvider()

    def override_llm_provider() -> FakeLLMProvider:
        return fake_llm

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_embedding_provider] = override_embedding_provider
    app.dependency_overrides[get_llm_provider] = override_llm_provider
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def axis_embedding(axis: int) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSIONS
    vector[axis] = 1.0
    return vector


def test_rag_ask_endpoint_is_registered() -> None:
    assert "/rag/ask" in route_paths(app)


def test_rag_ask_returns_grounded_answer_sources_and_query_log(
    client: TestClient,
    fake_session: FakeSession,
    fake_llm: FakeLLMProvider,
) -> None:
    response = client.post(
        "/rag/ask",
        json={
            "question": "What math courses are required for the Computer Science major?",
            "filters": {"source_type": "major_checksheet"},
            "top_k": 1,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["question"] == "What math courses are required for the Computer Science major?"
    assert payload["answer"] == "The uploaded documents say CS students complete Calculus I and Discrete Math. [Source 1]"
    assert payload["confidence"] == "medium"
    assert payload["confidence_score"] == 100
    assert payload["refused"] is False
    assert payload["advisor_note"] == "This answer is based only on uploaded documents and is not an official degree audit."
    assert payload["sources"] == [
        {
            "source_number": 1,
            "chunk_id": str(fake_session.chunks[0].id),
            "document_id": str(fake_session.chunks[0].document_id),
            "document_title": "CS Major Checksheet",
            "page_number": 2,
            "section_title": "Major Requirements",
            "source_type": "major_checksheet",
        }
    ]
    assert "[Source 1]" in fake_llm.prompts[0]
    assert "Use only provided context" not in fake_llm.prompts[0]
    assert "using only the provided context" in fake_llm.prompts[0]

    assert len(fake_session.logs) == 1
    query_log = fake_session.logs[0]
    assert query_log.user_question == "What math courses are required for the Computer Science major?"
    assert query_log.normalized_question == "what math courses are required for the computer science major?"
    assert query_log.answer == payload["answer"]
    assert query_log.confidence == "medium"
    assert query_log.retrieved_chunk_ids == [fake_session.chunks[0].id]
    assert query_log.source_count == 1
    assert query_log.refused is False
    assert query_log.refusal_reason is None
    assert fake_session.commit_count == 1


def test_rag_ask_refuses_and_logs_when_no_chunks_match(
    client: TestClient,
    fake_session: FakeSession,
    fake_llm: FakeLLMProvider,
) -> None:
    response = client.post(
        "/rag/ask",
        json={
            "question": "What math courses are required?",
            "filters": {"academic_year": "1900-1901"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["refused"] is True
    assert payload["confidence"] == "low"
    assert payload["confidence_score"] == 0
    assert payload["sources"] == []
    assert "I cannot answer this from the uploaded documents" in payload["answer"]
    assert fake_llm.prompts == []
    assert fake_session.logs[0].refused is True
    assert fake_session.logs[0].refusal_reason == "No chunks were retrieved"


def test_rag_ask_refuses_and_logs_weak_evidence(
    client: TestClient,
    fake_session: FakeSession,
    fake_llm: FakeLLMProvider,
) -> None:
    response = client.post(
        "/rag/ask",
        json={
            "question": "Tell me about housing",
            "filters": {"source_type": "major_checksheet"},
            "top_k": 1,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["refused"] is True
    assert payload["confidence"] == "low"
    assert payload["confidence_score"] == 0
    assert len(payload["sources"]) == 1
    assert fake_llm.prompts == []
    assert fake_session.logs[0].refused is True
    assert fake_session.logs[0].refusal_reason == "Retrieved evidence score was below the minimum threshold"


def test_rag_ask_refuses_high_impact_graduation_question(
    client: TestClient,
    fake_session: FakeSession,
    fake_llm: FakeLLMProvider,
) -> None:
    response = client.post(
        "/rag/ask",
        json={"question": "Am I eligible to graduate next semester if I take these classes?"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["refused"] is True
    assert payload["confidence"] == "low"
    assert payload["confidence_score"] == 0
    assert "official degree progress or graduation eligibility requires advisor or registrar review" in payload["answer"]
    assert fake_llm.prompts == []
    assert fake_session.logs[0].refused is True
    assert fake_session.logs[0].refusal_reason == "Question requires official or personalized academic decision logic"


def test_rag_ask_rejects_unsupported_filters(client: TestClient) -> None:
    response = client.post(
        "/rag/ask",
        json={"question": "What math courses are required?", "filters": {"campus": "main"}},
    )

    assert response.status_code == 400
    assert "Unsupported filters" in str(response.json()["detail"])


def test_rag_ask_validates_top_k(client: TestClient) -> None:
    response = client.post("/rag/ask", json={"question": "What math courses are required?", "top_k": 0})

    assert response.status_code == 422
    assert "top_k" in str(response.json()["detail"])
