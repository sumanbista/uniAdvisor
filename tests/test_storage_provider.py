import uuid
from pathlib import Path

import pytest

import backend.app.services.document_storage as document_storage
from backend.app.core.config import Settings
from backend.app.services.chunking import create_chunks
from backend.app.services.document_storage import (
    DocumentStorageError,
    InvalidStorageProviderError,
    LocalStorageProvider,
    SupabaseStorageProvider,
    create_storage_provider,
)
from backend.app.services.text_extraction import extract_to_storage


class StorageSettings(Settings):
    def __init__(
        self,
        root: Path,
        provider: str = "local",
        supabase_url: str | None = None,
        supabase_service_role_key: str | None = None,
        supabase_storage_bucket: str | None = None,
    ) -> None:
        self.database_url = "postgresql+psycopg://example"
        self.document_storage_dir = root / "uploads"
        self.extracted_text_dir = root / "extracted"
        self.storage_provider = provider
        self.supabase_url = supabase_url
        self.supabase_service_role_key = supabase_service_role_key
        self.supabase_storage_bucket = supabase_storage_bucket
        self.allowed_upload_extensions = frozenset({".pdf", ".txt", ".md"})
        self.chunk_size = 1000
        self.chunk_overlap = 200
        self.groq_api_key = None
        self.groq_model = "llama-3.1-8b-instant"
        self.cors_origins = ("http://localhost:3000",)


class FakeSupabaseBucket:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.uploads: list[tuple[str, bytes, dict[str, str]]] = []
        self.removed: list[str] = []
        self.fail_upload = False

    def upload(self, path: str, file: bytes, file_options: dict[str, str]) -> dict[str, str]:
        if self.fail_upload:
            return {"error": {"message": "bucket upload failed"}}
        self.uploads.append((path, file, file_options))
        self.objects[path] = file
        return {"path": path}

    def download(self, path: str) -> bytes:
        if path not in self.objects:
            raise RuntimeError("not found")
        return self.objects[path]

    def remove(self, paths: list[str]) -> dict[str, list[str]]:
        self.removed.extend(paths)
        for path in paths:
            self.objects.pop(path, None)
        return {"removed": paths}


class FakeSupabaseStorage:
    def __init__(self, bucket: FakeSupabaseBucket) -> None:
        self.bucket = bucket
        self.bucket_names: list[str] = []

    def from_(self, bucket_name: str) -> FakeSupabaseBucket:
        self.bucket_names.append(bucket_name)
        return self.bucket


class FakeSupabaseClient:
    def __init__(self, bucket: FakeSupabaseBucket | None = None) -> None:
        self.bucket = bucket or FakeSupabaseBucket()
        self.storage = FakeSupabaseStorage(self.bucket)


def test_provider_resolves_local_by_default(tmp_path: Path) -> None:
    provider = create_storage_provider(StorageSettings(tmp_path))

    assert isinstance(provider, LocalStorageProvider)


def test_local_provider_saves_and_reads_uploaded_files(tmp_path: Path) -> None:
    document_id = uuid.uuid4()
    provider = LocalStorageProvider(tmp_path / "uploads", tmp_path / "extracted")

    file_path = provider.save_uploaded_file(
        document_id,
        "../CS Major Checksheet!.txt",
        b"Major requirements",
    )

    expected_path = tmp_path / "uploads" / str(document_id) / "CS_Major_Checksheet_.txt"
    assert file_path == str(expected_path)
    assert provider.read_uploaded_file(file_path) == b"Major requirements"


def test_local_provider_saves_and_reads_extracted_text(tmp_path: Path) -> None:
    document_id = uuid.uuid4()
    provider = LocalStorageProvider(tmp_path / "uploads", tmp_path / "extracted")

    file_path = provider.save_extracted_text(document_id, "Core CS courses\n")

    assert file_path == str(tmp_path / "extracted" / f"{document_id}.txt")
    assert provider.read_extracted_text(document_id) == "Core CS courses\n"


def test_local_provider_rejects_missing_uploaded_file(tmp_path: Path) -> None:
    provider = LocalStorageProvider(tmp_path / "uploads", tmp_path / "extracted")

    with pytest.raises(DocumentStorageError, match="Stored file was not found"):
        provider.read_uploaded_file(str(tmp_path / "missing.txt"))


def test_invalid_storage_provider_config_fails_clearly(tmp_path: Path) -> None:
    settings = StorageSettings(tmp_path, provider="unsupported")

    with pytest.raises(InvalidStorageProviderError, match="Unsupported storage provider: unsupported"):
        create_storage_provider(settings)


def test_provider_resolves_supabase_when_configured(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    fake_client = FakeSupabaseClient()
    monkeypatch.setattr(document_storage, "_create_supabase_client", lambda url, key: fake_client)
    settings = StorageSettings(
        tmp_path,
        provider="supabase",
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="service-role-key",
        supabase_storage_bucket="uniadvisor-documents",
    )

    provider = create_storage_provider(settings)

    assert isinstance(provider, SupabaseStorageProvider)
    assert provider.client is fake_client
    assert provider.bucket_name == "uniadvisor-documents"


@pytest.mark.parametrize(
    ("missing_field", "message"),
    [
        ("supabase_url", "SUPABASE_URL is required"),
        ("supabase_service_role_key", "SUPABASE_SERVICE_ROLE_KEY is required"),
        ("supabase_storage_bucket", "SUPABASE_STORAGE_BUCKET is required"),
    ],
)
def test_missing_supabase_env_vars_fail_clearly(
    tmp_path: Path,
    missing_field: str,
    message: str,
) -> None:
    values = {
        "supabase_url": "https://example.supabase.co",
        "supabase_service_role_key": "service-role-key",
        "supabase_storage_bucket": "uniadvisor-documents",
    }
    values[missing_field] = None
    settings = StorageSettings(tmp_path, provider="supabase", **values)

    with pytest.raises(InvalidStorageProviderError, match=message):
        create_storage_provider(settings)


def test_supabase_provider_uploads_and_downloads_uploaded_files() -> None:
    document_id = uuid.uuid4()
    fake_client = FakeSupabaseClient()
    provider = SupabaseStorageProvider(fake_client, "uniadvisor-documents")

    file_path = provider.save_uploaded_file(document_id, "../Major Plan!.txt", b"Plan text")

    assert file_path == f"uploads/{document_id}/Major_Plan_.txt"
    assert provider.read_uploaded_file(file_path) == b"Plan text"
    assert fake_client.storage.bucket_names == ["uniadvisor-documents", "uniadvisor-documents"]
    assert fake_client.bucket.uploads[0][2]["upsert"] == "true"


def test_supabase_provider_uploads_and_downloads_extracted_text() -> None:
    document_id = uuid.uuid4()
    fake_client = FakeSupabaseClient()
    provider = SupabaseStorageProvider(fake_client, "uniadvisor-documents")

    file_path = provider.save_extracted_text(document_id, "Core CS courses\n")

    assert file_path == f"extracted/{document_id}.txt"
    assert provider.read_extracted_text(document_id) == "Core CS courses\n"


def test_supabase_provider_fails_clearly_when_upload_fails() -> None:
    fake_bucket = FakeSupabaseBucket()
    fake_bucket.fail_upload = True
    provider = SupabaseStorageProvider(FakeSupabaseClient(fake_bucket), "uniadvisor-documents")

    with pytest.raises(DocumentStorageError, match="Supabase Storage upload failed"):
        provider.save_uploaded_file(uuid.uuid4(), "plan.txt", b"Plan text")


def test_extract_and_chunk_services_can_use_supabase_provider() -> None:
    document_id = uuid.uuid4()
    provider = SupabaseStorageProvider(FakeSupabaseClient(), "uniadvisor-documents")
    uploaded_path = provider.save_uploaded_file(
        document_id,
        "cs_plan.txt",
        b"Second Semester\nStudents should take CS 196 and MA 140.",
    )

    extracted_path, character_count = extract_to_storage(uploaded_path, provider, document_id)
    chunks = create_chunks(provider.read_extracted_text(document_id))

    assert extracted_path == f"extracted/{document_id}.txt"
    assert character_count == len("Second Semester\nStudents should take CS 196 and MA 140.")
    assert len(chunks) == 1
    assert "CS 196" in chunks[0].text
