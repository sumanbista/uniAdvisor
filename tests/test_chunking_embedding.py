import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import Settings, get_settings
from backend.app.db.models import Document, DocumentChunk, DocumentStatus
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.chunking import (
    ChunkingError,
    create_chunks,
    read_extracted_text,
    replace_document_chunks,
)
from backend.app.services.embeddings import EMBEDDING_DIMENSIONS, get_embedding_provider


class DeterministicEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [[float((index + len(text)) % 7) for index in range(EMBEDDING_DIMENSIONS)] for text in texts]


class FailingEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        raise RuntimeError("Embedding generation failed")

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        raise RuntimeError("Embedding generation failed")


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
    app.dependency_overrides[get_embedding_provider] = override_embedding_provider
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def document_fixture(document_id: uuid.UUID) -> Document:
    return Document(
        id=document_id,
        title="CS Plan",
        file_name="cs_plan.txt",
        file_path="backend/storage/documents/cs_plan.txt",
        source_type="four_year_plan",
        department="Computer Science",
        program="Computer Science",
        academic_year="2025-2026",
        status=DocumentStatus.ready.value,
    )


def test_create_chunks_preserves_order_page_numbers_and_headings() -> None:
    text = """--- Page 1 ---
Major Requirements
Students complete core CS courses and math courses.

--- Page 2 ---
Electives
Students choose approved CS electives.
"""

    chunks = create_chunks(text, chunk_size=80, overlap=20)

    assert [chunk.chunk_index for chunk in chunks] == list(range(len(chunks)))
    assert {chunk.page_number for chunk in chunks} == {1, 2}
    assert chunks[0].section_title == "Major Requirements"
    assert chunks[-1].section_title == "Electives"
    assert all(chunk.text.strip() for chunk in chunks)
    assert all(len(chunk.content_hash) == 64 for chunk in chunks)


def test_create_chunks_skips_empty_and_duplicate_chunks() -> None:
    text = """--- Page 1 ---
Same useful content.

--- Page 2 ---
Same useful content.

--- Page 3 ---

"""

    chunks = create_chunks(text)

    assert len(chunks) == 1
    assert chunks[0].text == "Same useful content."


def test_read_extracted_text_requires_existing_non_empty_file(tmp_path: Path) -> None:
    with pytest.raises(ChunkingError, match="not found"):
        read_extracted_text(tmp_path, uuid.uuid4())

    document_id = uuid.uuid4()
    extracted = tmp_path / f"{document_id}.txt"
    extracted.write_text("\n\n", encoding="utf-8")

    with pytest.raises(ChunkingError, match="empty"):
        read_extracted_text(tmp_path, document_id)


def test_replace_document_chunks_stores_metadata_embeddings_and_replaces_old_chunks() -> None:
    document_id = uuid.uuid4()
    document = document_fixture(document_id)
    fake_session = FakeSession()
    fake_session.chunks.append(
        DocumentChunk(
            document_id=document_id,
            chunk_index=0,
            text="old",
            embedding=[0.0] * EMBEDDING_DIMENSIONS,
            source_type="four_year_plan",
            department="Computer Science",
            program="Computer Science",
            content_hash="old",
        )
    )

    created = replace_document_chunks(
        fake_session,
        document,
        "--- Page 3 ---\nPlan Overview\nStudents complete CS courses.",
        DeterministicEmbeddingProvider(),
    )

    assert created == 1
    assert len(fake_session.chunks) == 1
    chunk = fake_session.chunks[0]
    assert chunk.document_id == document_id
    assert chunk.chunk_index == 0
    assert chunk.page_number == 3
    assert chunk.section_title == "Plan Overview"
    assert chunk.source_type == "four_year_plan"
    assert chunk.academic_year == "2025-2026"
    assert len(chunk.embedding) == EMBEDDING_DIMENSIONS
    assert chunk.content_hash != "old"


def test_chunk_endpoint_updates_document_status_and_stores_chunks(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    fake_session.documents[document_id] = document_fixture(document_id)
    extracted_dir = tmp_path / "extracted"
    extracted_dir.mkdir()
    (extracted_dir / f"{document_id}.txt").write_text(
        "--- Page 1 ---\nRequirements\nStudents take CS 101.",
        encoding="utf-8",
    )

    response = client.post(f"/documents/{document_id}/chunk")

    assert response.status_code == 200
    assert response.json() == {
        "document_id": str(document_id),
        "chunks_created": 1,
        "status": "ready",
    }
    assert fake_session.documents[document_id].status == "ready"
    assert len(fake_session.chunks) == 1
    assert fake_session.chunks[0].page_number == 1


def test_chunk_endpoint_marks_document_failed_when_extracted_text_is_missing(
    client: TestClient,
    fake_session: FakeSession,
) -> None:
    document_id = uuid.uuid4()
    fake_session.documents[document_id] = document_fixture(document_id)

    response = client.post(f"/documents/{document_id}/chunk")

    assert response.status_code == 400
    assert response.json()["detail"] == "Extracted text file was not found"
    assert fake_session.documents[document_id].status == "failed"
    assert fake_session.documents[document_id].error_message == "Extracted text file was not found"


def test_real_embedding_provider_returns_384_dimensions_when_model_is_available() -> None:
    try:
        from backend.app.services.embeddings import SentenceTransformerEmbeddingProvider
    except ImportError:
        pytest.skip("sentence-transformers is not installed")

    provider = SentenceTransformerEmbeddingProvider()
    try:
        embedding = provider.embed("Computer Science major requirements")
    except Exception as exc:
        pytest.skip(f"embedding model is not available locally: {exc}")

    assert len(embedding) == EMBEDDING_DIMENSIONS
