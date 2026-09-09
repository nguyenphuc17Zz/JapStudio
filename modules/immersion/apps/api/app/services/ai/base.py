from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import re


def normalize_model_id(model: Optional[str]) -> str:
    """Normalizes a model reference into a provider API id.

    Defensive against display names (e.g. "Gemini 3.5 Flash Lite") leaking
    into API calls where an id ("gemini-3.5-flash-lite") is required:
    strips "models/" prefixes and converts whitespace to dashes.
    Ids without whitespace pass through untouched.
    """
    cleaned = (model or "").strip().replace("models/", "")
    if re.search(r"\s", cleaned):
        cleaned = re.sub(r"\s+", "-", cleaned.strip().lower())
    return cleaned


class AIModelMeta(BaseModel):
    """Metadata for an AI model discovered from a provider."""
    id: str
    name: str
    provider: str
    description: Optional[str] = None
    context_window: Optional[int] = None
    pricing_input_1m: float = 0.0
    pricing_output_1m: float = 0.0
    is_active: bool = False


class AIGenerationResult(BaseModel):
    """Structured generation output and audit telemetry from an AI provider."""
    structured_data: Dict[str, Any]
    raw_text: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    estimated_cost: float = 0.0
    latency_ms: int = 0
    model_provider: str
    model_name: str


class AIProviderBase(ABC):
    """Abstract base class for all AI model providers."""

    name: str
    display_name: str
    requires_key: bool = True

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """Returns True if the provider has necessary API keys or active endpoints."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Returns the default recommended model name for this provider."""
        pass

    @abstractmethod
    async def list_models(self) -> List[AIModelMeta]:
        """Dynamically queries the provider's API to list available models."""
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.2
    ) -> AIGenerationResult:
        """Calls the AI provider with JSON schema enforcement and returns structured data."""
        pass

    @abstractmethod
    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculates estimated cost in USD based on model token counts."""
        pass
