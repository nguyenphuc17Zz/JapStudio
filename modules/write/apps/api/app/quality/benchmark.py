"""AI evaluation benchmark (Phase 11).

Executes selected AI tasks against a golden dataset and reports deterministic
aggregates: schema pass rate, consistency pass rate, semantic accuracy,
false-positive grammar rate, naturalness agreement, average latency and token
usage.

Benchmark runs never write learner data; results are stored in
``ai_benchmark_runs`` / ``ai_benchmark_results`` for regression comparison.
"""

import json
import logging
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from app.quality.registry import AIQualityRegistry
from app.quality.service import AIQualityService

logger = logging.getLogger("app.quality.benchmark")

GOLDEN_DIR = Path(__file__).resolve().parent.parent.parent / "benchmark" / "golden"

# Key -> list of scores to consider for "naturalness agreement".
NATURALNESS_KEYS = ("naturalness_score",)


def load_golden_cases(directory: Path | None = None) -> list[dict[str, Any]]:
    """Load all golden case JSON files (deterministic, provider-agnostic)."""
    base = directory or GOLDEN_DIR
    cases: list[dict[str, Any]] = []
    if not base.exists():
        logger.warning("golden dataset directory not found: %s", base)
        return cases
    for path in sorted(base.glob("*.json")):
        with path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        if isinstance(payload, list):
            cases.extend(payload)
        else:
            cases.append(payload)
    return cases


def filter_cases(
    cases: list[dict[str, Any]],
    *,
    categories: list[str] | None = None,
    limit: int | None = None,
) -> list[dict[str, Any]]:
    selected = [case for case in cases if not categories or case.get("category") in categories]
    if limit is not None:
        selected = selected[:limit]
    return selected


def as_objects(value: Any) -> Any:
    """Convert JSON payloads (dicts/lists) into attribute-accessible objects.

    Validators read fields via ``getattr``; benchmarks store golden payloads
    as plain JSON, so we adapt on the way in.
    """
    if isinstance(value, dict):
        return SimpleNamespace(**{key: as_objects(item) for key, item in value.items()})
    if isinstance(value, list):
        return [as_objects(item) for item in value]
    return value


class BenchmarkExecutor:
    """Runs golden cases through the shared quality service."""

    def __init__(
        self,
        quality_service: AIQualityService,
        registry: AIQualityRegistry | None = None,
    ) -> None:
        self._quality = quality_service
        self._registry = registry or quality_service.registry

    async def run(
        self,
        cases: list[dict[str, Any]],
        *,
        provider: str | None = None,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Run every case and aggregate results.

        A case is executed by invoking the registered validator on the case's
        ``result`` payload with the case's ``context`` (if any). Schema pass
        means the payload validated against the registered task contract;
        consistency pass means the registered validator found no violations.
        """
        results: list[dict[str, Any]] = []
        for case in cases:
            results.append(await self._run_case(case, provider=provider, model=model))
        return self.aggregate(results)

    async def _run_case(
        self, case: dict[str, Any], *, provider: str | None, model: str | None
    ) -> dict[str, Any]:
        task = case.get("task", "writing_evaluation")
        result_payload = case.get("result", {})
        context = case.get("context", {})
        started = time.monotonic()

        schema_pass = True
        try:
            self._quality.registry.require(task)
        except KeyError:
            schema_pass = False

        # simulation_state_update's validator consumes plain dicts
        # (the state-machine contract); everything else uses attributes.
        if task == "simulation_state_update":
            result_obj = result_payload
            run_context = dict(context)
        else:
            result_obj = as_objects(result_payload)
            run_context = {key: as_objects(value) for key, value in context.items()}

        outcome = self._quality.validate(
            task,
            result_obj,
            context=run_context,
            provider=provider,
            model=model,
            fingerprint_payload=case.get("result"),
        )
        consistency_pass = not outcome.violations and outcome.state.value not in ("rejected",)

        expected = case.get("expected_properties") or {}
        properties_pass = self._check_expected(result_payload, expected)

        latency_ms = int((time.monotonic() - started) * 1000)

        semantic_accuracy = self._check_semantic(case, result_payload)
        false_positive = self._check_false_positive_grammar(case, outcome)
        naturalness_agreement = self._check_naturalness(case, result_payload)

        return {
            "case_id": case.get("id", "unknown"),
            "category": case.get("category", "general"),
            "task": task,
            "schema_pass": schema_pass,
            "consistency_pass": consistency_pass,
            "expected_properties_pass": properties_pass,
            "semantic_accuracy": semantic_accuracy,
            "false_positive_grammar": false_positive,
            "naturalness_agreement": naturalness_agreement,
            "latency_ms": latency_ms,
            "violations": outcome.violations,
        }

    @staticmethod
    def _check_expected(result: Any, expected: dict[str, Any]) -> bool:
        """Property-based comparison: exact wording is never asserted."""
        data = result.model_dump(mode="json") if hasattr(result, "model_dump") else result
        if not isinstance(data, dict):
            return False
        for key, wanted in expected.items():
            value = data.get(key)
            if isinstance(wanted, dict):
                if not isinstance(value, dict):
                    return False
                for sub_key, sub_wanted in wanted.items():
                    if value.get(sub_key) != sub_wanted:
                        return False
            elif isinstance(wanted, list):
                if not isinstance(value, list):
                    return False
            elif value != wanted:
                return False
        return True

    @staticmethod
    def _check_semantic(case: dict[str, Any], result: Any) -> bool | None:
        expectation = case.get("semantic_expected")
        if expectation is None:
            return None
        data = result.model_dump(mode="json") if hasattr(result, "model_dump") else result
        if not isinstance(data, dict):
            return None
        if isinstance(expectation, str):
            classification = data.get("semantic_classification")
            if classification is None:
                return None
            return classification == expectation
        if isinstance(expectation, dict):
            score = (
                data.get("scores", {}).get("semantic_score")
                if isinstance(data.get("scores"), dict)
                else data.get("semantic_score")
            )
            if score is None:
                return None
            return expectation.get("min_score", 0) <= score <= expectation.get("max_score", 100)
        return None

    @staticmethod
    def _check_false_positive_grammar(case: dict[str, Any], outcome: Any) -> bool | None:
        if not case.get("expect_grammar_issue"):
            return None
        return not outcome.violations

    @staticmethod
    def _check_naturalness(case: dict[str, Any], result: Any) -> bool | None:
        band = case.get("naturalness_band")
        if band is None:
            return None
        data = result.model_dump(mode="json") if hasattr(result, "model_dump") else result
        if not isinstance(data, dict):
            return None
        score = None
        for key in NATURALNESS_KEYS:
            if key in data:
                score = data.get(key)
                break
        if score is None:
            return None
        return band[0] <= score <= band[1]

    @staticmethod
    def aggregate(results: list[dict[str, Any]]) -> dict[str, Any]:
        total = len(results)
        if total == 0:
            return {
                "cases": 0,
                "schema_pass_rate": None,
                "consistency_pass_rate": None,
                "expected_properties_pass_rate": None,
                "semantic_accuracy": None,
                "false_positive_grammar_rate": None,
                "naturalness_agreement": None,
                "avg_latency_ms": None,
                "results": [],
            }
        rates = {
            "cases": total,
            "schema_pass_rate": round(sum(1 for r in results if r["schema_pass"]) / total, 4),
            "consistency_pass_rate": round(
                sum(1 for r in results if r["consistency_pass"]) / total, 4
            ),
            "expected_properties_pass_rate": round(
                sum(1 for r in results if r["expected_properties_pass"]) / total, 4
            ),
            "avg_latency_ms": round(sum(r["latency_ms"] for r in results) / total, 1),
        }
        semantic_values = [
            r["semantic_accuracy"] for r in results if r["semantic_accuracy"] is not None
        ]
        if semantic_values:
            rates["semantic_accuracy"] = round(
                sum(1 for v in semantic_values if v) / len(semantic_values), 4
            )
        else:
            rates["semantic_accuracy"] = None
        fp_values = [
            r["false_positive_grammar"] for r in results if r["false_positive_grammar"] is not None
        ]
        if fp_values:
            rates["false_positive_grammar_rate"] = round(
                sum(1 for v in fp_values if v) / len(fp_values), 4
            )
        else:
            rates["false_positive_grammar_rate"] = None
        naturalness_values = [
            r["naturalness_agreement"] for r in results if r["naturalness_agreement"] is not None
        ]
        if naturalness_values:
            rates["naturalness_agreement"] = round(
                sum(1 for v in naturalness_values if v) / len(naturalness_values), 4
            )
        else:
            rates["naturalness_agreement"] = None
        rates["results"] = results
        return rates
