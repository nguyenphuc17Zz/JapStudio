import pytest
from app.providers.ai.errors import AIResponseError
from app.providers.ai.structured import extract_json, validate_structured
from pydantic import BaseModel


class Feedback(BaseModel):
    score: int
    summary: str


@pytest.mark.parametrize(
    "raw",
    [
        '{"score": 3, "summary": "ok"}',
        '  \n {"score": 3, "summary": "ok"} \n ',
        '```json\n{"score": 3, "summary": "ok"}\n```',
        'Here is the result:\n```\n{"score": 3, "summary": "ok"}\n```\nHope it helps!',
        'Kết quả: {"score": 3, "summary": "ok"} - xong',
    ],
)
def test_extract_json_from_noisy_text(raw: str) -> None:
    assert extract_json(raw) == {"score": 3, "summary": "ok"}


def test_extract_json_array() -> None:
    assert extract_json("[1, 2, 3]") == [1, 2, 3]


@pytest.mark.parametrize("raw", ["", "no json here", "```\nnot json\n```", "{"])
def test_extract_json_failure(raw: str) -> None:
    with pytest.raises(AIResponseError):
        extract_json(raw)


def test_validate_structured_success() -> None:
    parsed = validate_structured(
        '{"score": 5, "summary": "Tốt"}', Feedback, provider="groq", model="m"
    )
    assert isinstance(parsed, Feedback)
    assert parsed.score == 5
    assert parsed.summary == "Tốt"


def test_validate_structured_fenced() -> None:
    parsed = validate_structured(
        '```json\n{"score": 1, "summary": "x"}\n```', Feedback, provider="ollama", model="m"
    )
    assert parsed.score == 1


def test_validate_structured_wrong_schema() -> None:
    with pytest.raises(AIResponseError) as excinfo:
        validate_structured('{"score": "not-an-int"}', Feedback, provider="gemini", model="m")
    assert "validation" in str(excinfo.value).lower()


def test_validate_structured_missing_fields() -> None:
    with pytest.raises(AIResponseError):
        validate_structured('{"score": 2}', Feedback, provider="gemini", model="m")
