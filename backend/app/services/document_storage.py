import re
import shutil
import uuid
from pathlib import Path
from typing import Any, BinaryIO, Protocol

from fastapi import Depends

from backend.app.core.config import (
    DEFAULT_ALLOWED_UPLOAD_EXTENSIONS,
    SUPPORTED_STORAGE_PROVIDERS,
    Settings,
    get_settings,
)

SUPPORTED_EXTENSIONS = DEFAULT_ALLOWED_UPLOAD_EXTENSIONS


class DocumentStorageError(ValueError):
    pass


class InvalidStorageProviderError(DocumentStorageError):
    pass


class StorageProvider(Protocol):
    def save_uploaded_file(self, document_id: uuid.UUID, filename: str, file_bytes: bytes) -> str:
        ...

    def read_uploaded_file(self, file_path: str) -> bytes:
        ...

    def save_extracted_text(self, document_id: uuid.UUID, text: str) -> str:
        ...

    def read_extracted_text(self, document_id: uuid.UUID) -> str:
        ...

    def delete_document_files(self, document_id: uuid.UUID, file_path: str | None = None) -> None:
        ...


def validate_supported_extension(
    file_name: str,
    supported_extensions: frozenset[str] = SUPPORTED_EXTENSIONS,
) -> str:
    extension = Path(file_name).suffix.lower()
    if extension not in supported_extensions:
        allowed = ", ".join(sorted(supported_extensions))
        raise DocumentStorageError(f"Unsupported file type. Supported file types: {allowed}")
    return extension


def safe_filename(file_name: str) -> str:
    base_name = Path(file_name).name.strip()
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", base_name)
    cleaned = cleaned.strip("._")
    return cleaned or "uploaded_document"


def stored_document_path(storage_dir: Path, document_id: uuid.UUID, original_file_name: str) -> Path:
    return storage_dir / str(document_id) / safe_filename(original_file_name)


def uploaded_object_path(document_id: uuid.UUID, original_file_name: str) -> str:
    return f"uploads/{document_id}/{safe_filename(original_file_name)}"


def extracted_text_path(extracted_dir: Path, document_id: uuid.UUID) -> Path:
    return extracted_dir / f"{document_id}.txt"


def extracted_text_object_path(document_id: uuid.UUID) -> str:
    return f"extracted/{document_id}.txt"


class LocalStorageProvider:
    def __init__(
        self,
        upload_dir: Path,
        extracted_text_dir: Path,
        supported_extensions: frozenset[str] = SUPPORTED_EXTENSIONS,
    ) -> None:
        self.upload_dir = upload_dir
        self.extracted_text_dir = extracted_text_dir
        self.supported_extensions = supported_extensions

    def save_uploaded_file(self, document_id: uuid.UUID, filename: str, file_bytes: bytes) -> str:
        validate_supported_extension(filename, self.supported_extensions)
        if not file_bytes:
            raise DocumentStorageError("Uploaded file is empty")

        destination = stored_document_path(self.upload_dir, document_id, filename)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(file_bytes)
        return str(destination)

    def read_uploaded_file(self, file_path: str) -> bytes:
        path = Path(file_path)
        if not path.exists():
            raise DocumentStorageError("Stored file was not found")
        file_bytes = path.read_bytes()
        if not file_bytes:
            raise DocumentStorageError("Stored file is empty")
        return file_bytes

    def save_extracted_text(self, document_id: uuid.UUID, text: str) -> str:
        self.extracted_text_dir.mkdir(parents=True, exist_ok=True)
        destination = extracted_text_path(self.extracted_text_dir, document_id)
        destination.write_text(text, encoding="utf-8")
        return str(destination)

    def read_extracted_text(self, document_id: uuid.UUID) -> str:
        path = extracted_text_path(self.extracted_text_dir, document_id)
        if not path.exists():
            raise DocumentStorageError("Extracted text file was not found")
        text = path.read_text(encoding="utf-8")
        if not text.strip():
            raise DocumentStorageError("Extracted text is empty")
        return text

    def delete_document_files(self, document_id: uuid.UUID, file_path: str | None = None) -> None:
        if file_path:
            Path(file_path).unlink(missing_ok=True)

        upload_document_dir = self.upload_dir / str(document_id)
        if upload_document_dir.exists():
            shutil.rmtree(upload_document_dir)

        extracted_text_path(self.extracted_text_dir, document_id).unlink(missing_ok=True)


class SupabaseStorageProvider:
    def __init__(
        self,
        client: Any,
        bucket_name: str,
        supported_extensions: frozenset[str] = SUPPORTED_EXTENSIONS,
    ) -> None:
        self.client = client
        self.bucket_name = bucket_name
        self.supported_extensions = supported_extensions

    def save_uploaded_file(self, document_id: uuid.UUID, filename: str, file_bytes: bytes) -> str:
        validate_supported_extension(filename, self.supported_extensions)
        if not file_bytes:
            raise DocumentStorageError("Uploaded file is empty")

        object_path = uploaded_object_path(document_id, filename)
        self._upload(object_path, file_bytes, content_type="application/octet-stream")
        return object_path

    def read_uploaded_file(self, file_path: str) -> bytes:
        return self._download_bytes(file_path)

    def save_extracted_text(self, document_id: uuid.UUID, text: str) -> str:
        object_path = extracted_text_object_path(document_id)
        self._upload(object_path, text.encode("utf-8"), content_type="text/plain; charset=utf-8")
        return object_path

    def read_extracted_text(self, document_id: uuid.UUID) -> str:
        file_bytes = self._download_bytes(extracted_text_object_path(document_id))
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            text = file_bytes.decode("utf-8", errors="replace")
        if not text.strip():
            raise DocumentStorageError("Extracted text is empty")
        return text

    def delete_document_files(self, document_id: uuid.UUID, file_path: str | None = None) -> None:
        paths = [extracted_text_object_path(document_id)]
        if file_path:
            paths.append(file_path)
        try:
            self._bucket().remove(paths)
        except Exception:
            pass

    def _bucket(self) -> Any:
        return self.client.storage.from_(self.bucket_name)

    def _upload(self, object_path: str, file_bytes: bytes, content_type: str) -> None:
        try:
            response = self._bucket().upload(
                object_path,
                file_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )
        except Exception as exc:
            raise DocumentStorageError(f"Supabase Storage upload failed for {object_path}") from exc
        self._raise_response_error(response, f"Supabase Storage upload failed for {object_path}")

    def _download_bytes(self, object_path: str) -> bytes:
        try:
            response = self._bucket().download(object_path)
        except Exception as exc:
            raise DocumentStorageError(f"Supabase Storage download failed for {object_path}") from exc
        self._raise_response_error(response, f"Supabase Storage download failed for {object_path}")
        if isinstance(response, bytes):
            return response
        if isinstance(response, bytearray):
            return bytes(response)
        raise DocumentStorageError(f"Supabase Storage download failed for {object_path}")

    @staticmethod
    def _raise_response_error(response: Any, message: str) -> None:
        error = None
        if isinstance(response, dict):
            error = response.get("error")
        else:
            error = getattr(response, "error", None)
        if error:
            detail = error.get("message") if isinstance(error, dict) else getattr(error, "message", str(error))
            raise DocumentStorageError(f"{message}: {detail}")


def _require_supabase_setting(value: str | None, setting_name: str) -> str:
    if not value:
        raise InvalidStorageProviderError(f"{setting_name} is required when STORAGE_PROVIDER=supabase")
    return value


def _create_supabase_client(supabase_url: str, service_role_key: str) -> Any:
    try:
        from supabase import create_client
    except ImportError as exc:
        raise InvalidStorageProviderError("Supabase Python client is not installed") from exc
    return create_client(supabase_url, service_role_key)


def create_storage_provider(settings: Settings) -> StorageProvider:
    provider_name = getattr(settings, "storage_provider", "local")
    if provider_name not in SUPPORTED_STORAGE_PROVIDERS:
        raise InvalidStorageProviderError(f"Unsupported storage provider: {provider_name}")
    if provider_name == "local":
        return LocalStorageProvider(
            settings.document_storage_dir,
            settings.extracted_text_dir,
            settings.allowed_upload_extensions,
        )
    if provider_name == "supabase":
        supabase_url = _require_supabase_setting(
            getattr(settings, "supabase_url", None),
            "SUPABASE_URL",
        )
        service_role_key = _require_supabase_setting(
            getattr(settings, "supabase_service_role_key", None),
            "SUPABASE_SERVICE_ROLE_KEY",
        )
        bucket_name = _require_supabase_setting(
            getattr(settings, "supabase_storage_bucket", None),
            "SUPABASE_STORAGE_BUCKET",
        )
        return SupabaseStorageProvider(
            _create_supabase_client(supabase_url, service_role_key),
            bucket_name,
            settings.allowed_upload_extensions,
        )
    raise InvalidStorageProviderError(f"Storage provider is not implemented: {provider_name}")


def get_storage_provider(settings: Settings = Depends(get_settings)) -> StorageProvider:
    return create_storage_provider(settings)


def save_uploaded_file(
    file_obj: BinaryIO,
    storage_dir: Path,
    document_id: uuid.UUID,
    original_file_name: str,
    supported_extensions: frozenset[str] = SUPPORTED_EXTENSIONS,
) -> Path:
    provider = LocalStorageProvider(storage_dir, storage_dir / "extracted", supported_extensions)
    destination = provider.save_uploaded_file(document_id, original_file_name, file_obj.read())
    return Path(destination)
