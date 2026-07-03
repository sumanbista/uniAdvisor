from backend.app.core.config import DEFAULT_ALLOWED_UPLOAD_EXTENSIONS, Settings, normalize_database_url, parse_extensions


def test_normalize_database_url_uses_psycopg_driver_for_postgresql_urls() -> None:
    assert (
        normalize_database_url("postgresql://postgres.example:secret@host:5432/postgres")
        == "postgresql+psycopg://postgres.example:secret@host:5432/postgres"
    )


def test_normalize_database_url_uses_psycopg_driver_for_postgres_urls() -> None:
    assert (
        normalize_database_url("postgres://postgres.example:secret@host:5432/postgres")
        == "postgresql+psycopg://postgres.example:secret@host:5432/postgres"
    )


def test_parse_extensions_uses_defaults_when_unset() -> None:
    assert parse_extensions(None) == DEFAULT_ALLOWED_UPLOAD_EXTENSIONS


def test_parse_extensions_normalizes_csv_values() -> None:
    assert parse_extensions("pdf, .TXT,md") == frozenset({".pdf", ".txt", ".md"})


def test_render_style_environment_aliases_are_supported(monkeypatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "https://frontend.example.com,http://localhost:3000")
    monkeypatch.setenv("GROQ_MODEL", "llama-test")
    monkeypatch.setenv("CHUNK_SIZE", "800")
    monkeypatch.setenv("CHUNK_OVERLAP", "120")

    settings = Settings()

    assert settings.cors_origins == ("https://frontend.example.com", "http://localhost:3000")
    assert settings.groq_model == "llama-test"
    assert settings.chunk_size == 800
    assert settings.chunk_overlap == 120
