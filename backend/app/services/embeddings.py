from functools import lru_cache
from typing import Protocol

from backend.app.core.config import DEFAULT_EMBEDDING_DIMENSIONS, DEFAULT_EMBEDDING_MODEL

EMBEDDING_DIMENSIONS = DEFAULT_EMBEDDING_DIMENSIONS


class EmbeddingError(RuntimeError):
    pass


class EmbeddingProvider(Protocol):
    def embed(self, text: str) -> list[float]:
        ...

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        ...


class SentenceTransformerEmbeddingProvider:
    def __init__(self, model_name: str = DEFAULT_EMBEDDING_MODEL) -> None:
        self.model_name = model_name
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
        for vector in vectors:
            if len(vector) != EMBEDDING_DIMENSIONS:
                raise EmbeddingError(
                    f"Embedding model returned {len(vector)} dimensions; expected {EMBEDDING_DIMENSIONS}"
                )
        return vectors


@lru_cache
def get_embedding_provider() -> SentenceTransformerEmbeddingProvider:
    return SentenceTransformerEmbeddingProvider()
