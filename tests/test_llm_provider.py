import sys
from types import SimpleNamespace

from backend.app.services.llm import GroqLLMProvider


class FakeCompletions:
    def __init__(self) -> None:
        self.kwargs: dict[str, object] | None = None

    def create(self, **kwargs: object) -> SimpleNamespace:
        self.kwargs = kwargs
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="A concise advising answer."))]
        )


class FakeChat:
    def __init__(self) -> None:
        self.completions = FakeCompletions()


class FakeGroqClient:
    last_client: "FakeGroqClient | None" = None

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self.chat = FakeChat()
        FakeGroqClient.last_client = self


def test_qwen_provider_disables_reasoning(monkeypatch) -> None:
    monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=FakeGroqClient))

    provider = GroqLLMProvider(
        api_key="test-key",
        model="qwen/qwen3-32b",
        max_tokens=900,
        reasoning_effort="none",
    )

    assert provider.generate("Answer from context.") == "A concise advising answer."
    kwargs = FakeGroqClient.last_client.chat.completions.kwargs
    assert kwargs["reasoning_effort"] == "none"
    assert kwargs["max_tokens"] == 900
    assert "Do not include hidden reasoning" in kwargs["messages"][0]["content"]


def test_non_qwen_provider_omits_reasoning_effort(monkeypatch) -> None:
    monkeypatch.setitem(sys.modules, "groq", SimpleNamespace(Groq=FakeGroqClient))

    provider = GroqLLMProvider(
        api_key="test-key",
        model="llama-3.1-8b-instant",
        max_tokens=900,
        reasoning_effort="none",
    )

    assert provider.generate("Answer from context.") == "A concise advising answer."
    kwargs = FakeGroqClient.last_client.chat.completions.kwargs
    assert "reasoning_effort" not in kwargs
