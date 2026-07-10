import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.api.documents import get_embedding_provider_factory
from backend.app.core.config import DEFAULT_GROQ_MODEL, Settings, get_settings
from backend.app.db.models import Document, DocumentChunk, RagQuery
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.embeddings import EMBEDDING_DIMENSIONS, get_embedding_provider
from backend.app.services.llm import get_llm_provider


class DeterministicEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        vectors = []
        for text in texts:
            vector = [0.0] * EMBEDDING_DIMENSIONS
            vector[0 if "math" in text.lower() or "semester" in text.lower() else 1] = 1.0
            vectors.append(vector)
        return vectors


class FakeLLMProvider:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def generate(self, prompt: str) -> str:
        self.prompts.append(prompt)
        return "For the second semester, the uploaded plan lists CS 196 and MA 140. [Source 1]"


class FakeSession:
    def __init__(self) -> None:
        self.documents: dict[uuid.UUID, Document] = {}
        self.chunks: list[DocumentChunk] = []
        self.logs: list[RagQuery] = []
        self.rollback_called = False

    def add(self, item: object) -> None:
        if isinstance(item, Document):
            self.documents[item.id] = item
        elif isinstance(item, DocumentChunk):
            if item.id is None:
                item.id = uuid.uuid4()
            self.chunks.append(item)
        elif isinstance(item, RagQuery):
            if item.id is None:
                item.id = uuid.uuid4()
            self.logs.append(item)

    def add_all(self, items: list[DocumentChunk]) -> None:
        for item in items:
            self.add(item)

    def execute(self, statement: object) -> None:
        self.chunks = []

    def commit(self) -> None:
        pass

    def rollback(self) -> None:
        self.rollback_called = True

    def refresh(self, document: Document) -> None:
        pass

    def get(self, model: type[Document], document_id: uuid.UUID) -> Document | None:
        return self.documents.get(document_id)


class LocalSettings(Settings):
    def __init__(self, root: Path) -> None:
        self.database_url = "postgresql+psycopg://example"
        self.document_storage_dir = root / "documents"
        self.extracted_text_dir = root / "extracted"
        self.allowed_upload_extensions = frozenset({".pdf", ".txt", ".md"})
        self.chunk_size = 1000
        self.chunk_overlap = 200
        self.groq_api_key = None
        self.groq_model = DEFAULT_GROQ_MODEL


@pytest.fixture()
def fake_session() -> FakeSession:
    return FakeSession()


@pytest.fixture()
def fake_llm() -> FakeLLMProvider:
    return FakeLLMProvider()


@pytest.fixture()
def client(tmp_path: Path, fake_session: FakeSession, fake_llm: FakeLLMProvider) -> TestClient:
    settings = LocalSettings(tmp_path)

    def override_db() -> FakeSession:
        return fake_session

    def override_settings() -> LocalSettings:
        return settings

    def override_embedding_provider() -> DeterministicEmbeddingProvider:
        return DeterministicEmbeddingProvider()

    def override_llm_provider() -> FakeLLMProvider:
        return fake_llm

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = override_settings
    app.dependency_overrides[get_embedding_provider] = override_embedding_provider
    app.dependency_overrides[get_embedding_provider_factory] = lambda: override_embedding_provider
    app.dependency_overrides[get_llm_provider] = override_llm_provider
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_full_phase1_workflow_upload_extract_chunk_search_ask_and_log(
    client: TestClient,
    fake_session: FakeSession,
    fake_llm: FakeLLMProvider,
) -> None:
    upload_response = client.post(
        "/documents/upload",
        data={
            "title": "CS Four Year Plan",
            "source_type": "four_year_plan",
            "academic_year": "2025-2026",
        },
        files={
            "file": (
                "cs_four_year_plan.txt",
                b"Second Semester\nStudents should take CS 196 and MA 140 math.",
                "text/plain",
            )
        },
    )
    assert upload_response.status_code == 201
    document_id = upload_response.json()["id"]

    extract_response = client.post(f"/documents/{document_id}/extract")
    assert extract_response.status_code == 200
    assert extract_response.json()["status"] == "ready"

    chunk_response = client.post(f"/documents/{document_id}/chunk")
    assert chunk_response.status_code == 200
    assert chunk_response.json()["chunks_created"] == 1

    search_response = client.post(
        "/rag/search",
        json={
            "query": "what classes should I take in second semester",
            "filters": {"source_type": "four_year_plan"},
            "top_k": 3,
        },
    )
    assert search_response.status_code == 200
    search_payload = search_response.json()
    assert len(search_payload["results"]) == 1
    assert search_payload["results"][0]["document_id"] == document_id

    ask_response = client.post(
        "/rag/ask",
        json={
            "question": "what classes should I take in second semester",
            "filters": {"source_type": "four_year_plan"},
            "top_k": 3,
        },
    )
    assert ask_response.status_code == 200
    ask_payload = ask_response.json()
    assert ask_payload["refused"] is False
    assert ask_payload["confidence_score"] == 100
    assert ask_payload["sources"][0]["document_id"] == document_id
    assert ask_payload["sources"][0]["source_number"] == 1
    assert "CS 196" in ask_payload["answer"]
    assert "Second Semester" in fake_llm.prompts[0]

    assert len(fake_session.logs) == 1
    assert fake_session.logs[0].user_question == "what classes should I take in second semester"
    assert fake_session.logs[0].source_count == 1
    assert fake_session.logs[0].refused is False
