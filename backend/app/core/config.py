import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    return database_url


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


@lru_cache
def get_settings() -> Settings:
    return Settings()
