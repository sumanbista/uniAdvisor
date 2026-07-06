import socket
import urllib.error
import uuid

import pytest

from backend.app.core.config import get_settings
from backend.app.services import embeddings
from backend.app.services.chunking import build_document_chunks
from backend.app.services.embeddings import (
    EMBEDDING_DIMENSIONS,
    EmbeddingError,
    FallbackEmbeddingProvider,
    GeminiEmbeddingProvider,
    HuggingFaceEmbeddingProvider,
    SentenceTransformerEmbeddingProvider,
    get_embedding_provider,
)
from backend.app.services.rag_search import search_chunks
from tests.test_chunking_embedding import FakeSession, document_fixture
from tests.test_rag_search import add_chunk, add_document


class MockResponse:
    def __init__(self, payload: str) -> None:
        self.payload = payload.encode("utf-8")

    def __enter__(self) -> "MockResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def read(self) -> bytes:
        return self.payload


class ExternalMockEmbeddingProvider:
    def embed(self, text: str) -> list[float]:
        vector = [0.0] * EMBEDDING_DIMENSIONS
        vector[0] = 1.0
        return vector

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(text) for text in texts]


@pytest.fixture(autouse=True)
def clear_embedding_caches() -> None:
    get_settings.cache_clear()
    get_embedding_provider.cache_clear()
    yield
    get_settings.cache_clear()
    get_embedding_provider.cache_clear()


def vector_payload(value: float = 0.1) -> str:
    return '{"embedding": {"values": [' + ",".join([str(value)] * EMBEDDING_DIMENSIONS) + "]}}"


def hf_vector_payload(value: float = 0.2) -> str:
    return "[" + ",".join([str(value)] * EMBEDDING_DIMENSIONS) + "]"


def http_error(status_code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError(
        url="https://provider.example",
        code=status_code,
        msg="provider error",
        hdrs=None,
        fp=None,
    )


def test_local_provider_remains_default(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("EMBEDDING_PROVIDER", raising=False)
    monkeypatch.delenv("EMBEDDING_FALLBACK_PROVIDER", raising=False)

    provider = get_embedding_provider()

    assert isinstance(provider, SentenceTransformerEmbeddingProvider)
    assert provider._model is None


def test_gemini_provider_is_selected_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    provider = get_embedding_provider()

    assert isinstance(provider, GeminiEmbeddingProvider)


def test_huggingface_provider_is_selected_when_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "huggingface")
    monkeypatch.setenv("HF_API_KEY", "test-hf-key")

    provider = get_embedding_provider()

    assert isinstance(provider, HuggingFaceEmbeddingProvider)


def test_missing_gemini_key_fails_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")

    with pytest.raises(EmbeddingError, match="GEMINI_API_KEY"):
        get_embedding_provider().embed("hello")


def test_missing_huggingface_key_fails_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "huggingface")

    with pytest.raises(EmbeddingError, match="HF_API_KEY"):
        get_embedding_provider().embed("hello")


def test_gemini_returns_valid_384_dim_vector(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    def fake_urlopen(request: object, timeout: float) -> MockResponse:
        assert timeout == 20.0
        return MockResponse(vector_payload())

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    vector = get_embedding_provider().embed("degree requirements")

    assert len(vector) == EMBEDDING_DIMENSIONS


def test_huggingface_returns_valid_384_dim_vector(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "huggingface")
    monkeypatch.setenv("HF_API_KEY", "test-hf-key")

    def fake_urlopen(request: object, timeout: float) -> MockResponse:
        assert timeout == 20.0
        return MockResponse(hf_vector_payload())

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    vector = get_embedding_provider().embed("degree requirements")

    assert len(vector) == EMBEDDING_DIMENSIONS


def test_huggingface_token_level_response_is_mean_pooled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "huggingface")
    monkeypatch.setenv("HF_API_KEY", "test-hf-key")
    first = "[" + ",".join(["0.0"] * EMBEDDING_DIMENSIONS) + "]"
    second = "[" + ",".join(["2.0"] * EMBEDDING_DIMENSIONS) + "]"

    def fake_urlopen(request: object, timeout: float) -> MockResponse:
        return MockResponse(f"[{first},{second}]")

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    vector = get_embedding_provider().embed("degree requirements")

    assert vector == [1.0] * EMBEDDING_DIMENSIONS


def test_huggingface_batch_wrapped_token_response_is_mean_pooled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "huggingface")
    monkeypatch.setenv("HF_API_KEY", "test-hf-key")
    first = "[" + ",".join(["0.0"] * EMBEDDING_DIMENSIONS) + "]"
    second = "[" + ",".join(["2.0"] * EMBEDDING_DIMENSIONS) + "]"

    def fake_urlopen(request: object, timeout: float) -> MockResponse:
        return MockResponse(f"[[{first},{second}]]")

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    vector = get_embedding_provider().embed("degree requirements")

    assert vector == [1.0] * EMBEDDING_DIMENSIONS


def test_wrong_dimension_response_fails_clearly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")

    def fake_urlopen(request: object, timeout: float) -> MockResponse:
        return MockResponse('{"embedding": {"values": [0.1, 0.2]}}')

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(EmbeddingError, match="returned 2 dimensions; expected 384"):
        get_embedding_provider().embed("degree requirements")


@pytest.mark.parametrize("status_code", [429, 503])
def test_recoverable_gemini_http_errors_fallback_to_huggingface(
    monkeypatch: pytest.MonkeyPatch,
    status_code: int,
) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("EMBEDDING_FALLBACK_PROVIDER", "huggingface")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("HF_API_KEY", "test-hf-key")
    calls: list[str] = []

    def fake_urlopen(request: urllib.request.Request, timeout: float) -> MockResponse:
        url = request.full_url
        calls.append(url)
        if "generativelanguage" in url:
            raise http_error(status_code)
        return MockResponse(hf_vector_payload())

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    provider = get_embedding_provider()
    vector = provider.embed("degree requirements")

    assert isinstance(provider, FallbackEmbeddingProvider)
    assert len(vector) == EMBEDDING_DIMENSIONS
    assert len(calls) == 2


def test_gemini_timeout_fallbacks_to_huggingface(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("EMBEDDING_FALLBACK_PROVIDER", "huggingface")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("HF_API_KEY", "test-hf-key")
    calls: list[str] = []

    def fake_urlopen(request: urllib.request.Request, timeout: float) -> MockResponse:
        url = request.full_url
        calls.append(url)
        if "generativelanguage" in url:
            raise socket.timeout("timed out")
        return MockResponse(hf_vector_payload())

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    vector = get_embedding_provider().embed("degree requirements")

    assert len(vector) == EMBEDDING_DIMENSIONS
    assert len(calls) == 2


def test_gemini_401_does_not_fallback_silently(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("EMBEDDING_FALLBACK_PROVIDER", "huggingface")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("HF_API_KEY", "test-hf-key")
    calls: list[str] = []

    def fake_urlopen(request: urllib.request.Request, timeout: float) -> MockResponse:
        calls.append(request.full_url)
        raise http_error(401)

    monkeypatch.setattr(embeddings.urllib.request, "urlopen", fake_urlopen)

    with pytest.raises(EmbeddingError, match="HTTP 401"):
        get_embedding_provider().embed("degree requirements")
    assert len(calls) == 1


def test_external_provider_mode_does_not_import_sentence_transformers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    real_import = __import__

    def guarded_import(name: str, *args: object, **kwargs: object) -> object:
        if name.startswith("sentence_transformers"):
            raise AssertionError("sentence-transformers should not load for Gemini provider")
        return real_import(name, *args, **kwargs)

    monkeypatch.setenv("EMBEDDING_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr("builtins.__import__", guarded_import)
    monkeypatch.setattr(
        embeddings.urllib.request,
        "urlopen",
        lambda request, timeout: MockResponse(vector_payload()),
    )

    vector = get_embedding_provider().embed("degree requirements")

    assert len(vector) == EMBEDDING_DIMENSIONS


def test_chunking_can_use_mocked_external_provider() -> None:
    document = document_fixture(document_id=uuid.uuid4())

    chunks = build_document_chunks(
        document,
        "--- Page 1 ---\nRequirements\nStudents take CS 101.",
        ExternalMockEmbeddingProvider(),
    )

    assert len(chunks) == 1
    assert len(chunks[0].embedding) == EMBEDDING_DIMENSIONS


def test_rag_search_can_use_mocked_external_provider() -> None:
    session = FakeSession()
    document = add_document(session, "CS Major Checksheet", "major_checksheet")
    add_chunk(session, document, text="Students take CS 101.", embedding_axis=0)

    results = search_chunks(
        db=session,
        query="What should students take?",
        filters={},
        top_k=1,
        embedding_provider=ExternalMockEmbeddingProvider(),
    )

    assert len(results) == 1
    assert results[0].text == "Students take CS 101."
