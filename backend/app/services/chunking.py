import hashlib
import re
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.app.core.config import DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE
from backend.app.db.models import Document, DocumentChunk
from backend.app.services.embeddings import EmbeddingProvider

PAGE_MARKER_RE = re.compile(r"^---\s*Page\s+(\d+)\s*---\s*$", re.IGNORECASE | re.MULTILINE)


class ChunkingError(RuntimeError):
    pass


@dataclass(frozen=True)
class TextChunk:
    chunk_index: int
    text: str
    page_number: int | None
    section_title: str | None
    token_count: int
    content_hash: str


def normalize_chunk_text(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "").split("\n")]
    normalized = "\n".join(lines).strip()
    return re.sub(r"\n{3,}", "\n\n", normalized)


def content_hash(text: str) -> str:
    return hashlib.sha256(normalize_chunk_text(text).encode("utf-8")).hexdigest()


def estimate_token_count(text: str) -> int:
    return len(re.findall(r"\S+", text))


def is_heading_like(line: str) -> bool:
    stripped = line.strip()
    if not stripped or len(stripped) > 100:
        return False
    if stripped.endswith("."):
        return False
    if stripped.startswith(("-", "*")):
        return False
    return bool(re.search(r"[A-Za-z]", stripped)) and estimate_token_count(stripped) <= 12


def nearest_section_title(text: str) -> str | None:
    for line in text.splitlines():
        if is_heading_like(line):
            return line.strip()
    return None


def split_pages(text: str) -> list[tuple[int | None, str]]:
    matches = list(PAGE_MARKER_RE.finditer(text))
    if not matches:
        return [(None, text)]

    pages: list[tuple[int | None, str]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        pages.append((int(match.group(1)), text[start:end]))
    return pages


def split_text_window(text: str, chunk_size: int, overlap: int) -> list[str]:
    normalized = normalize_chunk_text(text)
    if not normalized:
        return []
    if len(normalized) <= chunk_size:
        return [normalized]

    chunks: list[str] = []
    start = 0
    while start < len(normalized):
        hard_end = min(start + chunk_size, len(normalized))
        end = hard_end
        if hard_end < len(normalized):
            paragraph_break = normalized.rfind("\n\n", start, hard_end)
            sentence_break = normalized.rfind(". ", start, hard_end)
            whitespace_break = normalized.rfind(" ", start, hard_end)
            best_break = max(paragraph_break, sentence_break + 1 if sentence_break != -1 else -1, whitespace_break)
            if best_break > start + chunk_size // 2:
                end = best_break

        chunk = normalize_chunk_text(normalized[start:end])
        if chunk:
            chunks.append(chunk)
        if hard_end >= len(normalized):
            break
        start = max(end - overlap, start + 1)
    return chunks


def create_chunks(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[TextChunk]:
    if overlap >= chunk_size:
        raise ValueError("overlap must be smaller than chunk_size")

    chunks: list[TextChunk] = []
    seen_hashes: set[str] = set()
    for page_number, page_text in split_pages(text):
        for chunk_text in split_text_window(page_text, chunk_size=chunk_size, overlap=overlap):
            digest = content_hash(chunk_text)
            if digest in seen_hashes:
                continue
            seen_hashes.add(digest)
            chunks.append(
                TextChunk(
                    chunk_index=len(chunks),
                    text=chunk_text,
                    page_number=page_number,
                    section_title=nearest_section_title(chunk_text),
                    token_count=estimate_token_count(chunk_text),
                    content_hash=digest,
                )
            )
    return chunks


def extracted_text_path(extracted_dir: Path, document_id: uuid.UUID) -> Path:
    return extracted_dir / f"{document_id}.txt"


def read_extracted_text(extracted_dir: Path, document_id: uuid.UUID) -> str:
    path = extracted_text_path(extracted_dir, document_id)
    if not path.exists():
        raise ChunkingError("Extracted text file was not found")
    text = path.read_text(encoding="utf-8")
    if not normalize_chunk_text(text):
        raise ChunkingError("Extracted text is empty")
    return text


def build_document_chunks(
    document: Document,
    text: str,
    embedding_provider: EmbeddingProvider,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> list[DocumentChunk]:
    chunks = create_chunks(text, chunk_size=chunk_size, overlap=overlap)
    if not chunks:
        raise ChunkingError("No chunks were created")

    embeddings = embedding_provider.embed_batch([chunk.text for chunk in chunks])
    if len(embeddings) != len(chunks):
        raise ChunkingError("Embedding provider returned the wrong number of embeddings")

    return [
        DocumentChunk(
            document_id=document.id,
            chunk_index=chunk.chunk_index,
            text=chunk.text,
            embedding=embedding,
            page_number=chunk.page_number,
            section_title=chunk.section_title,
            source_type=document.source_type,
            department=document.department,
            program=document.program,
            academic_year=document.academic_year,
            token_count=chunk.token_count,
            content_hash=chunk.content_hash,
        )
        for chunk, embedding in zip(chunks, embeddings, strict=True)
    ]


def replace_document_chunks(
    db: Session,
    document: Document,
    text: str,
    embedding_provider: EmbeddingProvider,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> int:
    document_chunks = build_document_chunks(
        document,
        text,
        embedding_provider,
        chunk_size=chunk_size,
        overlap=overlap,
    )
    db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
    db.add_all(document_chunks)
    return len(document_chunks)
