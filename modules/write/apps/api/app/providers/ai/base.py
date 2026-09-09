from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any, ClassVar

from pydantic import BaseModel


@dataclass
class AIUsage:
    """Normalized token usage. Individual fields may be None when the provider
    does not report them."""

    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    extra: dict[str, Any] | None = None


@dataclass
class AIRequest:
    """Normalized generation request passed to every provider."""

    prompt: str
    system: str | None = None
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class AIGenerationResult:
    """Normalized result returned by every AI provider."""

    text: str
    provider: str
    model: str
    usage: AIUsage | None = None
    raw: Any = None


@dataclass
class AIStreamChunk:
    """One streaming delta plus enough metadata to reconstruct the response.

    ``is_final=True`` marks the last chunk; the final chunk carries the
    aggregated usage when the provider reports it.
    """

    text: str
    provider: str
    model: str
    is_final: bool = False
    usage: AIUsage | None = None
    metadata: dict[str, Any] | None = None


@dataclass(frozen=True)
class AICapabilities:
    """Capabilities a provider supports."""

    generate: bool = True
    generate_structured: bool = True
    stream: bool = True


@dataclass(frozen=True)
class AIModelInfo:
    """One model advertised by a provider (from its list-models API)."""

    id: str
    provider: str
    display_name: str | None = None
    owned_by: str | None = None


class AIProvider(ABC):
    """Interface every AI provider (Gemini, Groq, Ollama, fake, ...) must implement.

    Business logic must depend on this interface (or on the AIRouter),
    never on a concrete provider implementation.
    """

    name: ClassVar[str] = "base"
    default_model: ClassVar[str] = ""
    capabilities: ClassVar[AICapabilities] = AICapabilities()

    @abstractmethod
    def validate_configuration(self) -> None:
        """Raise AIConfigurationError if this provider cannot be used."""

    @abstractmethod
    async def is_available(self) -> bool:
        """Lightweight availability probe (no paid API calls)."""

    @abstractmethod
    async def list_models(self) -> list[AIModelInfo]:
        """Query the provider for its advertised models (diagnostics use only)."""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AIGenerationResult:
        """Normal free-form text generation."""

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        *,
        system: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        **kwargs: Any,
    ) -> tuple[BaseModel, AIGenerationResult]:
        """Generation guaranteed to validate against the given Pydantic model."""

    @abstractmethod
    def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[AIStreamChunk]:
        """Token-by-token streaming generation."""
