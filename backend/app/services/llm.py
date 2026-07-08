from functools import lru_cache
from typing import Protocol

from backend.app.core.config import get_settings


class LLMError(RuntimeError):
    pass


class LLMProvider(Protocol):
    def generate(self, prompt: str) -> str:
        ...


class GroqLLMProvider:
    def __init__(
        self,
        api_key: str | None,
        model: str,
        max_tokens: int,
        reasoning_effort: str | None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.max_tokens = max_tokens
        self.reasoning_effort = reasoning_effort

    def generate(self, prompt: str) -> str:
        if not self.api_key:
            raise LLMError("GROQ_API_KEY is not configured")

        try:
            from groq import Groq
        except ImportError as exc:
            raise LLMError("groq Python package is not installed") from exc

        try:
            client = Groq(api_key=self.api_key)
            completion = client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a concise academic advising assistant that only answers from provided "
                            "context. Return only the final student-facing answer. Do not include hidden "
                            "reasoning, analysis, or <think> tags."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=self.max_tokens,
                **self.reasoning_options(),
            )
        except Exception as exc:
            raise LLMError(f"Groq request failed: {exc}") from exc

        try:
            content = completion.choices[0].message.content
        except (AttributeError, IndexError, TypeError) as exc:
            raise LLMError("Groq response did not include generated content") from exc

        if not content:
            raise LLMError("Groq response did not include generated content")
        return content.strip()

    def reasoning_options(self) -> dict[str, str]:
        if not self.reasoning_effort or not is_qwen_model(self.model):
            return {}
        return {"reasoning_effort": self.reasoning_effort}


@lru_cache
def get_llm_provider() -> GroqLLMProvider:
    settings = get_settings()
    return GroqLLMProvider(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        max_tokens=settings.groq_max_tokens,
        reasoning_effort=settings.groq_reasoning_effort,
    )


def is_qwen_model(model: str) -> bool:
    return "qwen" in model.lower()
