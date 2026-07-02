import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DEFAULT_ALLOWED_UPLOAD_EXTENSIONS = frozenset({".pdf", ".txt", ".md"})
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 200
DEFAULT_DEPARTMENT = "Computer Science"
DEFAULT_EMBEDDING_DIMENSIONS = 384
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
DEFAULT_PROGRAM = "Computer Science"
DEFAULT_TOP_K = 5
MAX_TOP_K = 20
SUPPORTED_RAG_FILTERS = frozenset({"department", "program", "source_type", "academic_year", "document_id"})
SUPPORTED_STORAGE_PROVIDERS = frozenset({"local", "supabase"})


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    return database_url


def parse_extensions(value: str | None) -> frozenset[str]:
    if not value:
        return DEFAULT_ALLOWED_UPLOAD_EXTENSIONS
    extensions = {extension.strip().lower() for extension in value.split(",") if extension.strip()}
    return frozenset(
        extension if extension.startswith(".") else f".{extension}"
        for extension in extensions
    )


def parse_csv(value: str | None, default: tuple[str, ...]) -> tuple[str, ...]:
    if not value:
        return default
    return tuple(item.strip() for item in value.split(",") if item.strip())


class Settings:
    def __init__(self) -> None:
        self.database_url = normalize_database_url(
            os.getenv(
                "COURSECOMPASS_DATABASE_URL",
                "postgresql+psycopg://postgres:postgres@localhost:5432/coursecompass",
            )
        )
        self.document_storage_dir = Path(
            os.getenv("COURSECOMPASS_DOCUMENT_STORAGE_DIR", "backend/storage/documents")
        )
        self.extracted_text_dir = Path(
            os.getenv("COURSECOMPASS_EXTRACTED_TEXT_DIR", "backend/storage/extracted")
        )
        self.storage_provider = os.getenv(
            "STORAGE_PROVIDER",
            os.getenv("COURSECOMPASS_STORAGE_PROVIDER", "local"),
        ).strip().lower()
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        self.supabase_storage_bucket = os.getenv("SUPABASE_STORAGE_BUCKET")
        self.allowed_upload_extensions = parse_extensions(os.getenv("COURSECOMPASS_ALLOWED_UPLOAD_EXTENSIONS"))
        self.chunk_size = int(os.getenv("COURSECOMPASS_CHUNK_SIZE", str(DEFAULT_CHUNK_SIZE)))
        self.chunk_overlap = int(os.getenv("COURSECOMPASS_CHUNK_OVERLAP", str(DEFAULT_CHUNK_OVERLAP)))
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("COURSECOMPASS_GROQ_MODEL", DEFAULT_GROQ_MODEL)
        self.cors_origins = parse_csv(
            os.getenv("COURSECOMPASS_CORS_ORIGINS"),
            ("http://localhost:3000", "http://127.0.0.1:3000"),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
