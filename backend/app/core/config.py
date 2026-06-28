import os
from functools import lru_cache
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        self.database_url = os.getenv(
            "COURSECOMPASS_DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@localhost:5432/coursecompass",
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
