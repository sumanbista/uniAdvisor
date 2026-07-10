import uuid
from collections.abc import Callable
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.core.config import Settings, get_settings
from backend.app.db.models import Document, DocumentStatus, SourceType
from backend.app.db.session import get_db
from backend.app.schemas.documents import (
    ChunkingResponse,
    DocumentResponse,
    ExtractionResponse,
    ProcessDocumentResponse,
)
from backend.app.services.chunking import ChunkingError, replace_document_chunks
from backend.app.services.document_storage import (
    DocumentStorageError,
    StorageProvider,
    get_storage_provider,
    validate_supported_extension,
)
from backend.app.services.embeddings import EmbeddingError, EmbeddingProvider, get_embedding_provider
from backend.app.services.text_extraction import TextExtractionError, extract_to_storage

router = APIRouter(prefix="/documents", tags=["documents"])
EmbeddingProviderFactory = Callable[[], EmbeddingProvider]


def parse_source_type(value: str) -> str:
    allowed = {source_type.value for source_type in SourceType}
    if value not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid source_type. Allowed values: {', '.join(sorted(allowed))}",
        )
    return value


def get_embedding_provider_factory() -> EmbeddingProviderFactory:
    return get_embedding_provider


def set_document_processing(db: Session, document: Document) -> None:
    document.status = DocumentStatus.processing.value
    document.error_message = None
    db.commit()


def set_document_failed(db: Session, document: Document, message: str) -> None:
    document.status = DocumentStatus.failed.value
    document.error_message = message[:500]
    db.commit()


def extract_document_to_storage(document: Document, storage_provider: StorageProvider) -> tuple[str, int]:
    return extract_to_storage(
        document.file_path,
        storage_provider,
        document.id,
    )


def chunk_document_from_storage(
    db: Session,
    document: Document,
    settings: Settings,
    storage_provider: StorageProvider,
    embedding_provider: EmbeddingProvider,
) -> int:
    extracted_text = storage_provider.read_extracted_text(document.id)
    return replace_document_chunks(
        db,
        document,
        extracted_text,
        embedding_provider,
        chunk_size=settings.chunk_size,
        overlap=settings.chunk_overlap,
    )


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    source_type: str = Form(...),
    department: str = Form("Computer Science"),
    program: str = Form("Computer Science"),
    academic_year: str | None = Form(None),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage_provider: StorageProvider = Depends(get_storage_provider),
) -> Document:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file name")

    validate_source_type = parse_source_type(source_type)
    try:
        validate_supported_extension(file.filename, settings.allowed_upload_extensions)
    except DocumentStorageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document_id = uuid.uuid4()
    try:
        stored_path = storage_provider.save_uploaded_file(
            document_id,
            file.filename,
            file.file.read(),
        )
    except DocumentStorageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document = Document(
        id=document_id,
        title=title,
        file_name=Path(file.filename).name,
        file_path=stored_path,
        source_type=validate_source_type,
        department=department or "Computer Science",
        program=program or "Computer Science",
        academic_year=academic_year,
        status=DocumentStatus.uploaded.value,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.post("/{document_id}/extract", response_model=ExtractionResponse)
def extract_document_text(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    storage_provider: StorageProvider = Depends(get_storage_provider),
) -> ExtractionResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    set_document_processing(db, document)

    try:
        output_path, character_count = extract_document_to_storage(document, storage_provider)
    except (DocumentStorageError, TextExtractionError) as exc:
        set_document_failed(db, document, str(exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document.status = DocumentStatus.ready.value
    document.error_message = None
    db.commit()
    db.refresh(document)

    return ExtractionResponse(
        document_id=document.id,
        status=document.status,
        extracted_text_path=str(output_path),
        character_count=character_count,
    )


@router.post("/{document_id}/chunk", response_model=ChunkingResponse)
def chunk_document_text(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage_provider: StorageProvider = Depends(get_storage_provider),
    embedding_provider_factory: EmbeddingProviderFactory = Depends(get_embedding_provider_factory),
) -> ChunkingResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    set_document_processing(db, document)

    try:
        embedding_provider = embedding_provider_factory()
        chunks_created = chunk_document_from_storage(db, document, settings, storage_provider, embedding_provider)
    except (DocumentStorageError, ChunkingError, EmbeddingError) as exc:
        db.rollback()
        set_document_failed(db, document, str(exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        set_document_failed(db, document, "Chunking failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Chunking failed") from exc

    document.status = DocumentStatus.ready.value
    document.error_message = None
    db.commit()
    db.refresh(document)

    return ChunkingResponse(
        document_id=document.id,
        chunks_created=chunks_created,
        status=document.status,
    )


@router.post("/{document_id}/process", response_model=ProcessDocumentResponse)
def process_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    storage_provider: StorageProvider = Depends(get_storage_provider),
    embedding_provider_factory: EmbeddingProviderFactory = Depends(get_embedding_provider_factory),
) -> ProcessDocumentResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    set_document_processing(db, document)

    extracted_text_path: str | None = None
    try:
        extracted_text_path, _character_count = extract_document_to_storage(document, storage_provider)
        embedding_provider = embedding_provider_factory()
        chunk_count = chunk_document_from_storage(db, document, settings, storage_provider, embedding_provider)
    except (DocumentStorageError, TextExtractionError) as exc:
        db.rollback()
        set_document_failed(db, document, str(exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except (ChunkingError, EmbeddingError) as exc:
        db.rollback()
        set_document_failed(db, document, str(exc))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        set_document_failed(db, document, "Document processing failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document processing failed",
        ) from exc

    document.status = DocumentStatus.ready.value
    document.error_message = None
    db.commit()
    db.refresh(document)

    return ProcessDocumentResponse(
        document_id=document.id,
        status=document.status,
        message="Document processed and indexed.",
        extracted_text_path=extracted_text_path,
        chunk_count=chunk_count,
    )
