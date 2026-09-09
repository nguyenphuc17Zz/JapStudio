"""CLI runner for the AI quality golden benchmark (Phase 11).

Usage (from apps/api):
    .\.venv\Scripts\python.exe -m scripts.run_benchmark [--category NAME] [--limit N] [--json]

Prints deterministic aggregates over the golden dataset (never calls any
provider and never touches the database).
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.quality.benchmark import BenchmarkExecutor, filter_cases, load_golden_cases  # noqa: E402
from app.quality.service import create_quality_service  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the AI quality golden benchmark")
    parser.add_argument("--category", action="append", help="filter by category (repeatable)")
    parser.add_argument("--limit", type=int, default=None, help="max cases to run")
    parser.add_argument("--json", action="store_true", help="emit JSON output")
    args = parser.parse_args()

    cases = load_golden_cases()
    selected = filter_cases(cases, categories=args.category, limit=args.limit)
    if not selected:
        print(f"no cases matched (categories={args.category})", file=sys.stderr)
        return 2

    service = create_quality_service()
    result = asyncio.run(BenchmarkExecutor(service).run(selected, provider="fake"))

    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0

    print(f"cases: {result['cases']}")
    for key in (
        "schema_pass_rate",
        "consistency_pass_rate",
        "expected_properties_pass_rate",
        "semantic_accuracy",
        "false_positive_grammar_rate",
        "naturalness_agreement",
    ):
        print(f"{key}: {result.get(key)}")
    print(f"avg_latency_ms: {result.get('avg_latency_ms')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
