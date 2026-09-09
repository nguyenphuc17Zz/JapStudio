import json
import time
import asyncio
import logging
from typing import Optional, List, Dict, Any
import httpx
from app.core.config import settings
from app.core.secrets_guard import redact_secrets
from app.core.rate_limiter import (
    AsyncTokenBucket,
    ai_rate_limiter_manager,
    extract_provider_retry_delay,
    calculate_decorrelated_jitter,
)
from app.services.ai.base import AIProviderBase, AIModelMeta, AIGenerationResult, normalize_model_id

logger = logging.getLogger(__name__)


class GeminiAIProvider(AIProviderBase):
    """Google AI Studio Gemini API integration with dynamic model discovery and structured output."""

    name = "gemini"
    display_name = "Google AI Studio (Gemini)"
    requires_key = True

    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

    @property
    def is_configured(self) -> bool:
        return bool(settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY.strip()) > 5)

    _custom_model: Optional[str] = None

    @classmethod
    def get_rate_limiter(cls) -> Optional[AsyncTokenBucket]:
        return ai_rate_limiter_manager.get_bucket("gemini")

    @property
    def default_model(self) -> str:
        if self._custom_model:
            return self._custom_model
        return settings.DEFAULT_AI_MODEL or "gemini-3.6-flash"

    @default_model.setter
    def default_model(self, value: str) -> None:
        self._custom_model = value

    async def list_models(self, api_key: Optional[str] = None) -> List[AIModelMeta]:
        """Queries Google AI Studio API for available models."""
        active_key = (api_key or settings.GEMINI_API_KEY or "").strip()
        if not active_key or len(active_key) < 5:
            return await self._fallback_models()

        try:
            async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
                # Header auth (never ?key= in URL: URLs leak into exception text).
                url = f"{self.BASE_URL}/models"
                resp = await client.get(url, headers={"x-goog-api-key": active_key})
                resp.raise_for_status()
                data = resp.json()

                discovered: List[AIModelMeta] = []
                for item in data.get("models", []):
                    model_id = item.get("name", "").replace("models/", "")
                    supported_methods = item.get("supportedGenerationMethods", [])
                    if "generateContent" not in supported_methods:
                        continue
                    if "gemini" not in model_id.lower():
                        continue

                    # Determine pricing estimates
                    input_price = 0.10 if "flash" in model_id else 1.25
                    output_price = 0.40 if "flash" in model_id else 5.00

                    discovered.append(
                        AIModelMeta(
                            id=model_id,
                            name=item.get("displayName") or model_id,
                            provider="gemini",
                            description=item.get("description", ""),
                            context_window=item.get("inputTokenLimit", 1000000),
                            pricing_input_1m=input_price,
                            pricing_output_1m=output_price,
                            is_active=(model_id == self.default_model)
                        )
                    )
                return discovered if discovered else await self._fallback_models()
        except Exception:
            return await self._fallback_models()

    async def test_connection(self, api_key: Optional[str] = None) -> tuple[bool, str, List[AIModelMeta]]:
        active_key = api_key if api_key is not None else settings.GEMINI_API_KEY
        active_key = (active_key or "").strip()
        if not active_key:
            return False, "Chưa cung cấp API Key cho Google Gemini.", []

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                url = f"{self.BASE_URL}/models"
                resp = await client.get(url, headers={"x-goog-api-key": active_key})
                if resp.status_code in [400, 401, 403]:
                    err_msg = "API Key Google Gemini không hợp lệ hoặc bị từ chối."
                    try:
                        err_detail = resp.json().get("error", {}).get("message")
                        if err_detail:
                            err_msg = f"Lỗi Google: {err_detail}"
                    except Exception:
                        pass
                    return False, err_msg, []
                resp.raise_for_status()
                models = await self.list_models(api_key=active_key)
                return True, f"Kết nối Google AI Studio thành công! Tìm thấy {len(models)} models.", models
        except Exception as e:
            return False, f"Không thể kết nối Google AI Studio: {redact_secrets(str(e))}", []


    async def _fallback_models(self) -> List[AIModelMeta]:
        return [
            AIModelMeta(
                id="gemini-3.5-flash-lite",
                name="Gemini 3.5 Flash Lite",
                provider="gemini",
                description="High speed lightweight model with rich quota",
                context_window=1048576,
                pricing_input_1m=0.075,
                pricing_output_1m=0.30,
                is_active=False,
            ),
            AIModelMeta(
                id="gemini-3.6-flash",
                name="Gemini 3.6 Flash",
                provider="gemini",
                description="Fast structured output and high intelligence",
                context_window=1048576,
                pricing_input_1m=0.10,
                pricing_output_1m=0.40,
                is_active=True,
            ),
            AIModelMeta(
                id="gemini-3.5-flash",
                name="Gemini 3.5 Flash",
                provider="gemini",
                description="Balanced intelligence and low latency",
                context_window=1048576,
                pricing_input_1m=0.10,
                pricing_output_1m=0.40,
                is_active=False,
            ),
            AIModelMeta(
                id="gemini-2.5-pro",
                name="Gemini 2.5 Pro",
                provider="gemini",
                description="Advanced reasoning model",
                context_window=1048576,
                pricing_input_1m=1.25,
                pricing_output_1m=5.00,
                is_active=False,
            ),
        ]

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.2
    ) -> AIGenerationResult:
        if not self.is_configured:
            raise ValueError("GEMINI_API_KEY is not configured in settings")

        chosen_model = normalize_model_id(model or self.default_model)

        # Auth via header (NOT ?key= query string: URLs end up inside
        # httpx exception messages, which would leak the key to users/logs).
        url = f"{self.BASE_URL}/models/{chosen_model}:generateContent"
        api_headers = {"x-goog-api-key": settings.GEMINI_API_KEY.strip()}

        generation_config: Dict[str, Any] = {
            "temperature": temperature,
            "response_mime_type": "application/json",
        }
        if response_schema and isinstance(response_schema, dict):
            generation_config["responseSchema"] = response_schema

        payload: Dict[str, Any] = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}]
                }
            ],
            "generationConfig": generation_config
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        # 1. Proactive Rate Limiting via Central Token Bucket (15 RPM Gemini Free Tier safe)
        await ai_rate_limiter_manager.acquire("gemini")

        start_time = time.time()
        res_data = None
        prev_sleep = 2.0
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
            max_attempts = 4
            for attempt in range(max_attempts):
                try:
                    resp = await client.post(url, json=payload, headers=api_headers)
                    if resp.status_code in (503, 429) and attempt < max_attempts - 1:
                        google_delay = extract_provider_retry_delay(resp, "gemini")
                        if google_delay and google_delay > 0:
                            sleep_time = min(30.0, google_delay + 0.5)
                            logger.warning(
                                f"Google Gemini 429 (attempt {attempt + 1}/{max_attempts}): "
                                f"Google requested retryDelay={google_delay}s. Sleeping {sleep_time:.2f}s."
                            )
                        else:
                            sleep_time = calculate_decorrelated_jitter(base=2.5, prev_sleep=prev_sleep, cap=25.0)
                            logger.warning(
                                f"Google Gemini {resp.status_code} (attempt {attempt + 1}/{max_attempts}): "
                                f"Decorrelated Jitter sleeping {sleep_time:.2f}s."
                            )
                        prev_sleep = sleep_time
                        await asyncio.sleep(sleep_time)
                        continue

                    if resp.status_code == 404:
                        err_text = ""
                        try:
                            err_text = resp.json().get("error", {}).get("message", "")
                        except Exception:
                            pass
                        raise ValueError(f"Model '{chosen_model}' không khả dụng ({err_text or '404 Not Found'}). Hãy chọn model khác trên header.")

                    if resp.status_code == 429:
                        google_delay = extract_provider_retry_delay(resp, "gemini")
                        delay_msg = f" (Google yêu cầu chờ {google_delay:.1f}s)" if google_delay else ""
                        raise ValueError(
                            f"Google Gemini đã vượt giới hạn tốc độ/quota (429 Too Many Requests){delay_msg}. "
                            f"Hệ thống đã tự động thử lại {max_attempts} lần theo thuật toán điều tốc với model '{chosen_model}'. "
                            f"Vui lòng đợi một lát hoặc chọn model khác (ví dụ Groq llama-3.3-70b hoặc gemini-3.5-flash-lite) trên header."
                        )

                    resp.raise_for_status()
                    res_data = resp.json()
                    break
                except httpx.HTTPStatusError as err:
                    if err.response.status_code in (503, 429) and attempt < max_attempts - 1:
                        google_delay = extract_provider_retry_delay(err.response, "gemini")
                        if google_delay and google_delay > 0:
                            sleep_time = min(30.0, google_delay + 0.5)
                        else:
                            sleep_time = calculate_decorrelated_jitter(base=2.5, prev_sleep=prev_sleep, cap=25.0)
                        prev_sleep = sleep_time
                        await asyncio.sleep(sleep_time)
                        continue
                    if err.response.status_code == 429:
                        google_delay = extract_provider_retry_delay(err.response, "gemini")
                        delay_msg = f" (Google yêu cầu chờ {google_delay:.1f}s)" if google_delay else ""
                        raise ValueError(
                            f"Google Gemini đã vượt giới hạn tốc độ/quota (429 Too Many Requests){delay_msg}. "
                            f"Hệ thống đã tự động thử lại {max_attempts} lần theo thuật toán điều tốc với model '{chosen_model}'. "
                            f"Vui lòng đợi một lát hoặc chọn model khác trên header."
                        )
                    raise

        latency_ms = int((time.time() - start_time) * 1000)

        # Parse text from candidates
        candidates = res_data.get("candidates", []) if isinstance(res_data, dict) else []
        if not candidates:
            raise ValueError("Gemini returned empty candidates")

        raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
        try:
            structured_data = json.loads(raw_text)
        except Exception:
            clean = raw_text.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            structured_data = json.loads(clean.strip())

        # Token telemetry
        usage = res_data.get("usageMetadata", {})
        input_tokens = usage.get("promptTokenCount", 0)
        output_tokens = usage.get("candidatesTokenCount", 0)
        estimated_cost = self.estimate_cost(chosen_model, input_tokens, output_tokens)

        return AIGenerationResult(
            structured_data=structured_data,
            raw_text=raw_text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=estimated_cost,
            latency_ms=latency_ms,
            model_provider=self.name,
            model_name=chosen_model
        )

    def estimate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        if "pro" in model.lower():
            in_rate = 1.25 / 1_000_000
            out_rate = 5.00 / 1_000_000
        else:
            # Flash default
            in_rate = 0.10 / 1_000_000
            out_rate = 0.40 / 1_000_000
        return round((input_tokens * in_rate) + (output_tokens * out_rate), 6)
