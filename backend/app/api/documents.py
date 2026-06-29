import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.core.config import Settings, get_settings
from backend.app.db.models import Document, DocumentStatus, SourceType
from backend.app.db.session import get_db
from backend.app.schemas.documents import ChunkingResponse, DocumentResponse, ExtractionResponse
from backend.app.services.chunking import ChunkingError, read_extracted_text, replace_document_chunks
from backend.app.services.document_storage import DocumentStorageError, save_uploaded_file, validate_supported_extension
from backend.app.services.embeddings import EmbeddingError, EmbeddingProvider, get_embedding_provider
from backend.app.services.text_extraction import TextExtractionError, extract_to_file

router = APIRouter(prefix="/documents", tags=["documents"])


def parse_source_type(value: str) -> str:
    allowed = {source_type.value for source_type in SourceType}
    if value not in allowed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid source_type. Allowed values: {', '.join(sorted(allowed))}",
        )
    return value


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
        stored_path = save_uploaded_file(
            file.file,
            settings.document_storage_dir,
            document_id,
            file.filename,
            settings.allowed_upload_extensions,
        )
    except DocumentStorageError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document = Document(
        id=document_id,
        title=title,
        file_name=Path(file.filename).name,
        file_path=str(stored_path),
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
    settings: Settings = Depends(get_settings),
) -> ExtractionResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.status = DocumentStatus.processing.value
    document.error_message = None
    db.commit()

    try:
        output_path, character_count = extract_to_file(
            Path(document.file_path),
            settings.extracted_text_dir,
            document.id,
        )
    except TextExtractionError as exc:
        document.status = DocumentStatus.failed.value
        document.error_message = str(exc)[:500]
        db.commit()
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
    embedding_provider: EmbeddingProvider = Depends(get_embedding_provider),
) -> ChunkingResponse:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    document.status = DocumentStatus.processing.value
    document.error_message = None
    db.commit()

    try:
        extracted_text = read_extracted_text(settings.extracted_text_dir, document.id)
        chunks_created = replace_document_chunks(
            db,
            document,
            extracted_text,
            embedding_provider,
            chunk_size=settings.chunk_size,
            overlap=settings.chunk_overlap,
        )
    except (ChunkingError, EmbeddingError) as exc:
        db.rollback()
        document.status = DocumentStatus.failed.value
        document.error_message = str(exc)[:500]
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        document.status = DocumentStatus.failed.value
        document.error_message = "Chunking failed"
        db.commit()
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
