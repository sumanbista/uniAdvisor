from io import BytesIO
import uuid
from pathlib import Path

from backend.app.services.document_storage import StorageProvider, SUPPORTED_EXTENSIONS


class TextExtractionError(RuntimeError):
    pass


def normalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")


def extract_text_from_plain_file(file_path: Path) -> str:
    try:
        text = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = file_path.read_text(encoding="utf-8", errors="replace")
    return normalize_text(text)


def extract_text_from_plain_bytes(file_bytes: bytes) -> str:
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        text = file_bytes.decode("utf-8", errors="replace")
    return normalize_text(text)


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise TextExtractionError("PDF extraction library is not installed") from exc

    try:
        reader = PdfReader(BytesIO(file_bytes))
        page_outputs: list[str] = []
        for page_number, page in enumerate(reader.pages, start=1):
            page_text = normalize_text(page.extract_text() or "")
            page_outputs.append(f"--- Page {page_number} ---\n{page_text}".rstrip())
        return "\n\n".join(page_outputs).strip()
    except Exception as exc:
        raise TextExtractionError("Unable to extract text from PDF") from exc


def extract_text_from_pdf(file_path: Path) -> str:
    return extract_text_from_pdf_bytes(file_path.read_bytes())


def extract_text_from_bytes(file_bytes: bytes, file_name: str) -> str:
    if not file_bytes:
        raise TextExtractionError("Stored file is empty")

    extension = Path(file_name).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise TextExtractionError("Unsupported file type")

    if extension == ".pdf":
        text = extract_text_from_pdf_bytes(file_bytes)
    else:
        text = extract_text_from_plain_bytes(file_bytes)

    if not text.strip():
        raise TextExtractionError("Extracted text is empty")
    return text


def extract_text(file_path: Path) -> str:
    if not file_path.exists():
        raise TextExtractionError("Stored file was not found")
    if file_path.stat().st_size == 0:
        raise TextExtractionError("Stored file is empty")
    return extract_text_from_bytes(file_path.read_bytes(), file_path.name)


def extracted_text_path(extracted_dir: Path, document_id: uuid.UUID) -> Path:
    return extracted_dir / f"{document_id}.txt"


def extract_to_file(file_path: Path, extracted_dir: Path, document_id: uuid.UUID) -> tuple[Path, int]:
    text = extract_text(file_path)
    extracted_dir.mkdir(parents=True, exist_ok=True)

    destination = extracted_text_path(extracted_dir, document_id)
    destination.write_text(text, encoding="utf-8")
    return destination, len(text)


def extract_to_storage(file_path: str, storage_provider: StorageProvider, document_id: uuid.UUID) -> tuple[str, int]:
    file_bytes = storage_provider.read_uploaded_file(file_path)
    text = extract_text_from_bytes(file_bytes, file_path)
    output_path = storage_provider.save_extracted_text(document_id, text)
    return output_path, len(text)
