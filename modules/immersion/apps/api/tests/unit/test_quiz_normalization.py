import pytest
from app.services.quiz_service import QuizService


def test_normalize_raw_quiz_data_with_string_options():
    """Verifies that string options (e.g. ['A. 1日', 'B. 2日']) are converted to dicts without error."""
    raw_data = {
        "questions": [
            {
                "type": "MULTIPLE_CHOICE",
                "skill": "DETAIL",
                "prompt": "福井県で大雨が降ったのはいつですか？",
                "options": ["A. 8月30日", "B. 9月1日", "C. 8月15日"],
                "correct_answer": "A",
                "explanation": "8月30日に大雨が降りました。"
            }
        ]
    }
    normalized = QuizService._normalize_raw_quiz_data(raw_data)
    questions = normalized["questions"]
    assert len(questions) == 1
    q = questions[0]
    assert q["prompt"] == "福井県で大雨が降ったのはいつですか？"
    assert len(q["options"]) == 3
    # Check that option 0 is marked correct
    assert q["options"][0]["isCorrect"] is True
    assert q["options"][0]["text"] == "A. 8月30日"
    assert q["options"][1]["isCorrect"] is False
    assert q["options"][2]["isCorrect"] is False


def test_normalize_raw_quiz_data_with_dict_options():
    """Verifies that dict options (e.g. {'A': '...', 'B': '...'}) are converted properly."""
    raw_data = {
        "questions": [
            {
                "prompt": "ごみを集める場所はどこですか？",
                "options": {
                    "A": "広い駐車場",
                    "B": "駅の前",
                },
                "correct_answer": "A",
            }
        ]
    }
    normalized = QuizService._normalize_raw_quiz_data(raw_data)
    questions = normalized["questions"]
    assert len(questions) == 1
    q = questions[0]
    assert len(q["options"]) == 2
    assert q["options"][0]["text"] == "広い駐車場"
    assert q["options"][0]["isCorrect"] is True


def test_normalize_raw_quiz_data_with_asterisk_correct():
    """Verifies that asterisk prefix marks correct option."""
    raw_data = {
        "questions": [
            {
                "prompt": "テスト質問",
                "options": ["* 選択肢A", "選択肢B"],
            }
        ]
    }
    normalized = QuizService._normalize_raw_quiz_data(raw_data)
    q = normalized["questions"][0]
    assert q["options"][0]["isCorrect"] is True
    assert q["options"][0]["text"] == "選択肢A"
    assert q["options"][1]["isCorrect"] is False


def test_normalize_raw_quiz_data_with_list_direct():
    """Verifies handling when raw_data is directly a list of questions."""
    raw_data = [
        {
            "prompt": "質問1",
            "options": [
                {"text": "A", "isCorrect": True},
                {"text": "B", "isCorrect": False},
            ]
        }
    ]
    normalized = QuizService._normalize_raw_quiz_data(raw_data)
    assert len(normalized["questions"]) == 1
    assert normalized["questions"][0]["options"][0]["isCorrect"] is True


def test_normalize_raw_quiz_data_empty_or_invalid():
    """Verifies empty or malformed inputs return safe empty questions list."""
    assert QuizService._normalize_raw_quiz_data(None) == {"questions": []}
    assert QuizService._normalize_raw_quiz_data({}) == {"questions": []}
    assert QuizService._normalize_raw_quiz_data("not a dict") == {"questions": []}
