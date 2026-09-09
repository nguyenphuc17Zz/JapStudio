"""AI provider/cost analytics and prompt regression detection (Phase 14).

Data comes from persisted ``ai_quality_events`` rows (only privacy-safe
telemetry). Prompt regression compares the newest prompt version per task
against the previous one: a drop of >= 5pp quality pass rate, >= 3pp success
rate or latency above 1.5x baseline (min 5 calls per side) flags a regression.
"""

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.models.quality import AIQualityEvent
from app.services.analytics.common import quality_passed, resolve_window, round2

_REGRESSION_MIN_CALLS = 5
_QUALITY_PP = 0.05
_SUCCESS_PP = 0.03
_LATENCY_FACTOR = 1.5


class ProviderCostService:
    """Aggregates AI telemetry and detects prompt regressions."""

    def __init__(self, session: AsyncSession, settings: Settings | None = None) -> None:
        self._session = session
        self._settings = settings or get_settings()

    async def compute(self, window: str) -> dict:
        resolved = resolve_window(window)
        result = await self._session.execute(
            select(AIQualityEvent).where(
                AIQualityEvent.created_at >= resolved.start,
                AIQualityEvent.created_at <= resolved.end,
            )
        )
        events = list(result.scalars().all())

        by_task: dict[str, list[AIQualityEvent]] = defaultdict(list)
        by_provider: dict[str, list[AIQualityEvent]] = defaultdict(list)
        by_version: dict[tuple[str, str], list[AIQualityEvent]] = defaultdict(list)
        for event in events:
            by_task[event.task].append(event)
            if event.provider:
                by_provider[event.provider].append(event)
            version = event.prompt_version or "unknown"
            by_version[(event.task, version)].append(event)

        task_rows = [self._row(task, group, window) for task, group in sorted(by_task.items())]
        provider_rows = [
            self._row(provider, group, window)
            for provider, group in sorted(by_provider.items())
            if group
        ]

        regressions = self._detect_regressions(by_version, window)
        cost_by_provider = self._cost(by_provider, "provider")
        cost_by_task = self._cost(by_task, "task")
        overview = [
            {
                "metric_key": f"cost.total.{window}.estimated_usd",
                "label": "Chi phí AI ước tính (toàn hệ thống)",
                "value": round2(sum(e.estimated_cost or 0.0 for e in events)),
                "dimension": None,
                "dimension_value": None,
                "sample_count": len(events),
            },
            {
                "metric_key": f"cost.attempt.{window}.average",
                "label": "Chi phí trung bình mỗi lần gọi",
                "value": round2(
                    sum(e.estimated_cost or 0.0 for e in events) / len(events) if events else None
                ),
                "dimension": None,
                "dimension_value": None,
                "sample_count": len(events),
            },
        ]
        return {
            "window": window,
            "overview": overview,
            "by_task": task_rows,
            "by_provider": provider_rows,
            "prompt_regressions": regressions,
            "cost_by_provider": cost_by_provider,
            "cost_by_task": cost_by_task,
        }

    def _row(self, key: str, events: list[AIQualityEvent], window: str) -> dict:
        calls = len(events)
        successes = sum(1 for e in events if e.success)
        quality = sum(1 for e in events if quality_passed(e.quality_status))
        fallbacks = sum(1 for e in events if e.fallback_used)
        latencies = [e.duration_ms for e in events if e.duration_ms is not None]
        cost = sum(e.estimated_cost or 0.0 for e in events)
        versions: dict[str, int] = defaultdict(int)
        for e in events:
            versions[e.prompt_version or "unknown"] += 1
        return {
            "task": key,
            "provider": key,
            "model": None,
            "calls": calls,
            "success_rate": round2(successes / calls) if calls else None,
            "quality_pass_rate": round2(quality / calls) if calls else None,
            "avg_latency_ms": round2(sum(latencies) / len(latencies)) if latencies else None,
            "fallback_rate": round2(fallbacks / calls) if calls else None,
            "estimated_cost_usd": round2(cost),
            "prompt_version": max(versions, key=versions.get),
        }

    def _detect_regressions(
        self, by_version: dict[tuple[str, str], list[AIQualityEvent]], window: str
    ) -> list[dict]:
        regressions: list[dict] = []
        by_task: dict[str, list[tuple[str, list[AIQualityEvent]]]] = defaultdict(list)
        for (task, version), events in by_version.items():
            by_task[task].append((version, events))

        for task, groups in by_task.items():
            ordered = sorted(groups, key=lambda g: min(e.created_at for e in g[1]))
            if len(ordered) < 2:
                continue
            baseline_version, baseline_events = ordered[-2]
            candidate_version, candidate_events = ordered[-1]
            if (
                len(baseline_events) < _REGRESSION_MIN_CALLS
                or len(candidate_events) < _REGRESSION_MIN_CALLS
            ):
                continue
            base_rate = sum(1 for e in baseline_events if quality_passed(e.quality_status)) / len(
                baseline_events
            )
            cand_rate = sum(1 for e in candidate_events if quality_passed(e.quality_status)) / len(
                candidate_events
            )
            base_success = sum(1 for e in baseline_events if e.success) / len(baseline_events)
            cand_success = sum(1 for e in candidate_events if e.success) / len(candidate_events)
            base_latency = sum(e.duration_ms for e in baseline_events) / len(baseline_events)
            cand_latency = sum(e.duration_ms for e in candidate_events) / len(candidate_events)

            quality_drop = base_rate - cand_rate
            success_drop = base_success - cand_success
            latency_blowup = base_latency > 0 and cand_latency > base_latency * _LATENCY_FACTOR
            if quality_drop >= _QUALITY_PP or success_drop >= _SUCCESS_PP or latency_blowup:
                regressions.append(
                    {
                        "task": task,
                        "provider": task,
                        "baseline_version": baseline_version,
                        "candidate_version": candidate_version,
                        "baseline_quality_pass_rate": round2(base_rate),
                        "candidate_quality_pass_rate": round2(cand_rate),
                        "baseline_success_rate": round2(base_success),
                        "candidate_success_rate": round2(cand_success),
                        "baseline_avg_latency_ms": round2(base_latency),
                        "candidate_avg_latency_ms": round2(cand_latency),
                        "severity": "regression",
                        "metric_ids": [
                            f"provider.{task}.{window}.quality_pass_rate",
                            f"provider.{task}.{window}.success_rate",
                            f"provider.{task}.{window}.avg_latency_ms",
                        ],
                    }
                )
        return regressions

    def _cost(self, groups: dict[str, list[AIQualityEvent]], dimension: str) -> list[dict]:
        rows = []
        for key, events in sorted(groups.items()):
            if not events:
                continue
            total = sum(e.estimated_cost or 0.0 for e in events)
            rows.append(
                {
                    "metric_key": f"cost.{dimension}.{key}.estimated_usd",
                    "label": f"Chi phí {key}",
                    "value": round2(total),
                    "dimension": dimension,
                    "dimension_value": key,
                    "sample_count": len(events),
                }
            )
        return rows
