import random
import pytest
from sqlalchemy import select

from app.models.quiz import (
    ReadingQuiz,
    ReadingQuizQuestion,
    QuizQuestionOption,
    QuizAttempt,
    LearnerAbility,
)
from app.schemas.quiz import SubmitAnswerRequest
from app.services import irt as irt_engine
from app.services.quiz_service import QuizService

SKILLS = ["MAIN_IDEA", "DETAIL", "INFERENCE", "VOCABULARY", "GRAMMAR", "DETAIL"]


async def _make_quiz(test_db_session, n=6, difficulties=None):
    quiz = ReadingQuiz(content_id=1, difficulty="STANDARD", question_count=n,
                       estimated_time_minutes=5, status="READY", quality_score=92.5,
                       blueprint_json={"skills": SKILLS[:n]})
    test_db_session.add(quiz)
    await test_db_session.flush()
    for i in range(n):
        diff = (difficulties or ["STANDARD"] * n)[i]
        q = ReadingQuizQuestion(
            quiz_id=quiz.id, question_index=i, question_type="MULTIPLE_CHOICE",
            skill_type=SKILLS[i % len(SKILLS)], prompt=f"Câu {i}?",
            explanation="Vì đúng.", difficulty=diff, points=10,
            irt_a=1.0, irt_b=irt_engine.LABEL_TO_B.get(diff, 0.0), irt_n=0,
        )
        test_db_session.add(q)
        await test_db_session.flush()
        for j in range(4):
            test_db_session.add(QuizQuestionOption(
                question_id=q.id, option_index=j, text=f"PA {i}-{j}",
                is_correct=(j == 0),
            ))
    await test_db_session.commit()
    qids = (await test_db_session.execute(
        select(ReadingQuizQuestion.id).where(
            ReadingQuizQuestion.quiz_id == quiz.id).order_by(ReadingQuizQuestion.question_index)
    )).scalars().all()
    return quiz, list(qids)


async def _correct_option_id(test_db_session, question_id):
    opts = (await test_db_session.execute(
        select(QuizQuestionOption).where(QuizQuestionOption.question_id == question_id)
    )).scalars().all()
    return next(o.id for o in opts if o.is_correct)


async def _wrong_option_id(test_db_session, question_id):
    opts = (await test_db_session.execute(
        select(QuizQuestionOption).where(QuizQuestionOption.question_id == question_id)
    )).scalars().all()
    return next(o.id for o in opts if not o.is_correct)


def test_probability_monotonic_in_theta():
    ps = [irt_engine.probability_correct(t, 1.2, 0.5) for t in (-2, -1, 0, 1, 2)]
    assert ps == sorted(ps)
    assert all(0.0 < p < 1.0 for p in ps)


def test_theta_moves_with_responses():
    up = irt_engine.update_theta(0.0, [(1.0, 0.0, 1)] * 3)
    down = irt_engine.update_theta(0.0, [(1.0, 0.0, 0)] * 3)
    assert up > 0.0 > down


def test_se_shrinks_with_more_responses():
    few = [(1.0, 0.0, 1), (1.0, 0.0, 0)]
    many = few * 10
    t_few = irt_engine.update_theta(0.0, few)
    t_many = irt_engine.update_theta(0.0, many)
    assert irt_engine.standard_error(t_many, many) < irt_engine.standard_error(t_few, few)


def test_cat_simulation_converges():
    """Virtual learner (true θ=1.0) answers by IRT probability; CAT must converge."""
    rng = random.Random("cat-sim")
    bank = [
        {"id": i, "a": 1.0, "b": b, "skill": SKILLS[i % len(SKILLS)]}
        for i, b in enumerate([-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5] * 2)
    ]
    theta, answered, responses = 0.0, [], []
    for step in range(12):
        pick = irt_engine.select_next(theta, bank, answered, top_k=3,
                                      rng=random.Random(f"sim:{step}"))
        assert pick is not None
        p = irt_engine.probability_correct(1.0, pick["a"], pick["b"])
        correct = 1 if rng.random() < p else 0
        responses.append((pick["a"], pick["b"], correct))
        answered.append(int(pick["id"]))
        theta = irt_engine.update_theta(theta, responses, prior_weight=0.5)
    se = irt_engine.standard_error(theta, responses)
    assert abs(theta - 1.0) < 0.8
    assert se < 1.0


def test_cat_all_correct_streak_raises_theta():
    responses = [(1.0, 0.0, 1)] * 8
    theta = irt_engine.update_theta(0.0, responses)
    assert theta > 0.5
    responses = [(1.0, 0.0, 0)] * 8
    theta = irt_engine.update_theta(0.0, responses)
    assert theta < -0.5


def test_select_next_deterministic_per_seed():
    bank = [{"id": i, "a": 1.0, "b": 0.0, "skill": "DETAIL"} for i in range(6)]
    a = irt_engine.select_next(0.0, bank, [], top_k=3, rng=random.Random("s"))
    b = irt_engine.select_next(0.0, bank, [], top_k=3, rng=random.Random("s"))
    assert a and b and a["id"] == b["id"]


@pytest.mark.asyncio
async def test_adaptive_flow_end_to_end(test_db_session):
    quiz, _ = await _make_quiz(test_db_session, n=6)
    user = "cat_user"
    attempt = await QuizService.start_adaptive_attempt(
        db=test_db_session, user_id=user, quiz_id=quiz.id)
    assert attempt.mode == "ADAPTIVE"

    served = 0
    while True:
        nxt = await QuizService.next_adaptive_question(
            db=test_db_session, user_id=user, attempt_id=attempt.id)
        if nxt["done"]:
            break
        qid = nxt["question"].id
        oid = await _correct_option_id(test_db_session, qid)
        res = await QuizService.submit_answer(
            db=test_db_session, user_id=user, attempt_id=attempt.id,
            req=SubmitAnswerRequest(question_id=qid, selected_option_id=oid),
        )
        assert res.is_correct is True
        served += 1
        assert served <= 8
    assert served >= 1
    assert nxt["stop_reason"] in ("ALL_ANSWERED", "SE_THRESHOLD", "MAX_ITEMS")

    ability = (await test_db_session.execute(
        select(LearnerAbility).where(LearnerAbility.user_id == user)
    )).scalars().first()
    assert ability is not None and ability.answers_count == served
    assert ability.theta > 0  # all-correct learner moves up


@pytest.mark.asyncio
async def test_calibration_fits_easy_question(test_db_session):
    _, qids = await _make_quiz(test_db_session, n=2)
    quiz_id = (await test_db_session.execute(
        select(ReadingQuiz.id).order_by(ReadingQuiz.id.desc()))).scalars().first()
    # 12 learners answer Q0: 10 correct (spread across distractors), 2 wrong.
    for i in range(12):
        u = f"cal_user_{i}"
        att = await QuizService.start_attempt(db=test_db_session, user_id=u, quiz_id=quiz_id)
        if i < 10:
            oid = await _correct_option_id(test_db_session, qids[0])
        else:
            oid = await _wrong_option_id(test_db_session, qids[0])
        await QuizService.submit_answer(
            db=test_db_session, user_id=u, attempt_id=att.id,
            req=SubmitAnswerRequest(question_id=qids[0], selected_option_id=oid),
        )
    out = await QuizService.calibrate_question(db=test_db_session, question_id=qids[0])
    assert out["n"] == 12
    assert out["p_value"] == pytest.approx(10 / 12, abs=0.01)
    assert out["irt_b"] < 0  # easy question → negative difficulty
    assert isinstance(out["flags"], list) and out["flags"]


@pytest.mark.asyncio
async def test_admin_stats_include_item_analysis(test_db_session):
    _, qids = await _make_quiz(test_db_session, n=1)
    qid = qids[0]
    quiz_id = (await test_db_session.execute(
        select(ReadingQuiz.id).order_by(ReadingQuiz.id.desc()))).scalars().first()
    att = await QuizService.start_attempt(db=test_db_session, user_id="admin_u", quiz_id=quiz_id)
    await QuizService.submit_answer(
        db=test_db_session, user_id="admin_u", attempt_id=att.id,
        req=SubmitAnswerRequest(
            question_id=qid, selected_option_id=await _correct_option_id(test_db_session, qid)),
    )
    stats = await QuizService.get_admin_stats(db=test_db_session)
    assert len(stats.item_analysis) >= 1
    row = next(r for r in stats.item_analysis if r["question_id"] == qid)
    assert {"n", "p_value", "irt_a", "irt_b", "flags"} <= set(row.keys())
