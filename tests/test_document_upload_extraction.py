import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.api.documents import router
from backend.app.core.config import Settings, get_settings
from backend.app.db.models import Document, DocumentStatus
from backend.app.db.session import get_db
from backend.app.main import app
from backend.app.services.document_storage import DocumentStorageError, safe_filename, save_uploaded_file
from backend.app.services.text_extraction import TextExtractionError, extract_text, extract_to_file


class FakeSession:
    def __init__(self) -> None:
        self.documents: dict[uuid.UUID, Document] = {}

    def add(self, document: Document) -> None:
        self.documents[document.id] = document

    def commit(self) -> None:
        pass

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

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_settings] = override_settings
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_documents_router_is_registered() -> None:
    routes = {route.path for route in router.routes}
    assert "/documents/upload" in routes
    assert "/documents/{document_id}/extract" in routes
    assert "/documents/{document_id}/chunk" in routes
    assert "/documents/{document_id}/process" in routes


def test_safe_filename_removes_path_and_unsafe_characters() -> None:
    assert safe_filename("../CS Major Checksheet!.pdf") == "CS_Major_Checksheet_.pdf"


def test_save_uploaded_file_rejects_unsupported_file_type(tmp_path: Path) -> None:
    with pytest.raises(DocumentStorageError, match="Unsupported file type"):
        save_uploaded_file(
            file_obj=Path(__file__).open("rb"),
            storage_dir=tmp_path,
            document_id=uuid.uuid4(),
            original_file_name="checksheet.docx",
        )


def test_upload_document_saves_file_and_creates_document(client: TestClient, fake_session: FakeSession) -> None:
    response = client.post(
        "/documents/upload",
        data={
            "title": "CS Major Checksheet",
            "source_type": "major_checksheet",
        },
        files={"file": ("cs_major_checksheet.txt", b"Major requirements", "text/plain")},
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["title"] == "CS Major Checksheet"
    assert payload["file_name"] == "cs_major_checksheet.txt"
    assert payload["department"] == "Computer Science"
    assert payload["program"] == "Computer Science"
    assert payload["status"] == "uploaded"

    document_id = uuid.UUID(payload["id"])
    document = fake_session.documents[document_id]
    assert Path(document.file_path).exists()
    assert Path(document.file_path).read_text() == "Major requirements"


def test_upload_document_rejects_bad_extension(client: TestClient) -> None:
    response = client.post(
        "/documents/upload",
        data={"title": "Bad Upload", "source_type": "other"},
        files={"file": ("bad.docx", b"content", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_extract_text_normalizes_plain_text(tmp_path: Path) -> None:
    source = tmp_path / "notes.md"
    source.write_bytes(b"# Heading\r\nLine\x00 two\r\n")

    assert extract_text(source) == "# Heading\nLine two\n"


def test_extract_to_file_writes_output(tmp_path: Path) -> None:
    document_id = uuid.uuid4()
    source = tmp_path / "checksheet.txt"
    source.write_text("Core CS courses\n", encoding="utf-8")

    output_path, character_count = extract_to_file(source, tmp_path / "extracted", document_id)

    assert output_path == tmp_path / "extracted" / f"{document_id}.txt"
    assert output_path.read_text(encoding="utf-8") == "Core CS courses\n"
    assert character_count == len("Core CS courses\n")


def test_extract_endpoint_updates_document_status_and_writes_text(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    source = tmp_path / "source.txt"
    source.write_text("Degree requirements", encoding="utf-8")
    fake_session.documents[document_id] = Document(
        id=document_id,
        title="Degree Requirements",
        file_name="source.txt",
        file_path=str(source),
        source_type="degree_requirements",
        department="Computer Science",
        program="Computer Science",
        status=DocumentStatus.uploaded.value,
    )

    response = client.post(f"/documents/{document_id}/extract")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready"
    assert payload["character_count"] == len("Degree requirements")
    assert Path(payload["extracted_text_path"]).read_text(encoding="utf-8") == "Degree requirements"
    assert fake_session.documents[document_id].status == "ready"


def test_extract_endpoint_marks_document_failed_when_file_missing(
    client: TestClient,
    fake_session: FakeSession,
    tmp_path: Path,
) -> None:
    document_id = uuid.uuid4()
    fake_session.documents[document_id] = Document(
        id=document_id,
        title="Missing File",
        file_name="missing.txt",
        file_path=str(tmp_path / "missing.txt"),
        source_type="other",
        department="Computer Science",
        program="Computer Science",
        status=DocumentStatus.uploaded.value,
    )

    response = client.post(f"/documents/{document_id}/extract")

    assert response.status_code == 400
    assert response.json()["detail"] == "Stored file was not found"
    assert fake_session.documents[document_id].status == "failed"
    assert fake_session.documents[document_id].error_message == "Stored file was not found"


def test_extract_text_rejects_empty_file(tmp_path: Path) -> None:
    source = tmp_path / "empty.txt"
    source.write_text("", encoding="utf-8")

    with pytest.raises(TextExtractionError, match="Stored file is empty"):
        extract_text(source)
