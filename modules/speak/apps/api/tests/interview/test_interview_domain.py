"""Unit and integration tests for Dynamic AI Interview Coach domain."""

import pytest
from app.domains.interview.contracts import (
    EvaluateAnswerRequest,
    GenerateQuestionRequest,
    InterviewerPersonality,
)
from app.domains.interview.dynamic_generator import InterviewCoachService
from app.domains.interview.pools import INDUSTRY_TEMPLATES, SEED_QUESTIONS_BY_TURN


def test_industry_templates_structure():
    assert len(INDUSTRY_TEMPLATES) >= 5
    ids = [t.id for t in INDUSTRY_TEMPLATES]
    assert "it_engineer" in ids
    assert "sales_biz" in ids
    assert "translation" in ids
    assert "baito" in ids


def test_seed_questions_coverage():
    for turn in range(1, 6):
        assert turn in SEED_QUESTIONS_BY_TURN
        q = SEED_QUESTIONS_BY_TURN[turn]
        assert "question_ja" in q
        assert "question_vi" in q
        assert len(q["key_vocab"]) >= 2


@pytest.mark.asyncio
async def test_generate_question_fallback():
    svc = InterviewCoachService()
    req = GenerateQuestionRequest(
        role="Frontend Engineer",
        interviewer_style=InterviewerPersonality.FRIENDLY,
        turn_index=1,
    )
    res = await svc.generate_question(req)
    assert res.turn_index == 1
    assert res.question_ja is not None
    assert len(res.question_ja) > 5
    assert res.prep_starters is not None
    assert "結論" in res.prep_starters.point or "申し訳" in res.prep_starters.point or len(res.prep_starters.point) > 5


@pytest.mark.asyncio
async def test_evaluate_and_coach_heuristics():
    svc = InterviewCoachService()
    req = EvaluateAnswerRequest(
        role="IT Engineer",
        question_ja="自己PRをお願いします。",
        user_answer="結論から申し上げますと、私の強みは粘り強さです。なぜなら、前職でプロジェクトの課題を解決したからです。具体的には、毎日バグを修正しました。",
        turn_index=1,
    )
    eval_res = await svc.evaluate_and_coach(req)
    assert eval_res.overall_score >= 60
    assert eval_res.prep_breakdown is not None
    assert eval_res.native_model_answer is not None
    assert len(eval_res.native_model_answer) > 10
