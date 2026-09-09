import json
import random
from collections.abc import AsyncIterator
from typing import Any, ClassVar, Literal

from pydantic import BaseModel

from app.providers.ai.base import (
    AICapabilities,
    AIGenerationResult,
    AIModelInfo,
    AIProvider,
    AIStreamChunk,
    AIUsage,
)
from app.providers.ai.errors import (
    AIAuthenticationError,
    AIConfigurationError,
    AIProviderUnavailableError,
    AIRateLimitError,
    AIResponseError,
    AITimeoutError,
)

FailMode = Literal[
    "timeout",
    "rate_limit",
    "unavailable",
    "authentication_error",
    "configuration_error",
    "invalid_structured",
]


def _sample_from_pattern(pattern: str) -> str | None:
    """Derive a valid sample from simple '^(a|b|c)$' alternation patterns."""
    body = pattern
    if body.startswith("^") and body.endswith("$"):
        body = body[1:-1]
    if "|" in body and not any(ch in body for ch in "[(?*+."):
        return body.split("|")[0]
    return None


def _sample_from_schema(schema: dict[str, Any], defs: dict[str, Any] | None = None) -> Any:
    """Build a deterministic sample value from a JSON schema (fake provider only)."""
    defs = defs or {}
    schema_type = schema.get("type")
    if "$ref" in schema:
        ref_name = schema["$ref"].rsplit("/", 1)[-1]
        return _sample_from_schema(defs.get(ref_name, {}), defs)
    if schema_type == "object":
        return {
            key: _sample_from_schema(value_schema, defs)
            for key, value_schema in (schema.get("properties") or {}).items()
        }
    if schema_type == "array":
        return []
    if schema_type in ("integer", "number"):
        return 1
    if schema_type == "boolean":
        return True
    if "const" in schema:
        return schema["const"]
    if "enum" in schema:
        return schema["enum"][0]
    if "anyOf" in schema or "oneOf" in schema:
        return _sample_from_schema((schema.get("anyOf") or schema.get("oneOf"))[0], defs)
    if "pattern" in schema:
        sampled = _sample_from_pattern(schema["pattern"])
        if sampled is not None:
            return sampled
    return "sample"


class FakeAIProvider(AIProvider):
    """Deterministic in-memory provider used for tests and local development.

    Pass ``fail_mode`` to simulate provider failures and exercise retry /
    fallback logic without touching real services.
    """

    name = "fake"
    capabilities = AICapabilities()
    _default_model_fallback: ClassVar[str] = "fake-model"

    def __init__(
        self,
        *,
        seed_text: str = "Fake AI response",
        model: str = "fake-model",
        fail_mode: FailMode | None = None,
    ) -> None:
        self._seed_text = seed_text
        self._model = model
        self._fail_mode = fail_mode

    @property
    def default_model(self) -> str:
        return self._model

    def validate_configuration(self) -> None:
        if self._fail_mode == "configuration_error":
            raise AIConfigurationError(
                "Fake provider is misconfigured (simulated)", provider=self.name
            )

    async def is_available(self) -> bool:
        return self._fail_mode not in ("unavailable", "configuration_error")

    async def list_models(self) -> list[AIModelInfo]:
        self._fail()
        return [AIModelInfo(id=self._model, provider=self.name)]

    def _fail(self) -> None:
        if self._fail_mode == "timeout":
            raise AITimeoutError(
                "Simulated provider timeout", provider=self.name, model=self._model
            )
        if self._fail_mode == "rate_limit":
            raise AIRateLimitError("Simulated rate limit", provider=self.name, model=self._model)
        if self._fail_mode == "unavailable":
            raise AIProviderUnavailableError(
                "Simulated provider unavailable", provider=self.name, model=self._model
            )
        if self._fail_mode == "authentication_error":
            raise AIAuthenticationError(
                "Simulated authentication failure", provider=self.name, model=self._model
            )
        if self._fail_mode == "configuration_error":
            raise AIConfigurationError(
                "Fake provider is misconfigured (simulated)", provider=self.name
            )

    def _usage(self, prompt: str, text: str) -> AIUsage:
        return AIUsage(
            input_tokens=len(prompt.split()),
            output_tokens=len(text.split()),
            total_tokens=len(prompt.split()) + len(text.split()),
        )

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AIGenerationResult:
        self._fail()
        text = f"{self._seed_text}: {prompt}"
        return AIGenerationResult(
            text=text,
            provider=self.name,
            model=model or self._model,
            usage=self._usage(prompt, text),
        )

    async def generate_structured(
        self,
        prompt: str,
        response_model: type[BaseModel],
        *,
        system: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        **kwargs: Any,
    ) -> tuple[BaseModel, AIGenerationResult]:
        self._fail()
        if self._fail_mode == "invalid_structured":
            raise AIResponseError(
                "Simulated invalid structured output",
                provider=self.name,
                model=model or self._model,
            )
        payload = self._evaluation_sample(response_model, prompt)
        if payload is None:
            schema = response_model.model_json_schema()
            payload = _sample_from_schema(schema, schema.get("$defs", {}))
        text = json.dumps(payload, ensure_ascii=False)
        parsed = response_model.model_validate(json.loads(text))
        return parsed, AIGenerationResult(
            text=text,
            provider=self.name,
            model=model or self._model,
            usage=self._usage(prompt, text),
        )

    def _evaluation_sample(
        self, response_model: type[BaseModel], prompt: str = ""
    ) -> dict[str, Any] | None:
        """Deterministic, internally consistent samples for evaluation stages.

        Generic schema sampling cannot produce evaluations that pass the
        deterministic consistency validator (score bands, non-empty hints),
        so the fake provider returns coherent values for those models.
        """
        if response_model.__name__ == "RealWorldMissionAIDraft":
            return {
                "role": "Kỹ sư phần mềm BrSE",
                "recipient": "Trưởng phòng Sato (佐藤部長)",
                "relationship": "Cấp dưới - Trưởng phòng",
                "objective": "Báo cáo tiến độ hoàn thành API và xin phép dời thời gian kiểm thử sang ngày mai.",
                "situation_vi": "Bạn đang phát triển tính năng tích hợp API cho khách hàng. Tiến độ đã hoàn thành 90% nhưng cần thêm 1 ngày kiểm thử do bên thứ 3 bảo trì server.",
                "context_vi": "Viết email báo cáo tiến độ gửi Trưởng phòng Sato giải thích rõ lý do và đề xuất thời gian hoàn tất mới.",
                "situation_ja": "現在、顧客向けAPI連携機能を開発中です。開発は90%完了しましたが、外部サーバーのメンテナンスによりテスト期間を1日延長する必要があります。",
                "context_ja": "佐藤部長宛てに進捗報告メールを作成し、理由を説明した上で新しい完了予定日時を提案してください。",
                "incoming_message": "お疲れ様です。佐藤です。API連携機能の進捗状況はどうなっていますか？本日の定例までに共有をお願いします。",
                "constraints": ["Phải xin lỗi trước khi nêu lý do", "Đưa ra thời gian dự kiến mới cụ thể", "Sử dụng kính ngữ Keigo chuẩn mực"],
                "required_points": [
                    {"id": "current_status", "description": "Báo cáo đã hoàn thành 90% phần cốt lõi"},
                    {"id": "delay_reason", "description": "Lý do chậm trễ do server bên thứ 3 bảo trì"},
                    {"id": "new_eta", "description": "Thời gian hoàn tất kiểm thử mới là 17:00 ngày mai"},
                ],
                "target_register": "business",
                "optional_vocabulary": [
                    {"word": "進捗", "reading": "しんちょく", "meaning": "tiến độ", "example": "進捗状況をご報告いたします。"},
                    {"word": "ご査収", "reading": "ごさしゅう", "meaning": "xem xét/kiểm tra", "example": "添付ファイルをご査収ください。"},
                    {"word": "遅延", "reading": "ちえん", "meaning": "chậm trễ", "example": "開発に遅延が生じており申し訳ございません。"},
                ],
                "success_conditions": ["Đầy đủ 3 điểm thông tin bắt buộc", "Dùng đúng kính ngữ sonkeigo/kenjougo", "Không có câu văn thân mật"],
                "pedagogical_target_summary": "Thực hành kính ngữ báo cáo tiến độ và cấu trúc xin lỗi kèm phương án xử lý.",
            }
        if response_model.__name__ == "MissionEvaluationAIResult":
            return {
                "overall_score": 88,
                "passed": True,
                "dimensions": {
                    "task_completion": {"score": 90, "status": "excellent", "feedback_vi": "Hoàn thành xuất sắc mục tiêu báo cáo tiến độ."},
                    "factual_completeness": {"score": 90, "status": "excellent", "feedback_vi": "Nêu đầy đủ tiến độ, lý do và thời gian mới."},
                    "naturalness": {"score": 85, "status": "excellent", "feedback_vi": "Diễn đạt tự nhiên, chuẩn phong cách kinh doanh."},
                    "grammar": {"score": 90, "status": "excellent", "feedback_vi": "Ngữ pháp chính xác, trợ từ dùng đúng."},
                    "vocabulary": {"score": 85, "status": "excellent", "feedback_vi": "Từ vựng chuyên nghiệp, đúng ngữ cảnh công sở."},
                    "register": {"score": 90, "status": "excellent", "feedback_vi": "Tuân thủ nghiêm ngặt văn phong kính ngữ Keigo."},
                    "politeness": {"score": 90, "status": "excellent", "feedback_vi": "Mức độ lịch thiệp cao, thể hiện sự tôn trọng."},
                    "tone": {"score": 85, "status": "excellent", "feedback_vi": "Sắc thái chân thành và tinh thần trách nhiệm cao."},
                    "clarity": {"score": 88, "status": "excellent", "feedback_vi": "Trình bày mạch lạc, các mốc thời gian rõ ràng."},
                    "discourse": {"score": 87, "status": "excellent", "feedback_vi": "Bố cục email chuẩn từ chào đầu đến kết thúc."},
                },
                "required_points": [
                    {"id": "current_status", "description": "Báo cáo tiến độ 90%", "status": "satisfied", "explanation_vi": "Đã nêu rõ tiến độ đạt 90%."},
                    {"id": "delay_reason", "description": "Lý do chậm trễ bên thứ 3", "status": "satisfied", "explanation_vi": "Đã giải thích nguyên nhân khách quan."},
                    {"id": "new_eta", "description": "Thời hạn mới 17:00 ngày mai", "status": "satisfied", "explanation_vi": "Đã cam kết thời gian hoàn tất."},
                ],
                "constraints_respected": True,
                "constraints_feedback": ["Đã xin lỗi lịch thiệp", "Đã nêu thời gian mới", "Đã dùng kính ngữ chuẩn"],
                "strengths_vi": ["Sử dụng chuẩn xác cấu trúc báo cáo kinh doanh.", "Sắc thái xin lỗi chân thành và chủ động đưa ra giải pháp."],
                "improvements_vi": ["Có thể bổ sung câu đệm '恐れ入りますが' để câu văn mềm mại hơn."],
                "native_model_rewrite": "佐藤部長\n\nお疲れ様です。進捗のご報告をいたします。\n現在開発は90%完了しておりますが、外部連携サーバーのメンテナンスに伴い、テスト完了を明日17時まで延長させていただきたく存じます。\nご迷惑をおかけし大変恐縮ですが、何卒よろしくお願い申し上げます。",
                "rewrite_nuances_vi": "Bản viết mẫu sử dụng kính ngữ khiêm nhường 'させていただきたく存じます' thể hiện sự tôn trọng tối đa.",
                "cultural_discourse_tip_vi": "Trong văn hóa kinh doanh Nhật Bản, khi báo trễ cần tuân thủ nguyên tắc HOU-REN-SO (Báo cáo - Liên lạc - Thảo luận) càng sớm càng tốt.",
            }
        if response_model.__name__ == "WritingDrillDraft":
            return {
                "title": "Luyện tập mục tiêu: Sử dụng trợ từ tiếng Nhật",
                "target_focus": "Sử dụng chính xác trợ từ は, が, に, で trong ngữ cảnh câu thực tế",
                "difficulty": 5,
                "jlpt_level": "N3",
                "items": [
                    {
                        "drill_type": "recognition",
                        "stage": 1,
                        "guidance_level": "heavy_guidance",
                        "title_vi": "Bước 1: Nhận diện trợ từ đúng trong ngữ cảnh",
                        "instructions_vi": "Chọn trợ từ thích hợp nhất để hoàn thành câu bên dưới.",
                        "context_description": "Nói về việc đang ở thư viện đọc sách.",
                        "source_text": "図書館___本を読みます。(ở thư viện)",
                        "scaffold": "Địa điểm diễn ra hành động dùng trợ từ: [で]",
                        "hints": [
                            "Hãy nhớ: hành động diễn ra tại một địa điểm thì dùng で.",
                            "Nếu chỉ sự tồn tại (có ở đâu) mới dùng に.",
                        ],
                        "options": [
                            {"id": "a", "text": "で", "is_correct": True, "explanation": "Chính xác, で biểu thị địa điểm diễn ra hành động đọc sách."},
                            {"id": "b", "text": "に", "is_correct": False, "explanation": "Sai, に dùng cho sự tồn tại hoặc đích đến."},
                            {"id": "c", "text": "を", "is_correct": False, "explanation": "Sai, を đi với tân ngữ của hành động."},
                        ],
                        "target_answer": "図書館で本を読みます。",
                        "accepted_alternatives": ["図書館で本を読んでいる。"],
                        "explanation": "Trợ từ で dùng để chỉ địa điểm nơi một hành động cụ thể diễn ra.",
                        "target_focus": "Trợ từ で chỉ nơi diễn ra hành động",
                    },
                    {
                        "drill_type": "correction",
                        "stage": 2,
                        "guidance_level": "light_guidance",
                        "title_vi": "Bước 2: Sửa lỗi trợ từ trong câu",
                        "instructions_vi": "Hãy sửa lỗi trợ từ chưa chính xác trong câu tiếng Nhật dưới đây.",
                        "context_description": "Tin nhắn cho bạn bè hẹn gặp ở quán cà phê.",
                        "source_text": "駅前のカフェにコーヒーを飲みましょう。",
                        "scaffold": "Sửa trợ từ に thành trợ từ diễn tả nơi uống cà phê: [___]",
                        "hints": [
                            "Uống cà phê là một hành động cụ thể, hãy kiểm tra trợ từ sau danh từ địa điểm.",
                        ],
                        "options": None,
                        "target_answer": "駅前のカフェでコーヒーを飲みましょう。",
                        "accepted_alternatives": ["駅前のカフェでコーヒーを飲もう。"],
                        "explanation": "Vì 'uống cà phê' là hành động, địa điểm 'quán cà phê' phải đi với trợ từ で chứ không phải に.",
                        "target_focus": "Sửa lỗi に -> で cho hành động",
                    },
                    {
                        "drill_type": "vietnamese_to_japanese",
                        "stage": 3,
                        "guidance_level": "minimal_guidance",
                        "title_vi": "Bước 3: Dịch câu áp dụng quy tắc trợ từ",
                        "instructions_vi": "Dịch câu tiếng Việt sang tiếng Nhật, chú ý sử dụng đúng trợ từ địa điểm.",
                        "context_description": "Kể với đồng nghiệp về buổi họp hôm qua tại phòng họp tầng 3.",
                        "source_text": "Hôm qua chúng tôi đã tổ chức cuộc họp tại phòng họp tầng 3.",
                        "scaffold": None,
                        "hints": [
                            "Phòng họp tầng 3 là 3階の会議室, tổ chức cuộc họp là ミーティングを行いました.",
                        ],
                        "options": None,
                        "target_answer": "昨日、3階の会議室で会議を行いました。",
                        "accepted_alternatives": [
                            "昨日3階の会議室でミーティングをしました。",
                            "きのう3階の会議室で会議を開きました。",
                        ],
                        "explanation": "Sử dụng 3階の会議室で kết hợp với động từ hành động 会議を行う.",
                        "target_focus": "Áp dụng で cho địa điểm họp",
                    },
                    {
                        "drill_type": "free_response",
                        "stage": 4,
                        "guidance_level": "no_guidance",
                        "title_vi": "Bước 4: Ứng dụng tự do trong bối cảnh mới",
                        "instructions_vi": "Hãy viết 1 câu tiếng Nhật tự nhiên kể về một hoạt động bạn thường làm vào cuối tuần tại một địa điểm cụ thể.",
                        "context_description": "Tự giới thiệu thói quen cuối tuần trong bài viết ngắn.",
                        "source_text": "Hãy viết một câu miêu tả hoạt động cuối tuần của bạn ở công viên hoặc quán quen.",
                        "scaffold": None,
                        "hints": [],
                        "options": None,
                        "target_answer": "毎週末、近くの公園でジョギングをしています。",
                        "accepted_alternatives": [
                            "週末はいつもカフェで勉強しています。",
                            "休みの日は家で映画を見ます。",
                        ],
                        "explanation": "Đảm bảo câu dùng đúng trợ từ chỉ địa điểm hành động và thể tự nhiên.",
                        "target_focus": "Tự do sản sinh câu chuẩn trợ từ",
                    },
                ],
            }

        if response_model.__name__ == "DrillEvaluationResult":
            return {
                "is_correct": True,
                "score": 92,
                "feedback_vi": "Bạn đã áp dụng chính xác trợ từ và ngữ pháp phù hợp với ngữ cảnh.",
                "nuance_contrast": None,
                "corrected_text": "駅前のカフェでコーヒーを飲みましょう。",
                "key_points_covered": ["Trợ từ で chỉ địa điểm hành động", "Chia thể lịch sử chuẩn xác"],
            }

        if response_model.__name__ == "DrillDebriefResult":
            return {
                "debrief_vi": "Bạn đã hoàn thành xuất sắc chuỗi bài tập và nắm vững sự khác biệt giữa trợ từ に và で trong các bối cảnh khác nhau.",
                "mastery_assessment": "substantial_improvement",
                "next_step_vi": "Tiếp tục duy trì thói quen áp dụng quy tắc này trong các bài viết dài hơn.",
            }

        if response_model.__name__ == "ExercisePlan":
            return {
                "exercise_type": "sentence_translation",
                "topic": "Work",
                "subtopic": "Overtime",
                "register": "casual",
                "jlpt_level": "N3",
                "difficulty": 5,
                "target_length": "sentence",
            }
        if response_model.__name__ == "ExerciseDraft":
            return {
                "context": "Một ngày làm việc khá bận rộn.",
                "prompt_vi": (
                    "Hôm nay công việc ở văn phòng rất nhiều nên tôi phải ở lại làm thêm giờ. "
                    "Tôi dự định sau khi hoàn thành xong bản báo cáo này thì sẽ về nhà nghỉ ngơi. "
                    "Hy vọng ngày mai mọi thứ sẽ suôn sẻ hơn."
                ),
                "grammar_complexity": 5,
                "vocabulary_complexity": 5,
                "context_complexity": 5,
                "naturalness_target": 5,
            }
        if response_model.__name__ == "ExerciseValidationResult":
            return {
                "valid": True,
                "issues": [],
            }
        if response_model.__name__ == "SemanticEvaluation":
            return {
                "classification": "fully_equivalent",
                "score": 90,
                "omissions": [],
                "additions": [],
                "meaning_changes": [],
                "confidence": "high",
            }
        if response_model.__name__ == "GrammarVocabularyEvaluation":
            return {
                "grammar_score": 90,
                "vocabulary_score": 90,
                "issues": [],
                "confidence": "high",
            }
        if response_model.__name__ == "NaturalnessRegisterEvaluation":
            return {
                "naturalness_classification": "natural",
                "naturalness_score": 90,
                "context_fit_score": 90,
                "register_fit_score": 90,
                "issues": [],
                "register_notes": None,
                "confidence": "high",
            }
        if response_model.__name__ == "CorrectionResult":
            return {
                "correct_version": "今日は仕事が多いので、帰るのが遅くなると思います。",
                "natural_version": "今日は仕事がかなり立て込んでいて、帰りが遅くなりそうです。",
                "native_version": "今日は仕事が立て込んでいて、帰りが遅くなりそうです。",
                "casual_version": "今日仕事いっぱいで、帰るの遅くなりそう。",
                "polite_version": "今日は仕事が多くて、帰りが遅くなりそうです。",
                "business_version": "本日は業務が立て込んでおり、帰社が遅くなる見込みです。",
            }
        if response_model.__name__ == "HintResult":
            return {
                "hints": [
                    "Hãy kiểm tra trợ từ trong câu của bạn.",
                    "Xem lại cách bạn nối ý 'vì nhiều việc' với 'về muộn'.",
                    "Thử diễn đạt theo hướng tự nhiên hơn, gần với cách người Nhật nói.",
                ]
            }
        if response_model.__name__ == "EvaluationVerificationResult":
            return {
                "accepted": True,
                "false_positive_grammar": [],
                "incorrect_naturalness_claims": [],
                "score_inconsistencies": [],
                "semantic_misclassification": False,
                "notes": None,
            }
        if response_model.__name__ == "VocabularyExtractionResult":
            return {
                "candidates": [
                    {
                        "expression": "立て込む",
                        "reading": "たてこむ",
                        "type": "word",
                        "meaning_vi": "công việc bị dồn, rất bận",
                        "part_of_speech": "動詞",
                        "estimated_jlpt_level": "N2",
                        "difficulty": 7,
                        "register": "business",
                        "usage_context": "work",
                        "example_sentence": "今日は仕事がかなり立て込んでいます。",
                        "natural_alternatives": ["仕事が詰まっている"],
                        "learning_reason": (
                            "Bạn hay viết とても忙しい; trong ngữ cảnh công việc, "
                            "立て込む diễn tả tự nhiên hơn khi nhiều việc bị dồn lại."
                        ),
                        "importance": 7,
                        "confidence": "high",
                        "source_type": "ai_natural",
                        "user_expression": "とても忙しい",
                    },
                    {
                        "expression": "仕事が立て込んでいる",
                        "reading": None,
                        "type": "expression",
                        "meaning_vi": "việc dồn dập, bận rộn",
                        "part_of_speech": None,
                        "estimated_jlpt_level": "N2",
                        "difficulty": 6,
                        "register": "business",
                        "usage_context": "work",
                        "example_sentence": "今日は仕事が立て込んでいるので、残業します。",
                        "natural_alternatives": [],
                        "learning_reason": (
                            "Cụm tự nhiên dùng để nói về tình trạng bận rộn trong công việc."
                        ),
                        "importance": 6,
                        "confidence": "high",
                        "source_type": "ai_native",
                        "user_expression": "忙しいです",
                    },
                ]
            }
        if response_model.__name__ == "VocabularyValidationResult":
            return {
                "approved": True,
                "duplicate_of": None,
                "rejected_reason": None,
                "corrected_expression": None,
                "corrected_reading": None,
                "corrected_meaning_vi": None,
                "corrected_jlpt_level": None,
                "corrected_difficulty": None,
                "corrected_register": None,
                "confidence": "high",
            }
        if response_model.__name__ == "VocabularyExplanationResult":
            return {
                "explanations": [
                    {
                        "expression": "立て込む",
                        "learning_reason": (
                            "Bạn hay viết とても忙しい; trong ngữ cảnh công việc, "
                            "立て込む diễn tả tự nhiên hơn khi nhiều việc bị dồn lại."
                        ),
                        "notes": "Thường dùng với 仕事が (仕事が立て込む).",
                        "example_sentence": "今日は仕事がかなり立て込んでいます。",
                        "natural_alternatives": ["仕事が詰まっている"],
                    },
                    {
                        "expression": "仕事が立て込んでいる",
                        "learning_reason": (
                            "Cụm tự nhiên dùng để nói về tình trạng bận rộn trong công việc."
                        ),
                        "notes": None,
                        "example_sentence": "今日は仕事が立て込んでいるので、残業します。",
                        "natural_alternatives": [],
                    },
                ]
            }
        if response_model.__name__ == "VocabLookupAiResult":
            return {
                "query": "bàn bạc lại",
                "detected_direction": "vi_to_ja",
                "context_analysis": "Ngữ cảnh công việc / dự án cần thống nhất lại phương án.",
                "best_match": {
                    "expression": "すり合わせる",
                    "reading": "すりあわせる",
                    "meaning_vi": "Bàn bạc, đối chiếu, thống nhất ý kiến",
                    "part_of_speech": "動詞",
                    "estimated_jlpt_level": "N2",
                    "difficulty": 6,
                    "register": "business",
                    "nuance_explanation": (
                        "Trong môi trường công sở, すり合わせる thể hiện việc các bên cùng "
                        "ngồi lại đối chiếu, điều chỉnh để đi đến một thống nhất chung."
                    ),
                    "usage_collocation": "スケジュールをすり合わせる",
                    "example_sentence": "進捗に遅れが出ているため、一度スケジュールをすり合わせましょう。",
                    "example_sentence_vi": "Vì tiến độ đang bị trễ, chúng ta hãy cùng bàn bạc đối chiếu lại lịch trình một lần nhé.",
                    "examples": [
                        {
                            "situation": "Giao tiếp hàng ngày",
                            "ja": "明日、少し時間をとってすり合わせできますか？",
                            "vi": "Ngày mai bạn có thể dành chút thời gian để bàn bạc thống nhất lại không?",
                        },
                        {
                            "situation": "Công sở & Dự án",
                            "ja": "プロジェクトの方向性について、関係者全員でしっかりとすり合わせを行う必要があります。",
                            "vi": "Chúng ta cần thực hiện một cuộc họp thống nhất kỹ lưỡng với tất cả các bên liên quan về định hướng của dự án.",
                        },
                    ],


                },
                "alternatives": [
                    {
                        "expression": "再調整する",
                        "reading": "さいちょうせいする",
                        "meaning_vi": "Điều chỉnh lại",
                        "estimated_jlpt_level": "N2",
                        "register": "business",
                        "difference_explanation": "Nhấn mạnh vào việc sắp xếp, thay đổi lại các mốc thời gian hoặc kế hoạch cụ thể.",
                    },
                    {
                        "expression": "打ち合わせをする",
                        "reading": "うちあわせをする",
                        "meaning_vi": "Họp trao đổi",
                        "estimated_jlpt_level": "N3",
                        "register": "polite",
                        "difference_explanation": "Cuộc họp thảo luận thông thường, sắc thái trung tính hơn.",
                    },
                ],
            }

        if response_model.__name__ == "LearnerProfileSynthesisResult":
            profiles = [
                {
                    "strengths": ["Diễn đạt ý tưởng cơ bản mạch lạc, dùng thể Desu/Masu chuẩn."],
                    "weaknesses": ["Cách dùng trợ từ は/が trong câu ghép nhiều mệnh đề."],
                    "estimated_jlpt": {"min_level": "N5", "max_level": "N4", "confidence": "medium"},
                    "recent_trends": {"overall_score": 72, "improvement": 4, "last_7d_attempts": 6},
                },
                {
                    "strengths": ["Vốn từ vựng sinh hoạt phong phú, phản xạ ngữ pháp tốt."],
                    "weaknesses": ["Phân biệt trợ từ chỉ nơi chốn に và で."],
                    "estimated_jlpt": {"min_level": "N4", "max_level": "N3", "confidence": "high"},
                    "recent_trends": {"overall_score": 78, "improvement": 5, "last_7d_attempts": 8},
                },
                {
                    "strengths": ["Cấu trúc câu phong phú, biết vận dụng câu điều kiện たら/ば."],
                    "weaknesses": ["Sử dụng kính ngữ Sonkeigo và Kenjougo còn lúng túng."],
                    "estimated_jlpt": {"min_level": "N3", "max_level": "N2", "confidence": "medium"},
                    "recent_trends": {"overall_score": 84, "improvement": 6, "last_7d_attempts": 10},
                },
            ]
            return random.choice(profiles)

        if response_model.__name__ == "MistakeClusteringResult":
            mistake_clusters = [
                [
                    {
                        "canonical_label": "particle_ha_ga",
                        "description_vi": "Dùng nhầm trợ từ は và が khi xác định chủ đề/chủ ngữ.",
                        "example_snippets": ["私は猫が好きです", "今日は雨が降ります"],
                        "severity": "major",
                    }
                ],
                [
                    {
                        "canonical_label": "particle_ni_de",
                        "description_vi": "Nhầm lẫn giữa trợ từ に (nơi tồn tại/mục tiêu) và で (nơi hành động).",
                        "example_snippets": ["図書館で本があります", "駅に行きます"],
                        "severity": "minor",
                    }
                ],
                [
                    {
                        "canonical_label": "conditional_forms",
                        "description_vi": "Dùng chưa chính xác sắc thái giữa たら, ば và と trong câu điều kiện.",
                        "example_snippets": ["雨が降ったら行かない", "春になると花が咲く"],
                        "severity": "major",
                    }
                ],
            ]
            return {"clusters": random.choice(mistake_clusters)}

        if response_model.__name__ == "LearningRecommendationResult":
            recommendations_pool = [
                {
                    "strategy": "targeted",
                    "planned_exercise": {
                        "exercise_type": "sentence_translation",
                        "topic": "Một ngày làm việc bận rộn",
                        "register": "polite",
                        "jlpt_level": "N4",
                        "difficulty": 5,
                        "target_length": "sentence",
                        "focus_skills": ["grammar", "naturalness"],
                    },
                    "reason": "Luyện tập phân biệt trợ từ は và が khi kể về các hoạt động trong công việc.",
                },
                {
                    "strategy": "targeted",
                    "planned_exercise": {
                        "exercise_type": "sentence_translation",
                        "topic": "Hỏi đường và di chuyển tại ga tàu Tokyo",
                        "register": "polite",
                        "jlpt_level": "N4",
                        "difficulty": 4,
                        "target_length": "sentence",
                        "focus_skills": ["grammar", "vocabulary"],
                    },
                    "reason": "Củng cố cách dùng trợ từ に và で khi xác định vị trí và phương tiện di chuyển.",
                },
                {
                    "strategy": "reinforcement",
                    "planned_exercise": {
                        "exercise_type": "multi_sentence_translation",
                        "topic": "Kế hoạch đi dã ngoại cuối tuần cùng bạn bè",
                        "register": "casual",
                        "jlpt_level": "N3",
                        "difficulty": 6,
                        "target_length": "multi_sentence",
                        "focus_skills": ["grammar", "context_fit"],
                    },
                    "reason": "Luyện cấu trúc câu điều kiện たら / ば và thể ý định (〜よう) trong giao tiếp hàng ngày.",
                },
                {
                    "strategy": "targeted",
                    "planned_exercise": {
                        "exercise_type": "paragraph_translation",
                        "topic": "Gửi email báo cáo tiến độ dự án cho đối tác",
                        "register": "business",
                        "jlpt_level": "N2",
                        "difficulty": 7,
                        "target_length": "paragraph",
                        "focus_skills": ["register_fit", "naturalness"],
                    },
                    "reason": "Nâng cao kỹ năng viết kính ngữ thương mại chuẩn mực (Sonkeigo & Kenjougo).",
                },
                {
                    "strategy": "exploration",
                    "planned_exercise": {
                        "exercise_type": "free_writing",
                        "topic": "Trải nghiệm ẩm thực và món ăn yêu thích",
                        "register": "polite",
                        "jlpt_level": "N3",
                        "difficulty": 5,
                        "target_length": "paragraph",
                        "focus_skills": ["vocabulary", "naturalness"],
                    },
                    "reason": "Mở rộng vốn từ miêu tả cảm giác, hương vị và dùng thể ている/てある diễn đạt trạng thái.",
                },
                {
                    "strategy": "targeted",
                    "planned_exercise": {
                        "exercise_type": "sentence_translation",
                        "topic": "Xin phép quản lý về sớm hoặc nghỉ ốm",
                        "register": "business",
                        "jlpt_level": "N3",
                        "difficulty": 6,
                        "target_length": "sentence",
                        "focus_skills": ["grammar", "register_fit"],
                    },
                    "reason": "Luyện thể sai khiến kết hợp xin phép (〜させていただけませんか) trang trọng trong công sở.",
                },
            ]
            return random.choice(recommendations_pool)

        if response_model.__name__ == "RecommendationExplanationResult":
            explanations = [
                "Bài tập này được AI đề xuất dựa trên những điểm bạn vừa luyện tập để giúp củng cố phản xạ tự nhiên nhất.",
                "Hệ thống nhận thấy bạn đang tiến bộ rất nhanh, luyện thêm bài này sẽ giúp bạn làm chủ ngữ pháp then chốt!",
                "Đây là dạng bài thực tế rất hay gặp trong giao tiếp hàng ngày và công việc, chúc bạn hoàn thành xuất sắc!",
            ]
            return {"explanation": random.choice(explanations)}
        if response_model.__name__ == "GoalInterpretationResult":
            return self._fake_goal_interpretation(prompt)
        if response_model.__name__ == "CurriculumPlanningResult":
            return self._fake_curriculum_plan(prompt)
        if response_model.__name__ == "CurriculumReplanningResult":
            return {
                "objective_changes": [],
                "rationale_vi": (
                    "Không có thay đổi cần thiết; lộ trình hiện tại vẫn phù hợp "
                    "với tiến độ gần đây của bạn."
                ),
            }
        if response_model.__name__ == "ObjectiveProgressAnalysisResult":
            return {
                "summary_vi": (
                    "Bạn đang luyện mục tiêu này đều đặn; điểm số gần đây ổn định "
                    "và bạn đã có một số bài đạt mức khá."
                ),
                "recommended_focus_vi": (
                    "Hãy tiếp tục luyện thêm 2-3 bài và chú ý phản hồi về độ tự "
                    "nhiên để hoàn thành mục tiêu."
                ),
            }
        if response_model.__name__ == "ProductAnalysisResult":
            return {
                "insights": [
                    {
                        "area": "scenario_generation",
                        "priority": "medium",
                        "finding": (
                            "Business email scenarios show high completion and "
                            "strong register improvement in the observed window."
                        ),
                        "recommended_action": (
                            "keep business email exposure stable and monitor "
                            "register improvement next window."
                        ),
                        "evidence": [
                            "feature.scenario.business_email.usefulness",
                            "outcome.register_fit.30d.delta",
                        ],
                        "confidence": "medium",
                        "inference_type": "observation",
                    },
                    {
                        "area": "provider_routing",
                        "priority": "low",
                        "finding": (
                            "Gemini shows the highest quality pass rate for "
                            "writing evaluation over the observed window."
                        ),
                        "recommended_action": (
                            "keep current evaluation provider and re-check after "
                            "more evidence accumulates."
                        ),
                        "evidence": ["provider.writing_evaluation.30d.quality_pass_rate"],
                        "confidence": "low",
                        "inference_type": "comparison",
                    },
                ]
            }

        if response_model.__name__ == "WritingDiagnosisResult":
            return {
                "overall_assessment_vi": (
                    "Bạn có khả năng diễn đạt ý tưởng cơ bản rõ ràng, cấu trúc câu đơn mạch lạc. "
                    "Tuy nhiên, khi ghép các câu phức hoặc biểu đạt văn phong trang trọng, bạn còn gặp "
                    "khó khăn ở trợ từ và liên từ kết nối vế câu."
                ),
                "strengths_assessment_vi": (
                    "Vốn từ vựng N4-N3 phong phú, phản xạ chia thể động từ chuẩn xác và tư duy lập luận rõ ràng."
                ),
                "root_causes": [
                    {
                        "category": "grammar",
                        "subtype": "particles",
                        "root_cause_vi": "Ảnh hưởng từ thói quen tư duy tiếng Việt (chủ ngữ là... -> dịch sang は) thay vì xác định trợ từ theo tính từ/động từ tiếng Nhật.",
                        "japanese_pattern_tip": "Với tính từ chỉ cảm xúc/sở thích (好き, 嫌い, 上手, 欲しい), đối tượng luôn đi với trợ từ が.",
                        "example_bad_vs_good": "❌ 猫は好きです -> ⭕ 猫が好きです",
                    },
                    {
                        "category": "naturalness",
                        "subtype": "literal_translation",
                        "root_cause_vi": "Xu hướng dịch nguyên văn trật tự từ tiếng Việt khiến câu văn dài dòng và gượng gạo.",
                        "japanese_pattern_tip": "Lược bỏ đại từ nhân xưng 'tôi' (私) khi ngữ cảnh đã rõ ràng để câu văn tự nhiên chuẩn Nhật.",
                        "example_bad_vs_good": "❌ 私は頭が痛い -> ⭕ 頭が痛い",
                    },
                    {
                        "category": "register",
                        "subtype": "casual_polite_mismatch",
                        "root_cause_vi": "Chưa phân tách rõ ràng ranh giới giữa văn phong thân mật (Da/Dearu) và lịch sự (Desu/Masu) trong cùng một đoạn văn.",
                        "japanese_pattern_tip": "Giữ nhất quán đuôi câu trong toàn bài, ở mệnh đề phụ dùng thể ngắn (thể thông thường).",
                        "example_bad_vs_good": "❌ 忙しいですから、行きません -> ⭕ 忙しいので、行きません",
                    },
                ],
                "action_plan_vi": [
                    "Luyện tập phân biệt trợ từ は và が trong các mẫu câu biểu thị cảm xúc và năng lực.",
                    "Luyện viết câu ngắn súc tích trước khi chuyển sang ghép các câu phức dài.",
                    "Đọc lại toàn bài trước khi nộp để kiểm tra tính nhất quán của đuôi câu (Desu/Masu vs Da/Dearu).",
                ],
                "recommended_grammar_focus": [
                    "Trợ từ は vs が chuyên sâu",
                    "Liên từ chỉ nguyên nhân (ので vs から)",
                    "Thể thông thường trong mệnh đề phụ",
                ],
                "encouragement_vi": "Bạn đang tiến bộ rất nhanh! Hãy kiên trì luyện tập mỗi ngày để câu văn tiếng Nhật ngày càng tự nhiên và chuẩn xác nhé.",
                "estimated_writing_level": "N4-N3",
            }
        if response_model.__name__ == "OptimizationRecommendationResult":
            return {
                "area": "exercise_difficulty",
                "priority": "high",
                "finding": (
                    "Difficulty 9 exercises show high failure and low completion "
                    "among N3 learners in the observed window."
                ),
                "recommended_action": (
                    "reduce difficulty of N3 exercises above level 8 and monitor "
                    "completion next window."
                ),
                "evidence": ["difficulty.N3.9.avg_score", "difficulty.N3.9.completion_rate"],
                "confidence": "medium",
                "inference_type": "observation",
            }
        if response_model.__name__ == "ExperimentAnalysisResult":
            return {
                "winner": "variant",
                "comparison": [
                    {
                        "metric": "challenge_completion_rate",
                        "control_value": 0.61,
                        "variant_value": 0.72,
                        "delta": 0.11,
                    }
                ],
                "summary_vi": (
                    "Người học ở nhóm biến thể hoàn thành thử thách nhiều hơn "
                    "nhóm đối chứng trong cửa sổ quan sát."
                ),
                "recommended_action": (
                    "monitor variant completion for one more window before promoting the change."
                ),
                "evidence": ["experiment.challenge_wording.completion_rate"],
                "confidence": "medium",
                "inference_type": "comparison",
            }
        if response_model.__name__ == "DailyMissionResult":
            daily_missions_pool = [
                {
                    "mission_type": "weakness_focus",
                    "title": "Luyện trợ từ は/が",
                    "description": "Hôm nay hãy hoàn thành các bài viết tập trung vào cách dùng trợ từ は và が trong câu.",
                    "target_count": 3,
                    "focus_skills": ["grammar", "naturalness"],
                    "topic": "Một ngày làm việc bận rộn",
                    "register": "polite",
                    "difficulty": 5,
                    "reason": "Giúp bạn phân biệt chủ đề và chủ ngữ rõ ràng hơn trong các câu phức.",
                },
                {
                    "mission_type": "skill_challenge",
                    "title": "Làm chủ trợ từ chỉ nơi chốn に/で",
                    "description": "Thực hành 3 bài viết sử dụng chuẩn xác trợ từ chỉ địa điểm tồn tại và hành động.",
                    "target_count": 3,
                    "focus_skills": ["grammar", "vocabulary"],
                    "topic": "Giao thông và mua sắm tại Nhật",
                    "register": "polite",
                    "difficulty": 4,
                    "reason": "Củng cố nền tảng ngữ pháp N4-N5 về phương hướng và không gian.",
                },
                {
                    "mission_type": "grammar_mastery",
                    "title": "Chinh phục câu điều kiện たら/ば/なら",
                    "description": "Viết 3 câu phức diễn đạt giả định, lời khuyên hoặc điều kiện tự nhiên.",
                    "target_count": 3,
                    "focus_skills": ["grammar", "context_fit"],
                    "topic": "Kế hoạch và dự định tương lai",
                    "register": "casual",
                    "difficulty": 6,
                    "reason": "Giúp văn phong tiếng Nhật linh hoạt và lưu loát như người bản xứ.",
                },
                {
                    "mission_type": "business_writing",
                    "title": "Kính ngữ thương mại (Sonkeigo & Kenjougo)",
                    "description": "Thực hành viết 3 câu giao tiếp hoặc email lịch sự với đối tác và khách hàng.",
                    "target_count": 3,
                    "focus_skills": ["register_fit", "naturalness"],
                    "topic": "Email và hội thoại công sở",
                    "register": "business",
                    "difficulty": 7,
                    "reason": "Nâng cao phong thái viết tiếng Nhật chuyên nghiệp chuẩn N2.",
                },
                {
                    "mission_type": "storytelling",
                    "title": "Thực hành thể bị động và sai khiến",
                    "description": "Hoàn thành 3 bài viết miêu tả các trải nghiệm cá nhân dùng thể 受け身 và 使役.",
                    "target_count": 3,
                    "focus_skills": ["grammar", "naturalness"],
                    "topic": "Trải nghiệm và sự cố thường ngày",
                    "register": "polite",
                    "difficulty": 6,
                    "reason": "Giúp biểu đạt cảm xúc và góc nhìn tự nhiên theo tư duy tiếng Nhật.",
                },
                {
                    "mission_type": "exploration",
                    "title": "Mô tả trạng thái ている & てある",
                    "description": "Viết 3 đoạn văn ngắn miêu tả khung cảnh, phòng ốc và thói quen hàng ngày.",
                    "target_count": 3,
                    "focus_skills": ["vocabulary", "naturalness"],
                    "topic": "Không gian sống và thói quen cá nhân",
                    "register": "polite",
                    "difficulty": 5,
                    "reason": "Phân biệt tự nhiên giữa kết quả có chủ ý và trạng thái diễn ra liên tục.",
                },
            ]
            return random.choice(daily_missions_pool)
        if response_model.__name__ == "ChallengeGenerationResult":
            return {
                "type": "naturalness",
                "instruction_vi": "Hãy viết lại câu này theo cách người Nhật thường nói hơn.",
                "source_text": "今日はとても忙しいです。",
                "target_skill": "naturalness",
                "difficulty": 5,
                "objective": "Câu viết lại tự nhiên, giữ nguyên ý nghĩa.",
                "required_expression": None,
            }
        if response_model.__name__ == "ProgressSummaryResult":
            return {
                "summary": (
                    "Hôm nay bạn làm các bài viết khá đều tay. Phần ngữ pháp "
                    "vẫn ổn, và độ tự nhiên đang tiến bộ rõ trong ngữ cảnh công việc."
                ),
                "improved": ["naturalness"],
                "needs_work": ["register_fit"],
                "vocabulary_discovered": 2,
            }
        if response_model.__name__ == "MilestoneCelebrationResult":
            return {
                "message": (
                    "🎉 Mốc đáng nhớ! Số bài bạn đã hoàn thành vừa chạm mốc mới. "
                    "Độ tự nhiên của bạn đang đi lên đều đặn - tiếp tục nhé!"
                )
            }
        if response_model.__name__ == "EncouragementResult":
            return {
                "message": (
                    "Lần này bạn giữ được meaning gần như hoàn toàn, và naturalness "
                    "đã tăng so với lần trước. Cứ đà này nhé!"
                )
            }
        if response_model.__name__ == "DiscourseSegmentationResult":
            return {
                "sentences": [
                    "今日は仕事がとても忙しかったです。",
                    "だから、帰りが遅くなりました。",
                ],
                "boundaries": [0, 16],
            }
        if response_model.__name__ == "DiscourseAnalysisResult":
            return {
                "coherence_score": 90,
                "coherence_classification": "excellent",
                "topic_consistency_classification": "consistent",
                "cohesion_score": 85,
                "flow_score": 85,
                "organization_score": 85,
                "redundancy_score": 88,
                "structure_reorder_advice": None,
                "issues": [],
            }
        if response_model.__name__ == "StyleConsistencyResult":
            return {
                "style_consistency_score": 90,
                "register_fit_score": 90,
                "register_notes": None,
                "issues": [],
            }
        if response_model.__name__ == "WritingScaffoldResponse":
            return {
                "outline_steps": [
                    "1. Mở bài: Giới thiệu chủ đề và bối cảnh chính.",
                    "2. Thân bài: Trình bày chi tiết các luận điểm hoặc trải nghiệm.",
                    "3. Kết bài: Tổng kết cảm nhận, bài học hoặc hướng đi tiếp theo.",
                ],
                "idea_angles": [
                    {
                        "title": "Góc nhìn Trải nghiệm",
                        "description": "Kể lại trải nghiệm thực tế và cảm xúc chân thật.",
                        "starter": "私の経験から申し上げますと、",
                    },
                    {
                        "title": "Góc nhìn Khách quan",
                        "description": "Phân tích ưu nhược điểm từ góc độ logic.",
                        "starter": "客観的な視点から見ると、",
                    },
                    {
                        "title": "Góc nhìn Tương lai",
                        "description": "Đề xuất giải pháp và mục tiêu phát triển.",
                        "starter": "今後の展望として、",
                    },
                ],
                "golden_phrases": [
                    {
                        "japanese": "その結果、",
                        "reading": "そのけっか、",
                        "meaning": "Kết quả là...",
                        "type": "connector",
                    },
                    {
                        "japanese": "〜だけでなく、",
                        "reading": None,
                        "meaning": "Không chỉ... mà còn...",
                        "type": "connector",
                    },
                    {
                        "japanese": "〜と考えております",
                        "reading": "〜とかんがえております",
                        "meaning": "Tôi cho rằng / Tôi nghĩ là...",
                        "type": "expression",
                    },
                    {
                        "japanese": "具体的には、",
                        "reading": "ぐたいてきには、",
                        "meaning": "Cụ thể là...",
                        "type": "starter",
                    },
                    {
                        "japanese": "お手数をおかけしますが、",
                        "reading": "おてすうをおかけしますが、",
                        "meaning": "Phiền bạn một chút nhưng...",
                        "type": "expression",
                    },
                ],
            }
        if response_model.__name__ == "StructureSuggestionResult":
            return {
                "reorder_advice": None,
                "template": None,
                "template_reason": None,
            }
        if response_model.__name__ == "DiscourseSynthesisResult":
            return {
                "strengths": [
                    "Câu văn truyền đạt đúng ý chính, dùng từ tự nhiên.",
                    "Đoạn văn có mở đầu và kết thúc rõ ràng.",
                ],
                "summary": (
                    "Bài viết của bạn mạch lạc và đúng trọng tâm. Tiếp tục chú ý "
                    "nối các câu tự nhiên hơn."
                ),
                "improved_structure": None,
                "rewrites": {
                    "minimal_fix": (
                        "今日は仕事がとても忙しかったです。それで、帰りが遅くなりました。"
                    ),
                    "natural_rewrite": (
                        "今日は仕事が立て込んでいて、帰りが遅くなってしまいました。"
                    ),
                    "native_rewrite": (
                        "今日は仕事が立て込んでいて、結局遅くまで残業することになりました。"
                    ),
                },
            }
        if response_model.__name__ == "WritingScenarioPlan":
            return {
                "genre": "business_email",
                "medium": "email",
                "audience": "manager",
                "relationship": "professional",
                "purpose": "report",
                "register": "business",
                "tone": "professional",
                "jlpt_level": "N3",
                "target_length": "paragraph",
                "difficulty": 5,
                "topic": "Báo cáo tiến độ dự án đang bị trễ",
            }
        if response_model.__name__ == "WritingScenarioDraft":
            return {
                "situation_vi": (
                    "Bạn là nhân viên trong công ty Nhật Bản. Dự án bạn phụ trách "
                    "đang bị trễ tiến độ và sếp yêu cầu bạn gửi email báo cáo tình hình."
                ),
                "context_vi": (
                    "Viết email báo cáo tiến độ dự án cho trưởng bộ phận bằng tiếng "
                    "Nhật. Nêu rõ tiến độ hiện tại, lý do trễ và kế hoạch xử lý."
                ),
                "required_points": [
                    {
                        "id": "rp1",
                        "description": "Chào hỏi và nêu mục đích email báo cáo tiến độ.",
                    },
                    {
                        "id": "rp2",
                        "description": "Mô tả tiến độ hiện tại và lý do dự án bị trễ.",
                    },
                    {
                        "id": "rp3",
                        "description": "Đề xuất kế hoạch và thời hạn hoàn thành mới.",
                    },
                ],
                "optional_points": ["Xin lỗi vì sự chậm trễ"],
                "forbidden_patterns": ["Dùng ngôn ngữ suồng sã, thiếu kính ngữ"],
                "difficulty_metadata": {
                    "sub_grammar": 5,
                    "sub_vocabulary": 5,
                    "sub_context": 5,
                    "sub_naturalness": 5,
                },
                "grammar_complexity": 5,
                "vocabulary_complexity": 5,
                "context_complexity": 5,
                "naturalness_target": 5,
            }
        if response_model.__name__ == "WritingScenarioValidationResult":
            return {
                "valid": True,
                "issues": [],
                "suggestion": None,
            }
        if response_model.__name__ == "ScenarioEvaluationResult":
            return {
                "scenario_semantic_fit": 90,
                "audience_fit": 90,
                "purpose_fit": 88,
                "tone_fit": 90,
                "constraint_compliance": 85,
                "required_points": [
                    {
                        "id": "rp1",
                        "description": "Chào hỏi và nêu mục đích email báo cáo tiến độ.",
                        "status": "satisfied",
                        "explanation": "Email có lời chào và nêu rõ mục đích báo cáo.",
                    },
                    {
                        "id": "rp2",
                        "description": "Mô tả tiến độ hiện tại và lý do dự án bị trễ.",
                        "status": "partially_satisfied",
                        "explanation": "Có nêu tiến độ nhưng chưa giải thích rõ lý do trễ.",
                    },
                    {
                        "id": "rp3",
                        "description": "Đề xuất kế hoạch và thời hạn hoàn thành mới.",
                        "status": "satisfied",
                        "explanation": "Đã đề xuất kế hoạch và thời hạn mới.",
                    },
                ],
                "format_sections": [
                    {
                        "name": "greeting",
                        "status": "present",
                        "note": "Mở đầu bằng lời chào phù hợp.",
                    },
                    {
                        "name": "body",
                        "status": "partial",
                        "note": "Phần thân còn thiếu lý do trễ.",
                    },
                    {
                        "name": "closing",
                        "status": "present",
                        "note": "Có lời chào kết thúc.",
                    },
                ],
                "strengths": [
                    "Bố cục email rõ ràng, đúng thứ tự báo cáo.",
                    "Đã dùng kính ngữ khá phù hợp với người nhận.",
                ],
                "summary": (
                    "Email đã đạt yêu cầu về bố cục và kính ngữ. Cần bổ sung rõ "
                    "lý do trễ tiến độ và cụ thể hóa kế hoạch hoàn thành."
                ),
            }
        if response_model.__name__ == "DiscourseCoachResult":
            return {
                "answer": (
                    "Bạn đã truyền đạt đúng ý chính. Để đoạn văn mạch lạc hơn, "
                    "thử nối câu 1 và câu 2 bằng それで hoặc だから khi có quan hệ "
                    "nguyên nhân - kết quả."
                ),
                "suggestions": [
                    "Làm sao để câu văn tự nhiên hơn?",
                    "Cách dùng そのため khác gì だから?",
                ],
            }
        if response_model.__name__ == "RevisionGuidanceResult":
            return {
                "summary": "Bản sửa đã nối các câu mượt hơn và giữ nguyên ý nghĩa.",
                "per_dimension_notes": {"cohesion": "Liên kết câu đã tốt hơn rõ rệt."},
            }
        if response_model.__name__ == "SimulationPlanResult":
            return {
                "objective_vi": (
                    "Đạt được thỏa thuận về thời hạn bàn giao mới với đối tác, giữ mối quan hệ tốt."
                ),
                "stages": [
                    {"name": "greeting", "goal": "Chào hỏi và nêu mục đích cuộc trao đổi."},
                    {
                        "name": "clarify",
                        "goal": "Làm rõ yêu cầu và giới hạn thời hạn của đối tác.",
                    },
                    {
                        "name": "negotiate",
                        "goal": "Đề xuất phương án và đàm phán thời hạn mới.",
                    },
                    {"name": "closing", "goal": "Chốt thỏa thuận và cảm ơn đối tác."},
                ],
                "persona": {
                    "name": "佐藤",
                    "role": "đối tác khách hàng",
                    "personality_vi": "Lịch sự, cẩn thận, đúng giờ.",
                },
                "pressure_condition": "time_pressure",
                "difficulty": {
                    "language_complexity": 5,
                    "context_complexity": 5,
                    "social_complexity": 5,
                    "negotiation_complexity": 6,
                    "ambiguity": 4,
                    "time_pressure": 6,
                },
            }
        if response_model.__name__ == "SimulationTurnGenerationResult":
            return {
                "message_ja": (
                    "承知しました。ただ、来週の水曜日までに納品するのは難しいのですが、"
                    "再来週の月曜日ではいかがでしょうか。"
                ),
                "tone": "polite",
            }
        if response_model.__name__ == "SimulationTurnEvaluationResult":
            return {
                "goal_progress": 70,
                "communication_effectiveness": 80,
                "strengths": ["Đã nêu được đề xuất thời hạn mới cụ thể."],
                "issues": [
                    {
                        "category": "naturalness",
                        "severity": "minor",
                        "explanation": "Cụm 納品するのは難しい còn hơi trang trọng cho hội thoại.",
                        "suggested_fix": "Thử dùng 納品が難しいんですが.",
                    }
                ],
                "feedback_vi": (
                    "Bạn đã đưa ra đề xuất thời hạn rõ ràng. Chú ý cách nói tự nhiên hơn."
                ),
            }
        if response_model.__name__ == "SimulationStateUpdateResult":
            return {
                "unresolved_items": ["thời hạn mới", "phương án vận chuyển"],
                "completed_items": ["chào hỏi", "nêu mục đích"],
                "facts": ["Đối tác cần nhận hàng trong tuần tới."],
                "decisions": ["Đề xuất bàn giao vào thứ hai tuần sau."],
                "participant_positions": {"partner": "muốn nhận trong tuần tới"},
                "emotional_context": "thân thiện, hợp tác",
                "next_goal": "Chốt thời hạn bàn giao mới.",
            }
        if response_model.__name__ == "SimulationContextSummaryResult":
            return {
                "unresolved_items": ["thời hạn mới"],
                "decisions": ["Đề xuất bàn giao vào thứ hai tuần sau."],
                "facts": ["Đối tác cần nhận hàng trong tuần tới."],
                "participant_positions": {"partner": "muốn nhận trong tuần tới"},
                "emotional_context": "thân thiện, hợp tác",
                "summary_note": (
                    "Hai bên đang đàm phán thời hạn bàn giao; đối tác cần hàng trong "
                    "tuần tới, bên mình đề xuất thứ hai tuần sau."
                ),
            }
        if response_model.__name__ == "SimulationSummaryResult":
            return {
                "summary_vi": (
                    "Bạn đã dẫn dắt cuộc trao đổi rõ ràng, đạt được thỏa thuận về "
                    "thời hạn bàn giao mới và giữ được mối quan hệ tốt với đối tác."
                ),
                "strengths": ["Đề xuất phương án cụ thể", "Giữ thái độ lịch sự"],
                "needs_work": ["Cách diễn đạt tự nhiên hơn khi từ chối"],
            }
        if response_model.__name__ == "SimulationCoachResult":
            return {
                "answer": (
                    "Ở tình huống này bạn có thể dùng 難しいんですが để từ chối nhẹ "
                    "nhàng trước khi đưa ra phương án thay thế."
                ),
                "suggestions": [
                    "Làm sao để đàm phán thời hạn tự nhiên hơn?",
                    "Khi nào nên dùng ～ていただけませんか?",
                ],
            }
        if response_model.__name__ == "MemoryExtractionResult":
            return {
                "candidate_memories": [
                    {
                        "category": "learning_pattern",
                        "type": "pattern",
                        "content": (
                            "Người học thường đặt tính từ trước danh từ đúng nhưng "
                            "hay quên trợ từ の trong cụm danh từ."
                        ),
                        "confidence": "medium",
                        "importance": 6,
                        "evidence": [{"source_type": "evaluation", "source_id": "attempt-sample"}],
                    }
                ]
            }
        if response_model.__name__ == "MemoryValidationResult":
            return {
                "action": "accept",
                "matched_memory_id": None,
                "reason": "Ghi nhớ mới có bằng chứng rõ ràng và chưa trùng với ghi nhớ cũ.",
                "adjusted_confidence": None,
                "adjusted_importance": None,
            }
        if response_model.__name__ == "MemoryConflictResult":
            return {
                "verdict": "contextual",
                "winning_memory_id": None,
                "resolution_note": "Hai ghi nhớ đúng trong hai ngữ cảnh khác nhau.",
            }
        return None

    # -- curriculum pipeline samples (Phase 13) -------------------------------

    def _fake_goal_interpretation(self, prompt: str) -> dict[str, Any]:
        """Map the goal statement to a supported goal type (keyword match)."""
        statement = self._extract_section(prompt, "Learner's goal statement:", "\nLearner profile")
        lowered = statement.lower()
        keywords = [
            ("brse", "brse"),
            ("it", "it"),
            ("jlpt", "jlpt"),
            ("n1", "jlpt"),
            ("n2", "jlpt"),
            ("n3", "jlpt"),
            ("n4", "jlpt"),
            ("n5", "jlpt"),
            ("cong viec", "business"),
            ("công việc", "business"),
            ("van phong", "business"),
            ("văn phòng", "business"),
            ("lanh su", "business"),
            ("lãnh sự", "business"),
            ("lanh dao", "business"),
            ("lãnh đạo", "business"),
            ("tinh than", "business"),
            ("tinh thần", "business"),
            ("tu nhien", "natural_japanese"),
            ("tự nhiên", "natural_japanese"),
            ("hoi thoai", "daily_conversation"),
            ("hội thoại", "daily_conversation"),
            ("tro chuyen", "daily_conversation"),
            ("trò chuyện", "daily_conversation"),
            ("nguoi nhat", "natural_japanese"),
            ("người nhật", "natural_japanese"),
            ("luu loat", "writing_fluency"),
            ("lưu loát", "writing_fluency"),
            ("viet nhieu", "writing_fluency"),
            ("viết nhiều", "writing_fluency"),
            ("ky nang viet", "writing_fluency"),
            ("kỹ năng viết", "writing_fluency"),
        ]
        goal_type = "general"
        for keyword, mapped in keywords:
            if keyword in lowered:
                goal_type = mapped
                break
        from app.domain.curriculum_taxonomy import (
            GOAL_LABELS_VI,
            competencies_for_goal,
        )

        competencies = competencies_for_goal(goal_type)[:6]
        label = GOAL_LABELS_VI.get(goal_type, goal_type)
        return {
            "goal_type": goal_type,
            "suggested_goal": f"Lộ trình {label}",
            "focus_competencies": competencies,
            "rationale_vi": (
                f"Câu mô tả của bạn phù hợp với mục tiêu {label}; lộ trình sẽ "
                "xây dựng các năng lực cần thiết theo thứ tự ưu tiên."
            ),
        }

    def _fake_curriculum_plan(self, prompt: str) -> dict[str, Any]:
        """Build a deterministic plan covering every focus competency."""
        from app.domain.curriculum_taxonomy import (
            COMPETENCY_LABELS_VI,
            COMPETENCY_TO_MODES,
        )

        goal_type = self._extract_section(prompt, "Goal type: ", "\nGoal statement:").strip()
        competencies_raw = self._extract_section(
            prompt, "Focus competencies (ordered by importance): ", "\n\nLearner profile"
        )
        competencies = [item.strip() for item in competencies_raw.split(",") if item.strip()]
        if not competencies or goal_type not in {
            "general",
            "daily_conversation",
            "business",
            "it",
            "brse",
            "jlpt",
            "natural_japanese",
            "writing_fluency",
        }:
            from app.domain.curriculum_taxonomy import competencies_for_goal

            goal_type = goal_type if goal_type else "general"
            competencies = competencies_for_goal(goal_type)[:6]

        objectives: list[dict[str, Any]] = []
        for competency in competencies:
            label = COMPETENCY_LABELS_VI.get(competency, competency)
            modes = COMPETENCY_TO_MODES.get(competency, ["sentence_translation"])[:2]
            objectives.append(
                {
                    "title": f"Luyện {label}",
                    "description": (
                        f"Rèn luyện năng lực {label} qua các bài tập phù hợp để "
                        "viết chính xác và tự nhiên hơn."
                    ),
                    "target_competencies": [competency],
                    "exercise_modes": modes,
                    "target_level": "N4",
                    "priority": 3,
                    "success_criteria": {},
                }
            )

        from app.domain.curriculum_taxonomy import competencies_for_goal

        if len(competencies) < 4:
            for extra in competencies_for_goal(goal_type):
                if len(competencies) >= 4:
                    break
                if extra not in competencies:
                    competencies.append(extra)
                    label = COMPETENCY_LABELS_VI.get(extra, extra)
                    modes = COMPETENCY_TO_MODES.get(extra, ["sentence_translation"])[:2]
                    objectives.append(
                        {
                            "title": f"Luyện {label}",
                            "description": (
                                f"Rèn luyện năng lực {label} qua các bài tập phù hợp để "
                                "viết chính xác và tự nhiên hơn."
                            ),
                            "target_competencies": [extra],
                            "exercise_modes": modes,
                            "target_level": "N4",
                            "priority": 3,
                            "success_criteria": {},
                        }
                    )

        group_size = 4
        chunks = [
            competencies[index : index + group_size]
            for index in range(0, len(competencies), group_size)
        ]
        if len(chunks) == 1:
            mid = max(1, len(competencies) // 2)
            chunks = [competencies[:mid], competencies[mid:]]
        milestones: list[dict[str, Any]] = []
        for index, chunk in enumerate(chunks, start=1):
            labels = " - ".join(COMPETENCY_LABELS_VI.get(c, c) for c in chunk)
            milestones.append(
                {
                    "title": f"Giai đoạn {index}: {labels}",
                    "description": ("Giai đoạn tập trung vào: " + labels + "."),
                }
            )

        return {
            "title": f"Lộ trình học tiếng Nhật ({goal_type})",
            "overview_vi": (
                "Lộ trình được chia thành các giai đoạn, mỗi giai đoạn tập trung "
                "vào một nhóm năng lực, tiến dần từ nền tảng đến các tình huống "
                "giao tiếp phức tạp hơn."
            ),
            "milestones": milestones,
            "objectives": objectives,
        }

    @staticmethod
    def _extract_section(prompt: str, start: str, end: str) -> str:
        start_index = prompt.find(start)
        if start_index < 0:
            return ""
        content = prompt[start_index + len(start) :]
        end_index = content.find(end)
        if end_index >= 0:
            content = content[:end_index]
        return content

    async def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        model: str | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[AIStreamChunk]:
        self._fail()
        words = self._seed_text.split(" ")
        for index, word in enumerate(words):
            yield AIStreamChunk(
                text=word + " ",
                provider=self.name,
                model=model or self._model,
                is_final=index == len(words) - 1,
                usage=self._usage(prompt, self._seed_text) if index == len(words) - 1 else None,
            )
