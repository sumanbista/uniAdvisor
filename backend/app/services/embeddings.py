import json
import socket
import urllib.error
import urllib.request
from functools import lru_cache
from typing import Any, Protocol

from backend.app.core.config import (
    DEFAULT_EMBEDDING_DIMENSIONS,
    DEFAULT_EMBEDDING_MODEL,
    SUPPORTED_EMBEDDING_PROVIDERS,
    Settings,
    get_settings,
)

EMBEDDING_DIMENSIONS = DEFAULT_EMBEDDING_DIMENSIONS
RECOVERABLE_HTTP_STATUSES = {429, 500, 502, 503, 504}


class EmbeddingError(RuntimeError):
    pass


class RecoverableEmbeddingError(EmbeddingError):
    pass


class EmbeddingProvider(Protocol):
    def embed(self, text: str) -> list[float]:
        ...

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        ...


def validate_embedding_vector(
    vector: list[float],
    expected_dimension: int | None = None,
    provider_name: str = "Embedding provider",
) -> list[float]:
    dimension = expected_dimension if expected_dimension is not None else get_settings().embedding_dimension
    if len(vector) != dimension:
        raise EmbeddingError(f"{provider_name} returned {len(vector)} dimensions; expected {dimension}")
    return vector


def validate_embedding_vectors(
    vectors: list[list[float]],
    expected_dimension: int | None = None,
    provider_name: str = "Embedding provider",
) -> list[list[float]]:
    for vector in vectors:
        validate_embedding_vector(vector, expected_dimension=expected_dimension, provider_name=provider_name)
    return vectors


def _coerce_float_vector(value: Any, provider_name: str) -> list[float]:
    if not isinstance(value, list) or not value:
        raise EmbeddingError(f"{provider_name} returned a malformed embedding response")
    try:
        return [float(item) for item in value]
    except (TypeError, ValueError) as exc:
        raise EmbeddingError(f"{provider_name} returned a malformed embedding response") from exc


def _mean_pool(vectors: list[list[float]], provider_name: str) -> list[float]:
    if not vectors:
        raise EmbeddingError(f"{provider_name} returned an empty embedding response")
    width = len(vectors[0])
    if width == 0 or any(len(vector) != width for vector in vectors):
        raise EmbeddingError(f"{provider_name} returned a malformed embedding response")
    return [sum(vector[index] for vector in vectors) / len(vectors) for index in range(width)]


def _post_json(
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
    timeout_seconds: float,
    provider_name: str,
) -> Any:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        if exc.code in RECOVERABLE_HTTP_STATUSES:
            raise RecoverableEmbeddingError(f"{provider_name} failed with HTTP {exc.code}") from exc
        raise EmbeddingError(f"{provider_name} failed with HTTP {exc.code}") from exc
    except (TimeoutError, urllib.error.URLError, socket.timeout) as exc:
        raise RecoverableEmbeddingError(f"{provider_name} request failed: {exc}") from exc

    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise EmbeddingError(f"{provider_name} returned invalid JSON") from exc


class SentenceTransformerEmbeddingProvider:
    provider_name = "local"

    def __init__(
        self,
        model_name: str = DEFAULT_EMBEDDING_MODEL,
        expected_dimension: int = DEFAULT_EMBEDDING_DIMENSIONS,
    ) -> None:
        self.model_name = model_name
        self.expected_dimension = expected_dimension
        self._model = None

    @property
    def model(self):
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError as exc:
                raise EmbeddingError("sentence-transformers is not installed") from exc
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed(self, text: str) -> list[float]:
        return self.embed_batch([text])[0]

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        try:
            embeddings = self.model.encode(texts, normalize_embeddings=True)
        except Exception as exc:
            raise EmbeddingError("Embedding generation failed") from exc

        vectors = [embedding.tolist() for embedding in embeddings]
        return validate_embedding_vectors(
            vectors,
            expected_dimension=self.expected_dimension,
            provider_name="Local embedding provider",
        )


class GeminiEmbeddingProvider:
    provider_name = "gemini"

    def __init__(
        self,
        api_key: str | None,
        model: str,
        output_dimension: int,
        expected_dimension: int,
        timeout_seconds: float,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.output_dimension = output_dimension
        self.expected_dimension = expected_dimension
        self.timeout_seconds = timeout_seconds

    def embed(self, text: str) -> list[float]:
        if not self.api_key:
            raise EmbeddingError("GEMINI_API_KEY is required when EMBEDDING_PROVIDER=gemini")
        if not self.model:
            raise EmbeddingError("GEMINI_EMBEDDING_MODEL is required when EMBEDDING_PROVIDER=gemini")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:embedContent?key={self.api_key}"
        payload = {
            "content": {"parts": [{"text": text}]},
            "outputDimensionality": self.output_dimension,
        }
        response = _post_json(url, payload, {}, self.timeout_seconds, "Gemini embedding provider")
        vector = self._parse_embedding(response)
        return validate_embedding_vector(
            vector,
            expected_dimension=self.expected_dimension,
            provider_name="Gemini embedding provider",
        )

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(text) for text in texts]

    def _parse_embedding(self, response: Any) -> list[float]:
        if not isinstance(response, dict):
            raise EmbeddingError("Gemini embedding provider returned a malformed response")
        embedding = response.get("embedding")
        if not isinstance(embedding, dict):
            raise EmbeddingError("Gemini embedding provider returned a malformed response")
        values = embedding.get("values")
        return _coerce_float_vector(values, "Gemini embedding provider")


class HuggingFaceEmbeddingProvider:
    provider_name = "huggingface"

    def __init__(
        self,
        api_key: str | None,
        url: str | None,
        model: str,
        expected_dimension: int,
        timeout_seconds: float,
    ) -> None:
        self.api_key = api_key
        self.url = url
        self.model = model
        self.expected_dimension = expected_dimension
        self.timeout_seconds = timeout_seconds

    def embed(self, text: str) -> list[float]:
        if not self.api_key:
            raise EmbeddingError("HF_API_KEY is required when EMBEDDING_PROVIDER=huggingface")
        if not self.url:
            raise EmbeddingError("HF_EMBEDDING_URL is required when EMBEDDING_PROVIDER=huggingface")

        response = _post_json(
            self.url,
            {"inputs": text, "options": {"wait_for_model": True}},
            {"Authorization": f"Bearer {self.api_key}"},
            self.timeout_seconds,
            "Hugging Face embedding provider",
        )
        vector = self._parse_embedding(response)
        return validate_embedding_vector(
            vector,
            expected_dimension=self.expected_dimension,
            provider_name="Hugging Face embedding provider",
        )

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        return [self.embed(text) for text in texts]

    def _parse_embedding(self, response: Any) -> list[float]:
        if isinstance(response, dict):
            if "error" in response:
                raise EmbeddingError("Hugging Face embedding provider returned an error")
            if "embedding" in response:
                return _coerce_float_vector(response["embedding"], "Hugging Face embedding provider")
            if "embeddings" in response:
                response = response["embeddings"]
            elif "features" in response:
                response = response["features"]
            else:
                raise EmbeddingError("Hugging Face embedding provider returned a malformed response")

        if not isinstance(response, list) or not response:
            raise EmbeddingError("Hugging Face embedding provider returned a malformed response")
        if all(isinstance(item, (int, float)) for item in response):
            return _coerce_float_vector(response, "Hugging Face embedding provider")
        if all(isinstance(item, list) for item in response):
            if len(response) == 1 and response and all(isinstance(item, list) for item in response[0]):
                return self._parse_embedding(response[0])
            nested = [_coerce_float_vector(item, "Hugging Face embedding provider") for item in response]
            if len(nested) == 1:
                return nested[0]
            return _mean_pool(nested, "Hugging Face embedding provider")

        raise EmbeddingError("Hugging Face embedding provider returned a malformed response")


class FallbackEmbeddingProvider:
    def __init__(self, primary: EmbeddingProvider, fallback: EmbeddingProvider) -> None:
        self.primary = primary
        self.fallback = fallback

    def embed(self, text: str) -> list[float]:
        try:
            return self.primary.embed(text)
        except RecoverableEmbeddingError:
            return self.fallback.embed(text)

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        try:
            return self.primary.embed_batch(texts)
        except RecoverableEmbeddingError:
            return self.fallback.embed_batch(texts)


def _provider_from_settings(provider_name: str, settings: Settings) -> EmbeddingProvider:
    if provider_name not in SUPPORTED_EMBEDDING_PROVIDERS:
        supported = ", ".join(sorted(SUPPORTED_EMBEDDING_PROVIDERS))
        raise EmbeddingError(f"Unsupported EMBEDDING_PROVIDER '{provider_name}'. Supported values: {supported}")
    if provider_name == "local":
        return SentenceTransformerEmbeddingProvider(expected_dimension=settings.embedding_dimension)
    if provider_name == "gemini":
        return GeminiEmbeddingProvider(
            api_key=settings.gemini_api_key,
            model=settings.gemini_embedding_model,
            output_dimension=settings.gemini_embedding_output_dimension,
            expected_dimension=settings.embedding_dimension,
            timeout_seconds=settings.embedding_timeout_seconds,
        )
    return HuggingFaceEmbeddingProvider(
        api_key=settings.hf_api_key,
        url=settings.hf_embedding_url,
        model=settings.hf_embedding_model,
        expected_dimension=settings.embedding_dimension,
        timeout_seconds=settings.embedding_timeout_seconds,
    )


@lru_cache
def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    primary = _provider_from_settings(settings.embedding_provider, settings)
    fallback_name = settings.embedding_fallback_provider
    if not fallback_name:
        return primary
    if settings.embedding_provider == "gemini" and fallback_name == "huggingface":
        return FallbackEmbeddingProvider(primary, _provider_from_settings(fallback_name, settings))
    raise EmbeddingError(
        "EMBEDDING_FALLBACK_PROVIDER is only supported as 'huggingface' when EMBEDDING_PROVIDER=gemini"
    )
