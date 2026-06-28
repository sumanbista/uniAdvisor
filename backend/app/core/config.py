import os
from functools import lru_cache


class Settings:
    def __init__(self) -> None:
        self.database_url = os.getenv(
            "COURSECOMPASS_DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@localhost:5432/coursecompass",
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
