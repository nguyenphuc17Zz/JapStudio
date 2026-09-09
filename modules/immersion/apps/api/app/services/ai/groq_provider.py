import json
import re
import time
import asyncio
from typing import Optional, List, Dict, Any
import httpx
from app.core.config import settings
from app.core.logging import get_logger
from app.core.secrets_guard import redact_secrets
from app.core.rate_limiter import (
    ai_rate_limiter_manager,
    extract_provider_retry_delay,
    calculate_decorrelated_jitter,
)
from app.services.ai.base import AIProviderBase, AIModelMeta, AIGenerationResult, normalize_model_id


logger = get_logger("services.ai.groq")


class GroqAIProvider(AIProviderBase):
    """Groq ultra-fast inference with dynamic model discovery and JSON mode."""

    name = "groq"
    display_name = "Groq Cloud (Llama 3 / Mixtral)"
    requires_key = True

    BASE_URL = "https://api.groq.com/openai/v1"

    @property
    def is_configured(self) -> bool:
        return bool(settings.GROQ_API_KEY and len(settings.GROQ_API_KEY.strip()) > 5)

    _custom_model: Optional[str] = None

    @property
    def default_model(self) -> str:
        if self._custom_model:
            return self._custom_model
        # Honor Settings (same pattern as gemini): a model chosen in Settings
        # survives restarts via .env even before any runtime re-select.
        if (settings.DEFAULT_AI_PROVIDER or "").lower() == "groq" and settings.DEFAULT_AI_MODEL:
            return settings.DEFAULT_AI_MODEL
        return "llama-3.3-70b-versatile"

    @default_model.setter
    def default_model(self, value: str) -> None:
        self._custom_model = value

    async def list_models(self, api_key: Optional[str] = None) -> List[AIModelMeta]:
        active_key = (api_key or settings.GROQ_API_KEY or "").strip()
        if not active_key or len(active_key) < 5:
            return await self._fallback_models()

        try:
            headers = {"Authorization": f"Bearer {active_key}"}
            async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
                resp = await client.get(f"{self.BASE_URL}/models", headers=headers)
                resp.raise_for_status()
                data = resp.json()

                discovered: List[AIModelMeta] = []
                for item in data.get("data", []):
                    model_id = item.get("id", "")
                    if "whisper" in model_id.lower() or "guard" in model_id.lower():
                        continue  # Skip speech & moderation models
                    
                    is_70b = "70b" in model_id.lower()
                    discovered.append(
                        AIModelMeta(
                            id=model_id,
                            name=model_id,
                            provider="groq",
                            description=f"Groq hosted {model_id}",
                            context_window=item.get("context_window", 128000),
                            pricing_input_1m=0.59 if is_70b else 0.05,
                            pricing_output_1m=0.79 if is_70b else 0.08,
                            is_active=(model_id == self.default_model)
                        )
                    )
                return discovered if discovered else await self._fallback_models()
        except Exception:
            return await self._fallback_models()

    async def test_connection(self, api_key: Optional[str] = None) -> tuple[bool, str, List[AIModelMeta]]:
        active_key = api_key if api_key is not None else settings.GROQ_API_KEY
        active_key = (active_key or "").strip()
        if not active_key:
            return False, "Chưa cung cấp API Key cho Groq Cloud.", []

        try:
            headers = {"Authorization": f"Bearer {active_key}"}
            async with httpx.AsyncClient(timeout=12.0) as client:
                resp = await client.get(f"{self.BASE_URL}/models", headers=headers)
                if resp.status_code in [400, 401, 403]:
                    err_msg = "API Key Groq không hợp lệ hoặc bị từ chối truy cập."
                    try:
                        err_detail = resp.json().get("error", {}).get("message")
                        if err_detail:
                            err_msg = f"Lỗi Groq: {err_detail}"
                    except Exception:
                        pass
                    return False, err_msg, []
                resp.raise_for_status()
                models = await self.list_models(api_key=active_key)
                return True, f"Kết nối Groq Cloud thành công! Tìm thấy {len(models)} models.", models
        except Exception as e:
            return False, f"Không thể kết nối tới Groq Cloud: {redact_secrets(str(e))}", []


    async def _fallback_models(self) -> List[AIModelMeta]:
        return [
            AIModelMeta(
                id="llama-3.3-70b-versatile",
                name="Llama 3.3 70B Versatile",
                provider="groq",
                description="Groq high speed",
                context_window=128000,
                pricing_input_1m=0.59,
                pricing_output_1m=0.79,
                is_active=True
            )
        ]

    @staticmethod
    def _extract_provider_error(exc_or_resp: Any) -> str:
        """Surfaces the provider's real error body (sanitized), not just HTTP status."""
        try:
            if isinstance(exc_or_resp, httpx.Response):
                resp = exc_or_resp
            else:
                resp = getattr(exc_or_resp, "response", None)
            if resp is not None:
                try:
                    body = resp.json()
                except Exception:
                    body = None
                if isinstance(body, dict):
                    err = body.get("error", {})
                    if isinstance(err, dict) and err.get("message"):
                        msg = str(err.get("message"))
                        code = err.get("code")
                        return f"{msg} (code: {code})" if code else msg
                    if isinstance(err, str) and err:
                        return err
                try:
                    text = resp.text or ""
                except Exception:
                    text = ""
                if text.strip():
                    return text.strip()[:500]
        except Exception:
            pass
        return ""

    # Model families with explicit chain-of-thought reasoning. Groq requires
    # reasoning_format parsed|hidden (never default raw) when they use JSON
    # mode, otherwise reasoning traces corrupt the JSON (400 json_validate_failed).
    # Never send reasoning_* params to other families (Groq 400s unknown params).
    _REASONING_MODEL_HINTS = ("qwen", "qwq", "r1-distill", "deepseek-r1", "reasoning")

    @classmethod
    def _uses_reasoning(cls, model_id: str) -> bool:
        mid = (model_id or "").lower()
        return any(h in mid for h in cls._REASONING_MODEL_HINTS)

    @staticmethod
    def _is_format_rejection(message: str) -> bool:
        """True when the provider rejected the JSON/reasoning envelope (retryable
        with a different envelope, same model)."""
        msg = (message or "").lower()
        if "response_format" in msg:
            return True
        if "json" not in msg:
            return False
        return any(
            k in msg
            for k in (
                "not supported",
                "invalid",
                "validate",
                "failed_generation",
                "failed generation",
                "must contain",
            )
        )

    @staticmethod
    def _parse_json_lenient(raw_text: str) -> Dict[str, Any]:
        """Parses model JSON output, tolerating markdown fences and prose."""
        text = (raw_text or "").strip()
        try:
            return json.loads(text)
        except Exception:
            pass
        fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if fence:
            try:
                return json.loads(fence.group(1).strip())
            except Exception:
                pass
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except Exception:
                pass
        raise ValueError("Groq không trả về JSON hợp lệ.")

    async def _post_chat(
        self,
        client: httpx.AsyncClient,
        headers: Dict[str, str],
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        # 1. Proactive Rate Limiting via Central Token Bucket (30 RPM Groq Free Tier safe)
        await ai_rate_limiter_manager.acquire("groq")

        max_attempts = 4
        prev_sleep = 2.0
        chosen_model = payload.get("model", "unknown")

        for attempt in range(max_attempts):
            resp = await client.post(f"{self.BASE_URL}/chat/completions", headers=headers, json=payload)

            # 2. Adaptive Backoff on 429 Too Many Requests or 503 Service Unavailable
            if resp.status_code in (429, 503):
                if attempt < max_attempts - 1:
                    groq_delay = extract_provider_retry_delay(resp, "groq")
                    if groq_delay and groq_delay > 0:
                        sleep_time = min(30.0, groq_delay + 0.5)
                        logger.warning(
                            f"Groq Cloud 429/503 (attempt {attempt + 1}/{max_attempts}): "
                            f"Groq requested retryDelay={groq_delay}s. Sleeping {sleep_time:.2f}s."
                        )
                    else:
                        sleep_time = calculate_decorrelated_jitter(base=2.0, prev_sleep=prev_sleep, cap=25.0)
                        logger.warning(
                            f"Groq Cloud {resp.status_code} (attempt {attempt + 1}/{max_attempts}): "
                            f"Decorrelated Jitter sleeping {sleep_time:.2f}s."
                        )
                    prev_sleep = sleep_time
                    await asyncio.sleep(sleep_time)
                    continue
                else:
                    groq_delay = extract_provider_retry_delay(resp, "groq")
                    delay_msg = f" (Groq yêu cầu chờ {groq_delay:.1f}s)" if groq_delay else ""
                    raise ValueError(
                        f"Groq Cloud đã vượt giới hạn tốc độ/quota (429 Too Many Requests){delay_msg}. "
                        f"Hệ thống đã tự động thử lại {max_attempts} lần theo thuật toán điều tốc với model '{chosen_model}'. "
                        f"Vui lòng đợi một lát hoặc chọn model khác trên header."
                    )

            # Handle other HTTP errors (400, 401, 404, etc.)
            if resp.status_code >= 400:
                detail = self._extract_provider_error(resp)
                status = resp.status_code
                hint = ""
                if status == 401 or "invalid_api_key" in detail.lower() or "authentication" in detail.lower():
                    hint = " Kiểm tra lại API Key trong Settings."
                elif status == 404 or ("model" in detail.lower() and ("not found" in detail.lower() or "does not exist" in detail.lower())):
                    hint = " Model không tồn tại trên Groq — vào Enrichment chọn model mới."
                clean = redact_secrets(detail) if detail else f"HTTP {status}"
                raise ValueError(f"Groq từ chối request ({status}): {clean}.{hint}")

            return resp.json()

        raise ValueError(f"Groq không thể hoàn thành request sau {max_attempts} lần thử.")

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_schema: Dict[str, Any],
        model: Optional[str] = None,
        temperature: float = 0.2
    ) -> AIGenerationResult:
        if not self.is_configured:
            raise ValueError("GROQ_API_KEY is not configured in settings")

        chosen_model = normalize_model_id(model or self.default_model)
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY.strip()}",
            "Content-Type": "application/json"
        }

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": f"{system_instruction}\nRespond ONLY in valid JSON conforming to the requested schema."})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": chosen_model,
            "messages": messages,
            "temperature": temperature,
            "response_format": {"type": "json_object"}
        }

        start_time = time.time()
        res_data = None
        tier1_error: Optional[Exception] = None
        async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
            # Tier 1: plain json_object (fast path for well-behaved models).
            try:
                res_data = await self._post_chat(client, headers, payload)
            except ValueError as ve:
                if not self._is_format_rejection(str(ve)):
                    raise
                tier1_error = ve
                logger.debug(f"Groq tier-1 json_object rejected for {chosen_model}: {ve}")

            # Tier 2 (reasoning models only): keep json_object but hide the
            # chain-of-thought so it cannot corrupt the JSON envelope.
            if res_data is None and tier1_error is not None and self._uses_reasoning(chosen_model):
                hidden = dict(payload)
                hidden["reasoning_format"] = "hidden"
                # Qwen 3.6 supports none/default effort; keep minimal otherwise.
                if "qwen3.6" in chosen_model.lower() or "qwen3-32b" in chosen_model.lower():
                    hidden["reasoning_effort"] = "none"
                try:
                    res_data = await self._post_chat(client, headers, hidden)
                    logger.info(f"Groq tier-2 reasoning-hidden succeeded for {chosen_model}")
                except ValueError as ve2:
                    # reasoning_* params themselves rejected -> fall to tier 3.
                    logger.debug(f"Groq tier-2 rejected for {chosen_model}: {ve2}")

            # Tier 3: drop response_format entirely, parse leniently.
            if res_data is None and tier1_error is not None:
                plain = dict(payload)
                plain.pop("response_format", None)
                plain.pop("reasoning_format", None)
                plain.pop("reasoning_effort", None)
                res_data = await self._post_chat(client, headers, plain)
                logger.info(f"Groq tier-3 plain mode succeeded for {chosen_model}")

        latency_ms = int((time.time() - start_time) * 1000)

        choices = res_data.get("choices", [])
        if not choices:
            raise ValueError("Groq returned empty choices")

        raw_text = choices[0].get("message", {}).get("content", "{}")
        structured_data = self._parse_json_lenient(raw_text)

        usage = res_data.get("usage", {})
        input_tokens = usage.get("prompt_tokens", 0)
        output_tokens = usage.get("completion_tokens", 0)
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
        is_70b = "70b" in model.lower()
        in_rate = (0.59 / 1_000_000) if is_70b else (0.05 / 1_000_000)
        out_rate = (0.79 / 1_000_000) if is_70b else (0.08 / 1_000_000)
        return round((input_tokens * in_rate) + (output_tokens * out_rate), 6)
