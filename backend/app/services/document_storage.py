import re
import shutil
import uuid
from pathlib import Path
from typing import BinaryIO

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}


class DocumentStorageError(ValueError):
    pass


def validate_supported_extension(file_name: str) -> str:
    extension = Path(file_name).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        allowed = ", ".join(sorted(SUPPORTED_EXTENSIONS))
        raise DocumentStorageError(f"Unsupported file type. Supported file types: {allowed}")
    return extension


def safe_filename(file_name: str) -> str:
    base_name = Path(file_name).name.strip()
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", base_name)
    cleaned = cleaned.strip("._")
    return cleaned or "uploaded_document"


def stored_document_path(storage_dir: Path, document_id: uuid.UUID, original_file_name: str) -> Path:
    return storage_dir / f"{document_id}_{safe_filename(original_file_name)}"


def save_uploaded_file(
    file_obj: BinaryIO,
    storage_dir: Path,
    document_id: uuid.UUID,
    original_file_name: str,
) -> Path:
    validate_supported_extension(original_file_name)
    storage_dir.mkdir(parents=True, exist_ok=True)

    destination = stored_document_path(storage_dir, document_id, original_file_name)
    with destination.open("wb") as output:
        shutil.copyfileobj(file_obj, output)

    if destination.stat().st_size == 0:
        destination.unlink(missing_ok=True)
        raise DocumentStorageError("Uploaded file is empty")

    return destination
