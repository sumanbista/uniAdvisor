import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentResponse(BaseModel):
    id: uuid.UUID
    title: str
    file_name: str
    file_path: str
    source_type: str
    department: str
    program: str
    academic_year: str | None = None
    status: str
    uploaded_by: str | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ExtractionResponse(BaseModel):
    document_id: uuid.UUID
    status: str
    extracted_text_path: str
    character_count: int


class ChunkingResponse(BaseModel):
    document_id: uuid.UUID
    chunks_created: int
    status: str


class ProcessDocumentResponse(BaseModel):
    document_id: uuid.UUID
    status: str
    message: str
    extracted_text_path: str | None = None
    chunk_count: int
