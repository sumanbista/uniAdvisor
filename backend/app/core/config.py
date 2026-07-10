import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

DEFAULT_ALLOWED_UPLOAD_EXTENSIONS = frozenset({".pdf", ".txt", ".md"})
DEFAULT_CHUNK_SIZE = 300
DEFAULT_CHUNK_OVERLAP = 75
DEFAULT_DEPARTMENT = "Computer Science"
DEFAULT_EMBEDDING_DIMENSIONS = 384
DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_EMBEDDING_PROVIDER = "local"
DEFAULT_EMBEDDING_TIMEOUT_SECONDS = 20.0
DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-001"
DEFAULT_HF_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_HF_EMBEDDING_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
)
DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant"
DEFAULT_GROQ_MAX_TOKENS = 900
DEFAULT_GROQ_REASONING_EFFORT = "none"
DEFAULT_PROGRAM = "Computer Science"
DEFAULT_TOP_K = 5
MAX_TOP_K = 20
SUPPORTED_RAG_FILTERS = frozenset({"department", "program", "source_type", "academic_year", "document_id"})
SUPPORTED_STORAGE_PROVIDERS = frozenset({"local", "supabase"})
SUPPORTED_EMBEDDING_PROVIDERS = frozenset({"local", "gemini", "huggingface"})


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


def getenv_alias(primary: str, fallback: str, default: str | None = None) -> str | None:
    return os.getenv(primary, os.getenv(fallback, default))


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
        self.chunk_size = int(getenv_alias("CHUNK_SIZE", "COURSECOMPASS_CHUNK_SIZE", str(DEFAULT_CHUNK_SIZE)) or DEFAULT_CHUNK_SIZE)
        self.chunk_overlap = int(
            getenv_alias("CHUNK_OVERLAP", "COURSECOMPASS_CHUNK_OVERLAP", str(DEFAULT_CHUNK_OVERLAP))
            or DEFAULT_CHUNK_OVERLAP
        )
        self.embedding_provider = os.getenv("EMBEDDING_PROVIDER", DEFAULT_EMBEDDING_PROVIDER).strip().lower()
        self.embedding_fallback_provider = os.getenv("EMBEDDING_FALLBACK_PROVIDER", "").strip().lower()
        self.embedding_dimension = int(os.getenv("EMBEDDING_DIMENSION", str(DEFAULT_EMBEDDING_DIMENSIONS)))
        self.embedding_timeout_seconds = float(
            os.getenv("EMBEDDING_TIMEOUT_SECONDS", str(DEFAULT_EMBEDDING_TIMEOUT_SECONDS))
        )
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_embedding_model = os.getenv("GEMINI_EMBEDDING_MODEL", DEFAULT_GEMINI_EMBEDDING_MODEL)
        self.gemini_embedding_output_dimension = int(
            os.getenv("GEMINI_EMBEDDING_OUTPUT_DIMENSION", str(DEFAULT_EMBEDDING_DIMENSIONS))
        )
        self.hf_api_key = os.getenv("HF_API_KEY")
        self.hf_embedding_model = os.getenv("HF_EMBEDDING_MODEL", DEFAULT_HF_EMBEDDING_MODEL)
        self.hf_embedding_url = os.getenv("HF_EMBEDDING_URL", DEFAULT_HF_EMBEDDING_URL)
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = getenv_alias("GROQ_MODEL", "COURSECOMPASS_GROQ_MODEL", DEFAULT_GROQ_MODEL)
        self.groq_max_tokens = int(
            getenv_alias("GROQ_MAX_TOKENS", "COURSECOMPASS_GROQ_MAX_TOKENS", str(DEFAULT_GROQ_MAX_TOKENS))
            or DEFAULT_GROQ_MAX_TOKENS
        )
        self.groq_reasoning_effort = getenv_alias(
            "GROQ_REASONING_EFFORT",
            "COURSECOMPASS_GROQ_REASONING_EFFORT",
            DEFAULT_GROQ_REASONING_EFFORT,
        )
        self.cors_origins = parse_csv(
            getenv_alias("BACKEND_CORS_ORIGINS", "COURSECOMPASS_CORS_ORIGINS"),
            ("http://localhost:3000", "http://127.0.0.1:3000"),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
