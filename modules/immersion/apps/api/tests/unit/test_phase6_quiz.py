import pytest
from app.services.quiz_service import QuizService
from app.schemas.quiz import (
    SubmitAnswerRequest,
)
from app.models.content import CanonicalContent
from app.models.enrichment import (
    ContentEnrichment,
    ContentSentence,
    ContentVocabulary,
    ContentGrammar,
)


def test_calculate_blueprint_scales_with_content():
    """Validates adaptive blueprint question count and skills across article lengths."""
    # 1. Tiny content (<= 3 sentences)
    bp_short = QuizService.calculate_blueprint(sentence_count=2, content_difficulty=3)
    assert bp_short["questionCount"] == 3
    assert bp_short["difficulty"] == "EASY"
    assert "MAIN_IDEA" in bp_short["skills"]
    assert "DETAIL" in bp_short["skills"]

    # 2. Medium content (4-8 sentences)
    bp_med = QuizService.calculate_blueprint(sentence_count=6, content_difficulty=5)
    assert bp_med["questionCount"] == 4
    assert bp_med["difficulty"] == "STANDARD"
    assert "INFERENCE" in bp_med["skills"]

    # 3. Long content (> 15 sentences)
    bp_long = QuizService.calculate_blueprint(sentence_count=20, content_difficulty=8)
    assert bp_long["questionCount"] == 6
    assert bp_long["difficulty"] == "CHALLENGING"
    assert "GRAMMAR" in bp_long["skills"]
    assert "INFERENCE" in bp_long["skills"]


@pytest.mark.asyncio
async def test_get_or_create_quiz_and_cache(test_db_session):
    """Verifies AI quiz generation, distractor validation, and persistent caching."""
    content = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/quiz-test-1",
        content_type="ARTICLE",
        title="日本のAI教育に関する最新動向",
        content="日本政府は教育現場におけるAIの活用方針を発表した。教育格差の是正と個別最適化を目指している。一方で倫理的配慮も求めている。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="quiz_hash_unit_1",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    # Add enrichment
    enrichment = ContentEnrichment(
        content_id=content.id,
        enrichment_version=1,
        prompt_version="v1",
        model_name="mock",
        model_provider="mock",
        micro_summary="AI教育方針の発表",
        overall_difficulty=5,
        estimated_jlpt="N3",
        learning_ready=True,
    )
    test_db_session.add(enrichment)
    await test_db_session.commit()
    await test_db_session.refresh(enrichment)

    # Add sentences
    s1 = ContentSentence(
        content_id=content.id,
        sentence_index=0,
        text="日本政府は教育現場におけるAIの活用方針を発表した。",
        start_offset=0,
        end_offset=27,
    )
    s2 = ContentSentence(
        content_id=content.id,
        sentence_index=1,
        text="教育格差の是正と個別最適化を目指している。",
        start_offset=28,
        end_offset=50,
    )
    test_db_session.add_all([s1, s2])

    # Add vocabulary & grammar for bridges
    vocab = ContentVocabulary(
        content_id=content.id,
        surface_form="活用",
        normalized_form="活用",
        reading="かつよう",
        part_of_speech="noun",
        meaning_in_context="sử dụng hiệu quả, ứng dụng",
        difficulty=3,
        learning_priority=8,
    )
    grammar = ContentGrammar(
        content_id=content.id,
        pattern="〜における",
        meaning_in_context="ở, tại, trong (bối cảnh)",
        difficulty=3,
    )
    test_db_session.add_all([vocab, grammar])
    await test_db_session.commit()

    # 1. Generate Quiz
    quiz = await QuizService.get_or_create_quiz(
        db=test_db_session,
        content_id=content.id,
        force_regenerate=False,
        model_provider="mock",
    )

    assert quiz is not None
    assert quiz.status == "READY"
    assert quiz.quality_score >= 90.0
    assert len(quiz.questions) > 0

    # Verify each question has exactly one correct option
    for q in quiz.questions:
        correct_count = sum(1 for o in q.options if o.is_correct)
        assert correct_count == 1, f"Question {q.prompt} must have exactly 1 correct option"
        assert len(q.options) >= 2

    # 2. Test Cache Hit (0 AI regeneration)
    cached_quiz = await QuizService.get_or_create_quiz(
        db=test_db_session,
        content_id=content.id,
        force_regenerate=False,
    )
    assert cached_quiz.id == quiz.id

    # 3. Test Client Serialization (Prevents answer leakage)
    client_view = QuizService.serialize_quiz_for_client(quiz)
    assert client_view.id == quiz.id
    for cq in client_view.questions:
        for copt in cq.options:
            # Client option MUST NOT have is_correct or explanation attributes
            assert not hasattr(copt, "is_correct")
            assert not hasattr(copt, "explanation")


@pytest.mark.asyncio
async def test_quiz_attempt_answering_and_metacognition(test_db_session):
    """Verifies attempt creation, server-side scoring, hint penalties, and metacognition radar."""
    content = CanonicalContent(
        source_id=1,
        canonical_url="https://example.com/quiz-test-2",
        content_type="ARTICLE",
        title="テスト記事2",
        content="AIの技術革新が急速に進んでいる。多くの企業が導入を開始した。",
        language="ja",
        language_status="JA",
        status="PUBLISHED",
        content_hash="quiz_hash_unit_2",
    )
    test_db_session.add(content)
    await test_db_session.commit()
    await test_db_session.refresh(content)

    enrichment = ContentEnrichment(
        content_id=content.id,
        enrichment_version=1,
        prompt_version="v1",
        model_name="mock",
        model_provider="mock",
        micro_summary="AI技術革新",
        overall_difficulty=5,
        estimated_jlpt="N3",
        learning_ready=True,
    )
    test_db_session.add(enrichment)
    await test_db_session.commit()

    # Generate quiz
    quiz = await QuizService.get_or_create_quiz(
        db=test_db_session,
        content_id=content.id,
        model_provider="mock",
    )

    user_id = "tester_unit_6"

    # Start attempt
    attempt = await QuizService.start_attempt(
        db=test_db_session,
        user_id=user_id,
        quiz_id=quiz.id,
        mode="RELAXED",
    )
    assert attempt.id is not None
    assert attempt.completion_status == "IN_PROGRESS"

    # Answer Question 1 correctly with HIGH confidence
    q1 = quiz.questions[0]
    q1_correct = next(o for o in q1.options if o.is_correct)
    ans1 = await QuizService.submit_answer(
        db=test_db_session,
        user_id=user_id,
        attempt_id=attempt.id,
        req=SubmitAnswerRequest(
            question_id=q1.id,
            selected_option_id=q1_correct.id,
            confidence="HIGH",
            response_time_ms=3000,
            hints_used=0,
        ),
    )
    assert ans1.is_correct is True
    assert ans1.points_earned == 10

    # Answer Question 2 INCORRECTLY with HIGH confidence (triggers CONFIDENT_WRONG misconception)
    q2 = quiz.questions[1]
    q2_wrong = next(o for o in q2.options if not o.is_correct)
    ans2 = await QuizService.submit_answer(
        db=test_db_session,
        user_id=user_id,
        attempt_id=attempt.id,
        req=SubmitAnswerRequest(
            question_id=q2.id,
            selected_option_id=q2_wrong.id,
            confidence="HIGH",
            response_time_ms=4500,
            hints_used=1,
        ),
    )
    assert ans2.is_correct is False
    assert ans2.points_earned == 0
    assert ans2.misconception_type is not None

    # Complete Attempt & Inspect Metacognition
    result = await QuizService.complete_attempt(
        db=test_db_session,
        user_id=user_id,
        attempt_id=attempt.id,
    )
    assert result.completion_status == "COMPLETED"
    assert result.correct_count == 1
    assert result.confidence_pattern["CONFIDENT_CORRECT"] == 1
    assert result.confidence_pattern["CONFIDENT_WRONG"] == 1
    assert len(result.misconceptions) >= 1
    assert len(result.answers_review) == len(quiz.questions)
    assert result.ai_summary_feedback is not None
