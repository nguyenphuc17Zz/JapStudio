from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AiCapabilitiesSchema(BaseModel):
    generate: bool
    generate_structured: bool
    stream: bool


class ProviderStatusSchema(BaseModel):
    name: str
    configured: bool
    available: bool
    default_model: str
    capabilities: AiCapabilitiesSchema


class ProviderStatusResponse(BaseModel):
    default_provider: str
    fallback_providers: list[str]
    providers: list[ProviderStatusSchema]


class ProviderCredentialSchema(BaseModel):
    configured: bool
    api_key_masked: str | None = None
    base_url: str | None = None
    default_model: str | None = None


class ProviderConfigResponse(BaseModel):
    gemini: ProviderCredentialSchema
    groq: ProviderCredentialSchema
    ollama: ProviderCredentialSchema


class ProviderConfigUpdate(BaseModel):
    gemini_api_key: str | None = Field(default=None, max_length=500)
    gemini_default_model: str | None = Field(default=None, max_length=200)
    groq_api_key: str | None = Field(default=None, max_length=500)
    groq_default_model: str | None = Field(default=None, max_length=200)
    ollama_base_url: str | None = Field(default=None, max_length=500)
    ollama_default_model: str | None = Field(default=None, max_length=200)
    default_provider: str | None = Field(default=None, max_length=50)


class ModelInfoSchema(BaseModel):
    id: str
    provider: str
    display_name: str | None = None
    owned_by: str | None = None


class ProviderModelsResponse(BaseModel):
    provider: str
    models: list[ModelInfoSchema] = []
    error: str | None = None


class AiGenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=20000)
    provider: str | None = None
    model: str | None = None
    system: str | None = Field(default=None, max_length=8000)
    temperature: float | None = Field(default=None, ge=0.0, le=2.0)


class AiUsageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    extra: dict[str, Any] | None = None


class AiGenerateResponse(BaseModel):
    text: str
    provider: str
    model: str
    usage: AiUsageSchema | None = None
