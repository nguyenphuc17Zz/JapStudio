"""Dynamic AI Generator and Real-time Evaluator for AI Interview Coach."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

from app.domains.ai.contracts import (
    AIMessage,
    AIMessageRole,
    AIRequest,
    AITask,
    ResponseFormat,
    ResponseFormatType,
)
from app.domains.ai.router import AIRouter
from app.domains.interview.contracts import (
    EvaluateAnswerRequest,
    GenerateQuestionRequest,
    InterviewerPersonality,
    InterviewCoachEvaluation,
    InterviewQuestion,
    KeigoAnalysisItem,
    PREPScoreBreakdown,
    PREPStarters,
)
from app.domains.interview.pools import (
    DEFAULT_PREP_STARTERS,
    INTERVIEWER_PROFILES,
    SEED_QUESTIONS_BY_TURN,
)

logger = logging.getLogger("speaking_training.interview")


class InterviewCoachService:
    """Orchestrates AI Interview question generation and real-time iterative coaching."""

    def __init__(
        self, db: Any | None = None, ai_router: AIRouter | None = None
    ) -> None:
        self.db = db
        if ai_router is not None:
            self.ai_router = ai_router
        elif db is not None:
            self.ai_router = AIRouter(db)
        else:
            self.ai_router = None

    async def generate_question(
        self, request: GenerateQuestionRequest
    ) -> InterviewQuestion:
        """Generates dynamic interview question, either fresh or following up on previous answer."""
        turn_idx = max(1, min(request.turn_index, 5))
        prof = INTERVIEWER_PROFILES.get(
            request.interviewer_style,
            INTERVIEWER_PROFILES[InterviewerPersonality.FRIENDLY],
        )

        seed = SEED_QUESTIONS_BY_TURN.get(turn_idx, SEED_QUESTIONS_BY_TURN[1])
        prep_starter = DEFAULT_PREP_STARTERS.get(turn_idx, DEFAULT_PREP_STARTERS[1])

        system_prompt = f"""You are an experienced Japanese Corporate Interviewer ({prof['name']}, {prof['title']}).
Personality/Style: {request.interviewer_style.value} ({prof['tone_vi']}).
Target Candidate Role: {request.role}
Target Company Context: {request.company_context or 'General Japanese Enterprise'}
Current Interview Turn: Turn {turn_idx} of 5.

Your task is to formulate a realistic, high-impact Japanese interview question tailored specifically to this candidate's role.
- If turn_idx == 1: Introduction & Strengths (Jiko PR) relevant to {request.role}.
- If previous answers exist: Ask a natural follow-up digging deeper into what the candidate previously mentioned, challenging their technical skill, leadership, or problem-solving capability.
- Ensure natural polite Japanese (Desu/Masu, Keigo as appropriate for an interviewer).

You MUST output strictly a JSON object with:
{{
  "question_ja": "Japanese question with Kanji",
  "question_vi": "Accurate Vietnamese translation of the question",
  "reading_hiragana": "Full Hiragana reading of question_ja",
  "romaji": "Hepburn Romaji reading",
  "intent_explanation_vi": "Explanation in Vietnamese of what Japanese hiring managers look for in this question",
  "prep_starters": {{
    "point": "Japanese starter sentence for Point (結論)",
    "reason": "Japanese starter sentence for Reason (理由)",
    "example": "Japanese starter sentence for Example (具体例)",
    "summary": "Japanese starter sentence for Summary (まとめ・貢献)"
  }},
  "key_vocab_hints": [
    {{"ja": "Japanese phrase", "vi": "Vietnamese meaning"}},
    {{"ja": "Japanese phrase 2", "vi": "Vietnamese meaning 2"}}
  ]
}}"""

        history_summary = ""
        if request.previous_turns:
            history_summary = "Previous dialogue context:\n"
            for t in request.previous_turns[-3:]:
                q_txt = t.get("question_ja", "")
                a_txt = t.get("candidate_answer", "")
                history_summary += f"Interviewer: {q_txt}\nCandidate: {a_txt}\n"

        user_content = f"""Role: {request.role}
Turn Index: {turn_idx}
{history_summary}
Please generate the dynamic question for Turn {turn_idx}."""

        try:
            req = AIRequest(
                task=AITask.INTERVIEW_COACH_QUESTION,
                system_instruction=system_prompt,
                messages=[
                    AIMessage(role=AIMessageRole.SYSTEM, content=system_prompt),
                    AIMessage(role=AIMessageRole.USER, content=user_content),
                ],
                response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
                temperature=0.7,
                max_output_tokens=700,
            )
            resp = await self.ai_router.generate(
                task=AITask.INTERVIEW_COACH_QUESTION, request=req
            )
            raw_text = (resp.text or "").strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1).rstrip("```").strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.replace("```", "", 1).rstrip("```").strip()

            data = json.loads(raw_text)

            starters_data = data.get("prep_starters", {})
            parsed_starters = PREPStarters(
                point=starters_data.get("point", prep_starter.point),
                reason=starters_data.get("reason", prep_starter.reason),
                example=starters_data.get("example", prep_starter.example),
                summary=starters_data.get("summary", prep_starter.summary),
            )

            return InterviewQuestion(
                id=str(uuid.uuid4())[:8],
                question_ja=data.get("question_ja", seed["question_ja"]),
                question_vi=data.get("question_vi", seed["question_vi"]),
                reading_hiragana=data.get("reading_hiragana", seed["reading_hiragana"]),
                romaji=data.get("romaji", ""),
                interviewer_name=prof["name"],
                interviewer_title=prof["title"],
                interviewer_style=request.interviewer_style,
                intent_explanation_vi=data.get(
                    "intent_explanation_vi", seed["intent_vi"]
                ),
                prep_starters=parsed_starters,
                key_vocab_hints=data.get("key_vocab_hints", seed["key_vocab"]),
                turn_index=turn_idx,
                total_turns=5,
                source="ai",
            )
        except Exception as e:
            logger.warning(
                f"[InterviewCoach] AI generation failed, using procedural pool: {e}"
            )
            return InterviewQuestion(
                id=str(uuid.uuid4())[:8],
                question_ja=seed["question_ja"],
                question_vi=seed["question_vi"],
                reading_hiragana=seed["reading_hiragana"],
                romaji="",
                interviewer_name=prof["name"],
                interviewer_title=prof["title"],
                interviewer_style=request.interviewer_style,
                intent_explanation_vi=seed["intent_vi"],
                prep_starters=prep_starter,
                key_vocab_hints=seed["key_vocab"],
                turn_index=turn_idx,
                total_turns=5,
                source="seed",
            )

    async def evaluate_and_coach(
        self, request: EvaluateAnswerRequest
    ) -> InterviewCoachEvaluation:
        """Analyzes answer on PREP logic, Keigo etiquette, and provides native rewrite."""
        user_answer = request.user_answer.strip()
        prof = INTERVIEWER_PROFILES.get(
            request.interviewer_style,
            INTERVIEWER_PROFILES[InterviewerPersonality.FRIENDLY],
        )

        system_prompt = f"""You are an elite Japanese Corporate Interview Coach and Evaluator.
Interviewer Persona: {prof['name']} ({prof['title']}).
Candidate Role: {request.role}
Turn Number: {request.turn_index} of 5.
Interviewer Question: {request.question_ja}
Candidate Answer: {user_answer}

Analyze the candidate's answer with "Nói tới đâu sửa tới đó" coaching mindset:
1. PREP Analysis (Point, Reason, Example, Point):
   - Did the candidate state the conclusion first (結論ファースト)?
   - Is there a convincing reason and specific real-world example/data?
   - Is there a forward-looking summary commitment?
   - Score each (0-100).
2. Keigo & Etiquette Check:
   - Identify incorrect Keigo (e.g. using 貴社 (spoken should be 御社/おんしゃ), using 申す for interviewer, missing Kenjougo/Sonkeigo).
   - Flag any casual slang or awkward Vietnamese-Japanese phrasing.
3. Coach Guidance (in Vietnamese):
   - Direct, encouraging coaching advice on what worked well and what to say next time.
4. Native Model Rewrite (模範解答):
   - Provide the ideal, polished Japanese response that a successful candidate in Japan would say.
   - Include Hiragana reading and Vietnamese translation.

You MUST respond strictly with valid JSON conforming to:
{{
  "overall_score": 85,
  "prep_score": 80,
  "keigo_score": 90,
  "prep_breakdown": {{
    "point_score": 85,
    "reason_score": 80,
    "example_score": 75,
    "summary_score": 80,
    "feedback_vi": "Nhận xét chi tiết cấu trúc PREP bằng tiếng Việt"
  }},
  "keigo_fixes": [
    {{
      "original_phrase": "Cụm sai",
      "corrected_phrase": "Cụm đúng",
      "keigo_type": "Kenjougo / Sonkeigo / Teineigo",
      "explanation_vi": "Giải thích lỗi"
    }}
  ],
  "coach_feedback_vi": "Lời khuyên mang tính huấn luyện viên chi tiết",
  "strengths_vi": ["Điểm mạnh 1", "Điểm mạnh 2"],
  "areas_to_improve_vi": ["Điểm cần khắc phục 1"],
  "native_model_answer": "Bản viết lại tiếng Nhật hoàn hảo",
  "native_model_reading": "Bản đọc Hiragana",
  "native_model_vi": "Dịch nghĩa tiếng Việt của bản viết lại",
  "recommended_vocab": [
    {{"ja": "単語", "vi": "nghĩa"}}
  ],
  "suggested_followup_question_hint": "Gợi ý câu hỏi xoáy tiếp theo mà nhà tuyển dụng có thể hỏi"
}}"""

        try:
            req = AIRequest(
                task=AITask.INTERVIEW_COACH_EVALUATION,
                system_instruction=system_prompt,
                messages=[
                    AIMessage(role=AIMessageRole.SYSTEM, content=system_prompt),
                    AIMessage(
                        role=AIMessageRole.USER,
                        content=f"Candidate answer to evaluate: {user_answer}",
                    ),
                ],
                response_format=ResponseFormat(type=ResponseFormatType.JSON_OBJECT),
                temperature=0.3,
                max_output_tokens=900,
            )
            resp = await self.ai_router.generate(
                task=AITask.INTERVIEW_COACH_EVALUATION, request=req
            )
            raw_text = (resp.text or "").strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text.replace("```json", "", 1).rstrip("```").strip()
            elif raw_text.startswith("```"):
                raw_text = raw_text.replace("```", "", 1).rstrip("```").strip()

            data = json.loads(raw_text)

            prep_bd = data.get("prep_breakdown", {})
            parsed_prep = PREPScoreBreakdown(
                point_score=prep_bd.get("point_score", 80),
                reason_score=prep_bd.get("reason_score", 75),
                example_score=prep_bd.get("example_score", 75),
                summary_score=prep_bd.get("summary_score", 80),
                feedback_vi=prep_bd.get(
                    "feedback_vi", "Cấu trúc trả lời có ý tưởng nhưng cần rõ ràng hơn."
                ),
            )

            fixes = [
                KeigoAnalysisItem(
                    original_phrase=item.get("original_phrase", ""),
                    corrected_phrase=item.get("corrected_phrase", ""),
                    keigo_type=item.get("keigo_type", "Keigo"),
                    explanation_vi=item.get("explanation_vi", ""),
                )
                for item in data.get("keigo_fixes", [])
            ]

            return InterviewCoachEvaluation(
                overall_score=data.get("overall_score", 80),
                prep_score=data.get("prep_score", 80),
                keigo_score=data.get("keigo_score", 85),
                prep_breakdown=parsed_prep,
                keigo_fixes=fixes,
                coach_feedback_vi=data.get(
                    "coach_feedback_vi",
                    "Bạn đã thể hiện tốt tinh thần trả lời, hãy chú ý nêu kết luận trước và dùng 御社 (おんしゃ) khi nói.",
                ),
                strengths_vi=data.get(
                    "strengths_vi", ["Nắm bắt được trọng tâm câu hỏi"]
                ),
                areas_to_improve_vi=data.get(
                    "areas_to_improve_vi", ["Cần thêm số liệu hoặc ví dụ cụ thể"]
                ),
                native_model_answer=data.get(
                    "native_model_answer",
                    f"結論から申し上げますと、{request.role}としての私の強みは迅速な課題解決力でございます。",
                ),
                native_model_reading=data.get("native_model_reading", None),
                native_model_vi=data.get(
                    "native_model_vi",
                    "Nêu bật luận điểm mở đầu và cam kết cống hiến.",
                ),
                recommended_vocab=data.get("recommended_vocab", []),
                suggested_followup_question_hint=data.get(
                    "suggested_followup_question_hint", None
                ),
            )
        except Exception as e:
            logger.warning(
                f"[InterviewCoach] AI evaluation failed, returning fast evaluation: {e}"
            )
            has_conclusion = any(
                p in user_answer
                for p in ["結論", "申し上げます", "私の強み", "志望いたしました"]
            )
            has_reason = any(
                p in user_answer for p in ["なぜなら", "理由", "からでございます"]
            )
            has_example = any(
                p in user_answer
                for p in ["具体的には", "例えば", "経験", "プロジェクト"]
            )

            prep_score = (
                (35 if has_conclusion else 15)
                + (30 if has_reason else 15)
                + (35 if has_example else 15)
            )

            return InterviewCoachEvaluation(
                overall_score=prep_score,
                prep_score=prep_score,
                keigo_score=80,
                prep_breakdown=PREPScoreBreakdown(
                    point_score=80 if has_conclusion else 60,
                    reason_score=80 if has_reason else 60,
                    example_score=75 if has_example else 55,
                    summary_score=75,
                    feedback_vi="Bạn đã trình bày ý tưởng, hãy chú ý áp dụng mẫu câu mở đầu để câu văn đậm chất công sở Nhật Bản.",
                ),
                keigo_fixes=[],
                coach_feedback_vi="Hãy tự tin hơn và chú ý nói rõ luận điểm chính ngay ở câu mở đầu (結論ファースト).",
                strengths_vi=["Dũng cảm diễn đạt trọn vẹn ý kiến"],
                areas_to_improve_vi=[
                    "Bổ sung dẫn chứng chi tiết hơn cho luận điểm"
                ],
                native_model_answer=f"結論から申し上げますと、私は{request.role}として貴社の事業推進に貢献できると確信しております。",
                native_model_reading=None,
                native_model_vi="Tóm tắt luận điểm mở đầu và cam kết cống hiến cho công ty.",
                recommended_vocab=[{"ja": "即戦力", "vi": "nguồn lực sẵn sàng chiến đấu"}],
                suggested_followup_question_hint="Nhà tuyển dụng có thể hỏi sâu về dự án cụ thể mà bạn từng thực hiện.",
            )
