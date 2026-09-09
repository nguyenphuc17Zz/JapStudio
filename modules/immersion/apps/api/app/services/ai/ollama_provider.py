import json
import time
from typing import Optional, List, Dict, Any
import httpx
from app.core.config import settings
from app.core.secrets_guard import redact_secrets
from app.services.ai.base import AIProviderBase, AIModelMeta, AIGenerationResult, normalize_model_id


class OllamaAIProvider(AIProviderBase):
    """Local Ollama instance integration with local tags discovery and zero API cost."""

    name = "ollama"
    display_name = "Local Ollama (Offline / Private)"
    requires_key = False

    @property
    def base_url(self) -> str:
        return settings.OLLAMA_BASE_URL.rstrip("/")

    @property
    def is_configured(self) -> bool:
        # Ollama requires no key, but requires endpoint to be specified
        return bool(self.base_url)

    _custom_model: Optional[str] = None

    @property
    def default_model(self) -> str:
        if self._custom_model:
            return self._custom_model
        # Honor Settings (same pattern as gemini).
        if (settings.DEFAULT_AI_PROVIDER or "").lower() == "ollama" and settings.DEFAULT_AI_MODEL:
            return settings.DEFAULT_AI_MODEL
        return "qwen2.5:latest"

    @default_model.setter
    def default_model(self, value: str) -> None:
        self._custom_model = value

    async def list_models(self) -> List[AIModelMeta]:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                if resp.status_code == 200:
                    data = resp.json()
                    models = []
                    for item in data.get("models", []):
                        m_name = item.get("name", "")
                        models.append(
                            AIModelMeta(
                                id=m_name,
                                name=m_name,
                                provider="ollama",
                                description=f"Local Ollama model {m_name}",
                                context_window=32768,
                                pricing_input_1m=0.0,
                                pricing_output_1m=0.0,
                                is_active=(m_name == self.default_model)
                            )
                        )
                    if models:
                        return models
        except Exception:
            pass

        # Return fallback local models list if Ollama is not currently active
        return [
            AIModelMeta(
                id="qwen2.5:latest",
                name="Qwen 2.5 (Local Default)",
                provider="ollama",
                description="Strong multilingual & Japanese reasoning",
                context_window=32768,
                pricing_input_1m=0.0,
                pricing_output_1m=0.0,
                is_active=True
            ),
            AIModelMeta(
                id="llama3.2:latest",
                name="Llama 3.2 (Local)",
                provider="ollama",
                description="Fast local inference",
                context_window=16384,
                pricing_input_1m=0.0,
                pricing_output_1m=0.0,
                is_active=False
            )
        ]

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.2
    ) -> AIGenerationResult:
        chosen_model = normalize_model_id(model or self.default_model)

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": f"{system_instruction}\nRespond ONLY in valid JSON conforming to the requested schema."})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": chosen_model,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": temperature
            }
        }

        start_time = time.time()
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            try:
                resp.raise_for_status()
            except httpx.HTTPStatusError as http_err:
                raise ValueError(f"Ollama từ chối request: {redact_secrets(str(http_err))}")
            res_data = resp.json()

        latency_ms = int((time.time() - start_time) * 1000)

        raw_text = res_data.get("message", {}).get("content", "{}")
        structured_data = json.loads(raw_text)

        input_tokens = res_data.get("prompt_eval_count", 0)
        output_tokens = res_data.get("eval_count", 0)

        return AIGenerationResult(
            structured_data=structured_data,
            raw_text=raw_text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=0.0,
            latency_ms=latency_ms,
            model_provider=self.name,
            model_name=chosen_model
        )

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        return 0.0
