import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.core.config import DEFAULT_TOP_K, MAX_TOP_K


class RagSearchRequest(BaseModel):
    query: str
    filters: dict[str, Any] = Field(default_factory=dict)
    top_k: int = DEFAULT_TOP_K

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("query is required")
        return stripped

    @field_validator("top_k")
    @classmethod
    def validate_top_k(cls, value: int) -> int:
        if value < 1 or value > MAX_TOP_K:
            raise ValueError(f"top_k must be between 1 and {MAX_TOP_K}")
        return value

class RagSearchResult(BaseModel):
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    text: str
    score: float
    page_number: int | None = None
    section_title: str | None = None
    source_type: str
    department: str
    program: str
    academic_year: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RagSearchResponse(BaseModel):
    query: str
    results: list[RagSearchResult]


class RagAskRequest(BaseModel):
    question: str
    filters: dict[str, Any] = Field(default_factory=dict)
    top_k: int = DEFAULT_TOP_K

    @field_validator("question")
    @classmethod
    def validate_question(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("question is required")
        return stripped

    @field_validator("top_k")
    @classmethod
    def validate_top_k(cls, value: int) -> int:
        if value < 1 or value > MAX_TOP_K:
            raise ValueError(f"top_k must be between 1 and {MAX_TOP_K}")
        return value

class RagSourceReference(BaseModel):
    source_number: int
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    page_number: int | None = None
    section_title: str | None = None
    source_type: str


class RagAskResponse(BaseModel):
    question: str
    answer: str
    confidence: str
    confidence_score: int = Field(ge=0, le=100)
    refused: bool
    sources: list[RagSourceReference]
    advisor_note: str
