"""Benchmark layer tests (Phase 11): golden dataset loading, executor, CLI."""

import pytest
from app.quality.benchmark import (
    BenchmarkExecutor,
    as_objects,
    filter_cases,
    load_golden_cases,
)
from app.quality.service import create_quality_service


class TestGoldenDataset:
    def test_dataset_loads_and_has_categories(self) -> None:
        cases = load_golden_cases()
        assert len(cases) >= 50
        categories = {case.get("category") for case in cases}
        assert {"semantic", "writing", "simulation"} <= categories

    def test_every_case_has_required_keys(self) -> None:
        for case in load_golden_cases():
            assert "id" in case
            assert "task" in case
            assert "result" in case

    def test_filter_cases_by_category(self) -> None:
        cases = load_golden_cases()
        only = filter_cases(cases, categories=["simulation"])
        assert only
        assert all(case["category"] == "simulation" for case in only)

    def test_filter_cases_limit(self) -> None:
        cases = load_golden_cases()
        assert len(filter_cases(cases, limit=3)) == 3

    def test_as_objects_adapts_nested_dicts(self) -> None:
        adapted = as_objects({"a": 1, "nested": {"b": "x"}, "items": [{"c": 2}]})
        assert adapted.a == 1
        assert adapted.nested.b == "x"
        assert adapted.items[0].c == 2


class TestBenchmarkExecutor:
    @pytest.mark.asyncio
    async def test_run_reports_expected_rates(self) -> None:
        cases = load_golden_cases()
        aggregate = await BenchmarkExecutor(create_quality_service()).run(cases)
        assert aggregate["cases"] == len(cases)
        assert aggregate["schema_pass_rate"] == 1.0
        assert 0 < aggregate["consistency_pass_rate"] < 1.0
        assert aggregate["expected_properties_pass_rate"] == 1.0
        assert aggregate["semantic_accuracy"] == 1.0
        assert aggregate["naturalness_agreement"] == 1.0

    @pytest.mark.asyncio
    async def test_run_single_case_positive_and_negative(self) -> None:
        service = create_quality_service()
        executor = BenchmarkExecutor(service)
        cases = load_golden_cases()
        by_id = {case["id"]: case for case in cases}
        good_result = await executor.run([by_id["sem-001"]])
        bad_result = await executor.run([by_id["sem-005"]])
        assert good_result["results"][0]["consistency_pass"] is True
        assert bad_result["results"][0]["consistency_pass"] is False

    def test_aggregate_empty(self) -> None:
        aggregate = BenchmarkExecutor.aggregate([])
        assert aggregate["cases"] == 0
        assert aggregate["schema_pass_rate"] is None

    def test_aggregate_rates(self) -> None:
        results = [
            {
                "schema_pass": True,
                "consistency_pass": True,
                "expected_properties_pass": True,
                "semantic_accuracy": True,
                "false_positive_grammar": None,
                "naturalness_agreement": True,
                "latency_ms": 10,
            },
            {
                "schema_pass": True,
                "consistency_pass": False,
                "expected_properties_pass": True,
                "semantic_accuracy": None,
                "false_positive_grammar": None,
                "naturalness_agreement": True,
                "latency_ms": 20,
            },
        ]
        aggregate = BenchmarkExecutor.aggregate(results)
        assert aggregate["schema_pass_rate"] == 1.0
        assert aggregate["consistency_pass_rate"] == 0.5
        assert aggregate["expected_properties_pass_rate"] == 1.0
        assert aggregate["avg_latency_ms"] == 15.0

    def test_check_expected_properties(self) -> None:
        executor = BenchmarkExecutor(create_quality_service())
        result = {"score": 90, "issues": [], "nested": {"status": "ok"}}
        assert executor._check_expected(result, {"score": 90})
        assert executor._check_expected(result, {"nested": {"status": "ok"}})
        assert not executor._check_expected(result, {"score": 80})
        assert not executor._check_expected(result, {"missing": 1})


class TestSimulationStateUpdateCases:
    @pytest.mark.asyncio
    async def test_drop_detection_case(self) -> None:
        cases = {case["id"]: case for case in load_golden_cases()}
        service = create_quality_service()
        result = await BenchmarkExecutor(service).run([cases["sim-006"]])
        assert result["results"][0]["consistency_pass"] is False
