"""AI verification, provider disagreement and resolution (Phase 11).

Verification only runs when the quality policy asks for it (high-impact
evaluations, low confidence, contradictions, large score disagreement).
Unavailable verifiers degrade to deterministic checks — never to invented
certainty.

The resolver (``quality_resolution:v1``) decides between primary and verifier
outputs; it must not invent information absent from its inputs.
"""

import logging
from dataclasses import dataclass
from typing import Any

from app.core.config import Settings, get_settings
from app.prompts.evaluation_verification import build_verification_prompt
from app.prompts.quality_resolution import (
    QUALITY_RESOLUTION_PROMPT_VERSION,
    build_resolution_prompt,
)
from app.schemas.evaluation_ai import EvaluationVerificationResult
from app.schemas.quality import QualityResolutionResult

logger = logging.getLogger("app.quality.verification")


@dataclass
class VerificationOutcome:
    """Result of an optional secondary verification pass."""

    accepted: bool
    provider: str | None = None
    model: str | None = None
    notes: str | None = None
    corrected_result: Any | None = None
    prompt_version: str | None = None


@dataclass
class ProviderDisagreement:
    """Detected disagreement between two providers/models on the same metric."""

    metric: str
    primary_value: int
    secondary_value: int
    delta: int
    meaningful: bool
    detail: str = ""


def detect_disagreement(
    primary_scores: dict[str, int],
    secondary_scores: dict[str, int],
    max_delta: int,
) -> list[ProviderDisagreement]:
    """Compare two providers' scores and report meaningful disagreements.

    Disagreements are never averaged blindly; they either stay within the
    configured threshold (ignored) or trigger secondary resolution.
    """
    disagreements: list[ProviderDisagreement] = []
    for metric in sorted(primary_scores):
        if metric not in secondary_scores:
            continue
        primary = primary_scores[metric]
        secondary = secondary_scores[metric]
        delta = abs(primary - secondary)
        if delta > max_delta:
            disagreements.append(
                ProviderDisagreement(
                    metric=metric,
                    primary_value=primary,
                    secondary_value=secondary,
                    delta=delta,
                    meaningful=True,
                    detail=f"{metric}: primary {primary} vs verifier {secondary} (delta {delta})",
                )
            )
    return disagreements


class AIVerificationService:
    """Runs verifier tasks through the shared AI service."""

    def __init__(self, ai_service: Any, settings: Settings | None = None) -> None:
        self._ai = ai_service
        self._settings = settings or get_settings()

    async def verify_evaluation(
        self,
        *,
        exercise: Any,
        answer_text: str,
        evaluation: Any,
        provider: str | None = None,
        model: str | None = None,
    ) -> VerificationOutcome:
        """Secondary verification of a synthesized writing evaluation."""
        system, user = build_verification_prompt(
            exercise, answer_text, evaluation.model_dump(mode="json")
        )
        result, ai_result = await self._ai.generate_structured(
            user,
            EvaluationVerificationResult,
            system=system,
            provider=provider,
            model=model,
            max_tokens=self._settings.ai_exercise_evaluation_max_tokens,
        )
        assert isinstance(result, EvaluationVerificationResult)
        return VerificationOutcome(
            accepted=result.accepted,
            provider=ai_result.provider,
            model=ai_result.model,
            notes=result.notes,
            prompt_version=QUALITY_RESOLUTION_PROMPT_VERSION,
        )

    async def resolve(
        self,
        *,
        task: str,
        primary_output: Any,
        verifier_output: Any,
        deterministic_checks: list[str],
        provider: str | None = None,
        model: str | None = None,
    ) -> QualityResolutionResult:
        """Ask the resolver model to decide between primary and verifier.

        The prompt passes ONLY the original task, the primary output, the
        verifier output and the deterministic check results — the resolver has
        no other context and cannot invent content.
        """
        primary = (
            primary_output.model_dump(mode="json")
            if hasattr(primary_output, "model_dump")
            else primary_output
        )
        system, user = build_resolution_prompt(
            task=task,
            primary_output=primary,
            verifier_output=verifier_output,
            deterministic_checks=deterministic_checks,
        )
        result, _ = await self._ai.generate_structured(
            user,
            QualityResolutionResult,
            system=system,
            provider=provider,
            model=model,
            max_tokens=512,
        )
        assert isinstance(result, QualityResolutionResult)
        return result


async def run_evaluation_verifier(**context: Any) -> VerificationOutcome:
    """Registry-facing wrapper for the evaluation verifier task."""
    ai_service = context.get("ai_service")
    if ai_service is None:
        raise ValueError("run_evaluation_verifier requires ai_service in context")
    required = ("exercise", "answer_text", "evaluation")
    missing = [key for key in required if context.get(key) is None]
    if missing:
        raise ValueError(f"run_evaluation_verifier missing context: {missing}")
    service = AIVerificationService(ai_service)
    return await service.verify_evaluation(
        exercise=context["exercise"],
        answer_text=context["answer_text"],
        evaluation=context["evaluation"],
        provider=context.get("provider"),
        model=context.get("model"),
    )
