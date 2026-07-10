import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.api.documents import get_embedding_provider_factory
from backend.app.core.config import Settings, get_settings
from backend.app.db.models import Document, DocumentChunk, DocumentStatus
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.embeddings import EMBEDDING_DIMENSIONS, EmbeddingError


class DeterministicEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [[float((index + len(text)) % 11) for index in range(EMBEDDING_DIMENSIONS)] for text in texts]


class FailingEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        raise EmbeddingError("Embedding generation failed")

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        raise EmbeddingError("Embedding generation failed")


class FakeSession:
    def __init__(self) -> None:
        self.documents: dict[uuid.UUID, Document] = {}
        self.chunks: list[DocumentChunk] = []
        self.rollback_called = False

    def add(self, item: object) -> None:
        if isinstance(item, Document):
            self.documents[item.id] = item
        elif isinstance(item, DocumentChunk):
            self.chunks.append(item)

    def add_all(self, items: list[DocumentChunk]) -> None:
        self.chunks.extend(items)

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
        self.groq_model = "llama-3.1-8b-instant"


@pytest.fixture()
def fake_session() -> FakeSession:
    return FakeSession()


@pytest.fixture()
def client(tmp_path: Path, fake_session: FakeSession) -> TestClient:
    settings = LocalSettings(tmp_path)

    def override_db() -> FakeSession:
        return fake_session

    def override_settings() -> LocalSettings:
        return settings

    def override_embedding_provider() -> DeterministicEmbeddingProvider:
        return DeterministicEmbeddingProvider()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = override_settings
    app.dependency_overrides[get_embedding_provider_factory] = lambda: override_embedding_provider
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def make_document(document_id: uuid.UUID, file_path: str, status: str = DocumentStatus.uploaded.value) -> Document:
    return Document(
        id=document_id,
        title="CS Advising Source",
        file_name="source.txt",
        file_path=file_path,
        source_type="department_advising",
        department="Computer Science",
        program="Computer Science",
        academic_year="2025-2026",
        status=status,
    )


def test_process_endpoint_extracts_indexes_and_marks_document_ready(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    source = tmp_path / "source.txt"
    source.write_text("Requirements\nStudents take CS 101 and MA 140.", encoding="utf-8")
    fake_session.documents[document_id] = make_document(document_id, str(source))

    response = client.post(f"/documents/{document_id}/process")

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        "document_id": str(document_id),
        "status": "ready",
        "message": "Document processed and indexed.",
        "extracted_text_path": str(tmp_path / "extracted" / f"{document_id}.txt"),
        "chunk_count": 1,
    }
    assert fake_session.documents[document_id].status == "ready"
    assert fake_session.documents[document_id].error_message is None
    assert len(fake_session.chunks) == 1
    assert fake_session.chunks[0].document_id == document_id


def test_process_endpoint_returns_not_found_for_missing_document(client: TestClient) -> None:
    response = client.post(f"/documents/{uuid.uuid4()}/process")

    assert response.status_code == 404
    assert response.json()["detail"] == "Document not found"


def test_process_endpoint_marks_document_failed_when_extraction_fails(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    fake_session.documents[document_id] = make_document(document_id, str(tmp_path / "missing.txt"))

    response = client.post(f"/documents/{document_id}/process")

    assert response.status_code == 400
    assert response.json()["detail"] == "Stored file was not found"
    assert fake_session.documents[document_id].status == "failed"
    assert fake_session.documents[document_id].error_message == "Stored file was not found"
    assert fake_session.chunks == []


def test_process_endpoint_marks_failed_and_preserves_existing_chunks_when_embedding_fails(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    source = tmp_path / "source.txt"
    source.write_text("Requirements\nStudents take CS 101.", encoding="utf-8")
    fake_session.documents[document_id] = make_document(document_id, str(source), status=DocumentStatus.ready.value)
    old_chunk = DocumentChunk(
        document_id=document_id,
        chunk_index=0,
        text="previous evidence",
        embedding=[0.0] * EMBEDDING_DIMENSIONS,
        source_type="department_advising",
        department="Computer Science",
        program="Computer Science",
        content_hash="old",
    )
    fake_session.chunks.append(old_chunk)

    def override_embedding_provider() -> FailingEmbeddingProvider:
        return FailingEmbeddingProvider()

    app.dependency_overrides[get_embedding_provider_factory] = lambda: override_embedding_provider
    response = client.post(f"/documents/{document_id}/process")

    assert response.status_code == 400
    assert response.json()["detail"] == "Embedding generation failed"
    assert fake_session.rollback_called is True
    assert fake_session.documents[document_id].status == "failed"
    assert fake_session.documents[document_id].error_message == "Embedding generation failed"
    assert fake_session.chunks == [old_chunk]


def test_process_endpoint_marks_failed_when_embedding_provider_configuration_fails(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    source = tmp_path / "source.txt"
    source.write_text("Requirements\nStudents take CS 101.", encoding="utf-8")
    fake_session.documents[document_id] = make_document(document_id, str(source))

    def raise_provider_configuration_error() -> DeterministicEmbeddingProvider:
        raise EmbeddingError(
            "EMBEDDING_FALLBACK_PROVIDER is only supported as 'huggingface' when EMBEDDING_PROVIDER=gemini"
        )

    app.dependency_overrides[get_embedding_provider_factory] = lambda: raise_provider_configuration_error
    response = client.post(f"/documents/{document_id}/process")

    assert response.status_code == 400
    assert (
        response.json()["detail"]
        == "EMBEDDING_FALLBACK_PROVIDER is only supported as 'huggingface' when EMBEDDING_PROVIDER=gemini"
    )
    assert fake_session.documents[document_id].status == "failed"
    assert (
        fake_session.documents[document_id].error_message
        == "EMBEDDING_FALLBACK_PROVIDER is only supported as 'huggingface' when EMBEDDING_PROVIDER=gemini"
    )


def test_existing_extract_and_chunk_endpoints_still_work_with_shared_processing_helpers(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    source = tmp_path / "source.txt"
    source.write_text("Plan Overview\nStudents complete CS courses.", encoding="utf-8")
    fake_session.documents[document_id] = make_document(document_id, str(source))

    extract_response = client.post(f"/documents/{document_id}/extract")
    assert extract_response.status_code == 200
    assert extract_response.json()["status"] == "ready"

    chunk_response = client.post(f"/documents/{document_id}/chunk")
    assert chunk_response.status_code == 200
    assert chunk_response.json() == {
        "document_id": str(document_id),
        "chunks_created": 1,
        "status": "ready",
    }
    assert len(fake_session.chunks) == 1
