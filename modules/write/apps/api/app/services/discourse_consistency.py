"""Deterministic consistency validation of long-form discourse output.

These checks run after the AI discourse stages and before anything is
persisted. A result that violates them is rejected and regenerated per the
discourse retry policy (see DiscourseService). Composite scores are never
trusted from the AI: sentence quality, discourse quality and overall
writing are computed by the code from validated inputs.
"""

from app.schemas.discourse_ai import (
    DISCOURSE_ISSUE_CATEGORY_VALUES,
    DISCOURSE_ISSUE_SEVERITY_VALUES,
    DiscourseAnalysisResult,
    DiscourseSynthesisResult,
    StyleConsistencyResult,
)

COHERENCE_SCORE_BANDS: dict[str, tuple[int, int]] = {
    "excellent": (85, 100),
    "good": (70, 84),
    "acceptable": (50, 69),
    "weak": (25, 49),
    "poor": (0, 24),
}

TOPIC_DRIFT_BANDS: dict[str, tuple[int, int]] = {
    "consistent": (70, 100),
    "minor_drift": (40, 79),
    "major_drift": (0, 50),
}

SEVERITY_ORDER = {"info": 0, "minor": 1, "major": 2, "critical": 3}

CRITICAL_CATEGORIES = {"coherence", "topic_consistency", "organization"}


class DiscourseConsistencyError(Exception):
    """Raised when a discourse stage output contradicts itself."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class DiscourseConsistencyValidator:
    """Raises DiscourseConsistencyError on the first violation found."""

    def check_analysis(
        self,
        result: DiscourseAnalysisResult,
        sentence_count: int,
    ) -> None:
        low, high = COHERENCE_SCORE_BANDS[result.coherence_classification]
        if not low <= result.coherence_score <= high:
            raise DiscourseConsistencyError(
                f"coherence score {result.coherence_score} contradicts "
                f"classification '{result.coherence_classification}' "
                f"(expected {low}-{high})"
            )
        drift_low, drift_high = TOPIC_DRIFT_BANDS[result.topic_consistency_classification]
        if not drift_low <= result.coherence_score <= drift_high:
            raise DiscourseConsistencyError(
                f"topic consistency '{result.topic_consistency_classification}' "
                f"contradicts coherence score {result.coherence_score} "
                f"(expected {drift_low}-{drift_high})"
            )
        self._check_issues(result.issues, sentence_count)

    def check_style(
        self,
        result: StyleConsistencyResult,
        sentence_count: int,
    ) -> None:
        self._check_issues(result.issues, sentence_count)

    def check_synthesis(
        self,
        result: DiscourseSynthesisResult,
    ) -> None:
        if not result.strengths:
            raise DiscourseConsistencyError("synthesis must list at least one strength")
        if not result.summary.strip():
            raise DiscourseConsistencyError("synthesis summary must not be empty")
        for name in ("minimal_fix", "natural_rewrite", "native_rewrite"):
            if not getattr(result.rewrites, name).strip():
                raise DiscourseConsistencyError(f"rewrite '{name}' must not be empty")

    def _check_issues(
        self,
        issues: list,
        sentence_count: int,
    ) -> None:
        for issue in issues:
            if issue.category not in DISCOURSE_ISSUE_CATEGORY_VALUES:
                raise DiscourseConsistencyError(
                    f"unsupported discourse issue category '{issue.category}'"
                )
            if issue.severity not in DISCOURSE_ISSUE_SEVERITY_VALUES:
                raise DiscourseConsistencyError(
                    f"unsupported discourse issue severity '{issue.severity}'"
                )
            index = issue.sentence_index
            if index is not None and index >= sentence_count:
                raise DiscourseConsistencyError(
                    f"issue sentence_index {index} is out of range "
                    f"(text has {sentence_count} sentences)"
                )
            span = issue.sentence_range
            if span is not None:
                if len(span) != 2:
                    raise DiscourseConsistencyError(
                        "issue sentence_range must contain exactly 2 integers"
                    )
                start, end = span
                if not (0 <= start <= end < sentence_count):
                    raise DiscourseConsistencyError(
                        f"issue sentence_range [{start}, {end}] is out of range "
                        f"(text has {sentence_count} sentences)"
                    )

    @staticmethod
    def has_critical_issue(issues: list) -> bool:
        return any(
            SEVERITY_ORDER.get(issue.severity, 0) >= SEVERITY_ORDER["major"] for issue in issues
        )
