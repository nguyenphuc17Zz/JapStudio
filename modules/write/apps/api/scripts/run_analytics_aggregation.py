"""CLI runner for analytics aggregation & retention (Phase 14).

Usage (from apps/api):
    .\.venv\Scripts\python.exe -m scripts.run_analytics_aggregation [--days N]

Persists the in-memory AI telemetry buffer into ``ai_quality_events``,
precomputes daily aggregates and enforces the retention window.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.services.analytics.aggregation import AnalyticsAggregationService  # noqa: E402


async def _run(days: int | None, as_json: bool) -> int:
    settings = get_settings()
    async for session in get_session():
        result = await AnalyticsAggregationService(session, settings).run(days)
        if as_json:
            print(
                json.dumps(
                    {**result, "generated_at": result["generated_at"].isoformat()},
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 0
        print(f"daily metrics aggregated: {result['aggregated']}")
        print(f"retention days: {result['retained_days']}")
        print(f"telemetry events persisted: {result['persisted_telemetry']}")
        print(f"analytics events swept: {result['swept_events']}")
        return 0
    return 2


def main() -> int:
    parser = argparse.ArgumentParser(description="Run analytics aggregation and retention")
    parser.add_argument("--days", type=int, default=None, help="number of days to aggregate")
    parser.add_argument("--json", action="store_true", help="emit JSON output")
    args = parser.parse_args()
    return asyncio.run(_run(args.days, args.json))


if __name__ == "__main__":
    raise SystemExit(main())
