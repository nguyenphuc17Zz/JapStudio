"""Test-only fake provider whose structured outputs are scripted per model.

Keeps the Phase 2 gateway untouched while allowing full-pipeline tests of
the exercise generation service (planner -> generator -> validator).
"""

from typing import Any

from app.models import ExerciseType, JlptLevel, Register, TargetLength
from app.providers.ai.base import AIGenerationResult
from app.providers.ai.errors import AIError, AIResponseError
from app.providers.ai.fake import FakeAIProvider
from app.schemas.discourse_ai import (
    DiscourseAnalysisResult,
    DiscourseCoachResult,
    DiscourseSegmentationResult,
    DiscourseSynthesisResult,
    RevisionGuidanceResult,
    StructureSuggestionResult,
    StyleConsistencyResult,
)
from app.schemas.evaluation_ai import (
    CorrectionResult,
    GrammarVocabularyEvaluation,
    HintResult,
    NaturalnessRegisterEvaluation,
    SemanticEvaluation,
)
from app.schemas.exercise_ai import (
    ExerciseDraft,
    ExercisePlan,
    ExerciseValidationResult,
)
from app.schemas.gamification_ai import (
    ChallengeGenerationResult,
    DailyMissionResult,
    EncouragementResult,
    MilestoneCelebrationResult,
    ProgressSummaryResult,
)
from app.schemas.learning_ai import (
    CurriculumPlanningResult,
    CurriculumReplanningResult,
    GoalInterpretationResult,
    LearnerProfileSynthesisResult,
    LearningRecommendationResult,
    MistakeClusteringResult,
    ObjectiveProgressAnalysisResult,
    RecommendationExplanationResult,
)
from app.schemas.simulation_ai import (
    SimulationCoachResult,
    SimulationContextSummaryResult,
    SimulationPlanResult,
    SimulationStateUpdateResult,
    SimulationSummaryResult,
    SimulationTurnEvaluationResult,
    SimulationTurnGenerationResult,
)
from app.schemas.vocabulary_ai import (
    VocabularyExplanationResult,
    VocabularyExtractionResult,
    VocabularyValidationResult,
)
from app.schemas.writing_scenario import (
    ScenarioEvaluationResult,
    WritingScenarioDraft,
    WritingScenarioPlan,
    WritingScenarioValidationResult,
)
from app.schemas.rewrite_lab_ai import (
    DiffChunkResult,
    DiffExplanationResult,
    IssueDetectionResult,
    RewriteModeResult,
    RewriteVariantsResult,
    SelfCorrectionAttemptResult,
    SocraticCoachResult,
    TransferEvaluationResult,
    TransferTaskResult,
)
from app.schemas.real_world_mission import (
    Mission10Dimensions,
    MissionDimensionScore,
    MissionRequiredPoint,
    MissionRequiredPointCheck,
    VocabularyHelperItem,
)
from app.schemas.real_world_mission_ai import (
    MissionEvaluationAIResult,
    RealWorldMissionAIDraft,
)
from pydantic import BaseModel


def default_plan() -> ExercisePlan:
    return ExercisePlan(
        exercise_type=ExerciseType.SENTENCE_TRANSLATION,
        topic="Work",
        subtopic="Overtime",
        register=Register.CASUAL,
        jlpt_level=JlptLevel.N3,
        difficulty=6,
        target_length=TargetLength.SENTENCE,
    )


def default_draft() -> ExerciseDraft:
    return ExerciseDraft(
        context="Một ngày làm việc khá bận rộn.",
        prompt_vi="Hôm nay nhiều việc quá nên chắc tui sẽ về muộn.",
        grammar_complexity=5,
        vocabulary_complexity=5,
        context_complexity=6,
        naturalness_target=7,
    )


def default_validation(valid: bool = True) -> ExerciseValidationResult:
    return ExerciseValidationResult(
        valid=valid,
        issues=[] if valid else ["prompt_vi chưa tự nhiên"],
    )


def default_scenario_plan() -> WritingScenarioPlan:
    return WritingScenarioPlan(
        genre="business_email",
        medium="email",
        audience="manager",
        relationship="professional",
        purpose="report",
        register="business",
        tone="professional",
        jlpt_level="N3",
        target_length="paragraph",
        difficulty=5,
        topic="Báo cáo tiến độ dự án đang bị trễ",
    )


def default_scenario_draft() -> WritingScenarioDraft:
    return WritingScenarioDraft(
        situation_vi=(
            "Bạn là nhân viên trong công ty Nhật Bản. Dự án bạn phụ trách "
            "đang bị trễ tiến độ và sếp yêu cầu bạn gửi email báo cáo tình hình."
        ),
        context_vi=(
            "Viết email báo cáo tiến độ dự án cho trưởng bộ phận bằng tiếng "
            "Nhật. Nêu rõ tiến độ hiện tại, lý do trễ và kế hoạch xử lý."
        ),
        required_points=[
            {"id": "rp1", "description": "Chào hỏi và nêu mục đích email báo cáo tiến độ."},
            {"id": "rp2", "description": "Mô tả tiến độ hiện tại và lý do dự án bị trễ."},
            {"id": "rp3", "description": "Đề xuất kế hoạch và thời hạn hoàn thành mới."},
        ],
        optional_points=["Xin lỗi vì sự chậm trễ"],
        forbidden_patterns=["Dùng ngôn ngữ suồng sã, thiếu kính ngữ"],
        difficulty_metadata={
            "sub_grammar": 5,
            "sub_vocabulary": 5,
            "sub_context": 5,
            "sub_naturalness": 5,
        },
        grammar_complexity=5,
        vocabulary_complexity=5,
        context_complexity=5,
        naturalness_target=5,
    )


def default_scenario_validation(valid: bool = True) -> WritingScenarioValidationResult:
    return WritingScenarioValidationResult(
        valid=valid,
        issues=[] if valid else ["situation_vi quá sơ sài"],
    )


def default_scenario_evaluation() -> ScenarioEvaluationResult:
    return ScenarioEvaluationResult(
        scenario_semantic_fit=90,
        audience_fit=90,
        purpose_fit=88,
        tone_fit=90,
        constraint_compliance=85,
        required_points=[
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
        format_sections=[
            {"name": "greeting", "status": "present", "note": "Mở đầu bằng lời chào phù hợp."},
            {
                "name": "body",
                "status": "partial",
                "note": "Phần thân còn thiếu lý do trễ.",
            },
            {"name": "closing", "status": "present", "note": "Có lời chào kết thúc."},
        ],
        strengths=["Bố cục email rõ ràng, đúng thứ tự báo cáo."],
        summary=(
            "Email đã đạt yêu cầu về bố cục và kính ngữ. Cần bổ sung rõ lý do "
            "trễ tiến độ và cụ thể hóa kế hoạch hoàn thành."
        ),
    )


def default_simulation_plan() -> SimulationPlanResult:
    return SimulationPlanResult(
        objective_vi="Đạt được thỏa thuận về thời hạn bàn giao mới với đối tác.",
        stages=[
            {"name": "greeting", "goal": "Chào hỏi và nêu mục đích cuộc trao đổi."},
            {"name": "clarify", "goal": "Làm rõ yêu cầu của đối tác."},
            {"name": "negotiate", "goal": "Đề xuất phương án và đàm phán thời hạn mới."},
            {"name": "closing", "goal": "Chốt thỏa thuận và cảm ơn đối tác."},
        ],
        persona={
            "name": "佐藤",
            "role": "đối tác khách hàng",
            "personality_vi": "Lịch sự, cẩn thận, đúng giờ.",
        },
        pressure_condition="time_pressure",
        difficulty={
            "language_complexity": 5,
            "context_complexity": 5,
            "social_complexity": 5,
            "negotiation_complexity": 6,
            "ambiguity": 4,
            "time_pressure": 6,
        },
    )


def default_simulation_turn_generation() -> SimulationTurnGenerationResult:
    return SimulationTurnGenerationResult(
        message_ja=(
            "承知しました。ただ、来週の水曜日までに納品するのは難しいのですが、"
            "再来週の月曜日ではいかがでしょうか。"
        ),
        tone="polite",
    )


def default_simulation_turn_evaluation() -> SimulationTurnEvaluationResult:
    return SimulationTurnEvaluationResult(
        goal_progress=70,
        communication_effectiveness=80,
        strengths=["Đã nêu được đề xuất thời hạn mới cụ thể."],
        issues=[
            {
                "category": "naturalness",
                "severity": "minor",
                "explanation": "Cụm 納品するのは難しい còn hơi trang trọng.",
                "suggested_fix": "Thử dùng 納品が難しいんですが.",
            }
        ],
        feedback_vi="Bạn đã đưa ra đề xuất thời hạn rõ ràng. Chú ý cách nói tự nhiên hơn.",
    )


def default_simulation_state_update() -> SimulationStateUpdateResult:
    return SimulationStateUpdateResult(
        unresolved_items=["thời hạn mới"],
        completed_items=["chào hỏi", "nêu mục đích"],
        facts=["Đối tác cần nhận hàng trong tuần tới."],
        decisions=["Đề xuất bàn giao vào thứ hai tuần sau."],
        participant_positions={"partner": "muốn nhận trong tuần tới"},
        emotional_context="thân thiện, hợp tác",
        next_goal="Chốt thời hạn bàn giao mới.",
    )


def default_simulation_context_summary() -> SimulationContextSummaryResult:
    return SimulationContextSummaryResult(
        unresolved_items=["thời hạn mới"],
        decisions=["Đề xuất bàn giao vào thứ hai tuần sau."],
        facts=["Đối tác cần nhận hàng trong tuần tới."],
        participant_positions={"partner": "muốn nhận trong tuần tới"},
        emotional_context="thân thiện, hợp tác",
        summary_note="Hai bên đang đàm phán thời hạn bàn giao.",
    )


def default_simulation_summary() -> SimulationSummaryResult:
    return SimulationSummaryResult(
        summary_vi=(
            "Bạn đã dẫn dắt cuộc trao đổi rõ ràng, đạt được thỏa thuận về thời "
            "hạn bàn giao mới và giữ được mối quan hệ tốt với đối tác."
        ),
        strengths=["Đề xuất phương án cụ thể", "Giữ thái độ lịch sự"],
        needs_work=["Cách diễn đạt tự nhiên hơn khi từ chối"],
    )


def default_simulation_coach() -> SimulationCoachResult:
    return SimulationCoachResult(
        answer=(
            "Ở tình huống này bạn có thể dùng 難しいんですが để từ chối nhẹ nhàng "
            "trước khi đưa ra phương án thay thế."
        ),
        suggestions=["Làm sao để đàm phán thời hạn tự nhiên hơn?"],
    )


def default_issue_detection() -> IssueDetectionResult:
    return IssueDetectionResult(
        has_issue=True,
        category="particle_choice",
        category_name_vi="Lỗi trợ từ (助詞の誤用)",
        category_explanation_vi="Trong tiếng Nhật, các tính từ biểu thị cảm xúc hoặc đánh giá (như 楽しい, 好き) thường đi kèm trợ từ が để chỉ đối tượng cảm xúc.",
        target_concept="〜のが楽しい (danh từ hóa cảm xúc)",
        target_segment="勉強することが",
    )


def default_self_correction_attempt(correct: bool = True) -> SelfCorrectionAttemptResult:
    if correct:
        return SelfCorrectionAttemptResult(
            is_correct=True,
            is_improved=True,
            score=95,
            improvement_status="significantly_improved",
            quality_delta=25,
            feedback_vi="Rất tốt! Bạn đã chuyển sang danh từ hóa「の」và dùng trợ từ「が」chuẩn xác với tính từ 楽しい.",
            remaining_issues=[],
            next_step_action="proceed_to_transfer",
        )
    return SelfCorrectionAttemptResult(
        is_correct=False,
        is_improved=True,
        score=65,
        improvement_status="partially_improved",
        quality_delta=10,
        feedback_vi="Câu đã tốt hơn nhưng trợ từ đi trước 楽しい vẫn chưa hoàn toàn tự nhiên.",
        remaining_issues=["Trợ từ trước tính từ cảm xúc chưa phù hợp"],
        next_step_action="advance_to_clue",
        next_clue="Hãy chú ý xem tính từ 楽しい thường kết hợp với trợ từ nào khi chỉ đối tượng khiến bạn vui thích.",
        next_pattern="Mẫu câu: [Động từ thể từ điển + の] + が + [Tính từ]. Ví dụ: 料理を作るのが楽しいです。",
    )


def default_rewrite_variants() -> RewriteVariantsResult:
    return RewriteVariantsResult(
        original="私は日本語を勉強することが楽しいです。",
        minimal_correction="私は日本語を勉強するのが楽しいです。",
        natural_japanese="日本語を勉強するのが楽しいです。",
        formal_business="日本語の学習を大変楽しく感じております。",
        casual_variant="日本語勉強するの楽しいよ。",
        synthesis_prompt_vi="Hãy viết 1 câu mới sử dụng cùng mẫu câu trên.",
        explanations={
            "minimal_correction": "Sửa こと thành の và giữ nguyên cấu trúc câu ban đầu.",
            "natural_japanese": "Lược bỏ 私は vì người nói tự biểu đạt cảm xúc của chính mình.",
            "formal_business": "Dùng danh từ hóa Hán tự 学習 và đuôi khiêm nhường 感じております.",
        },
    )


def default_transfer_task() -> TransferTaskResult:
    return TransferTaskResult(
        concept_tested="〜のが楽しい",
        scenario_prompt_vi="Hãy viết một câu nói về việc tự tay nấu ăn vào cuối tuần rất vui vẻ.",
        required_pattern="〜のが[Tính từ]",
        context_hint_vi="Có thể dùng động từ 料理を作る (nấu ăn) và tính từ 楽しい (vui vẻ).",
    )


def default_transfer_evaluation() -> TransferEvaluationResult:
    return TransferEvaluationResult(
        transferred_successfully=True,
        pattern_applied_correctly=True,
        score=92,
        feedback_vi="Xuất sắc! Bạn đã áp dụng cấu trúc「〜のが楽しい」vào bối cảnh mới một cách tự nhiên và chính xác.",
        strengths=["Áp dụng đúng danh từ hóa の", "Dùng đúng trợ từ が", "Câu văn mượt mà"],
        improvement_points=[],
        exemplar_sentence="週末に自分で料理を作るのがとても楽しいです。",
    )


def default_rewrite_mode() -> RewriteModeResult:
    return RewriteModeResult(
        mode="natural",
        mode_label_vi="Tự nhiên hóa",
        rewritten_text="日本語を勉強するのが楽しいです。",
        explanation_vi="Lược bỏ chủ ngữ 私は và sử dụng の thay vì こと để câu văn thuần thục theo văn phong bản ngữ.",
        key_changes=["Lược bỏ 私は thừa", "Chuyển こと thành の"],
    )


def default_diff_explanation() -> DiffExplanationResult:
    return DiffExplanationResult(
        before="私は日本語を勉強することが楽しいです。",
        after="日本語を勉強するのが楽しいです。",
        chunks=[
            DiffChunkResult(
                type="delete",
                before_text="私は",
                after_text="",
                rationale_vi="Lược bỏ đại từ nhân xưng không cần thiết trong tiếng Nhật tự nhiên.",
            ),
            DiffChunkResult(
                type="equal",
                before_text="日本語を勉強",
                after_text="日本語を勉強",
                rationale_vi="",
            ),
            DiffChunkResult(
                type="replace",
                before_text="すること",
                after_text="するの",
                rationale_vi="Danh từ hóa bằng「の」tự nhiên hơn khi đi liền trước tính từ cảm xúc.",
            ),
            DiffChunkResult(
                type="equal",
                before_text="が楽しいです。",
                after_text="が楽しいです。",
                rationale_vi="",
            ),
        ],
        improvement_status="significantly_improved",
        quality_delta=20,
        summary_rationale_vi="Bản sửa lược bỏ từ thừa và chọn từ danh từ hóa tự nhiên hơn, nâng cao độ thuần Nhật.",
    )


def default_socratic_coach() -> SocraticCoachResult:
    return SocraticCoachResult(
        answer="Khi diễn đạt sở thích hoặc cảm xúc với một hành động, người Nhật hay dùng cấu trúc [V-thể từ điển + の] + が + [Tính từ]. Bạn thử xem lại trợ từ trong câu nhé!",
        pattern_highlight="[V-dictionary + の] + が + [Tính từ cảm xúc]",
        why_previous_failed_vi="Việc dùng こと khiến câu văn mang tính học thuật trừu tượng thay vì cảm xúc trực tiếp.",
        suggestions=[
            "Tại sao không nên dùng こと trước 楽しい?",
            "Có những tính từ nào khác cũng đi với mẫu này?",
        ],
    )


def default_real_world_mission_draft() -> RealWorldMissionAIDraft:
    return RealWorldMissionAIDraft(
        role="Kỹ sư phần mềm BrSE",
        recipient="Trưởng phòng Sato (佐藤部長)",
        relationship="Cấp dưới - Trưởng phòng",
        objective="Báo cáo tiến độ hoàn thành API và xin phép dời thời gian kiểm thử sang ngày mai.",
        situation_vi="Bạn đang phát triển tính năng tích hợp API cho khách hàng. Tiến độ đã hoàn thành 90% nhưng cần thêm 1 ngày kiểm thử do bên thứ 3 bảo trì server.",
        context_vi="Viết email báo cáo tiến độ gửi Trưởng phòng Sato giải thích rõ lý do và đề xuất thời gian hoàn tất mới.",
        situation_ja="現在、顧客向けAPI連携機能を開発中です。開発は90%完了しましたが、外部サーバーのメンテナンスによりテスト期間を1日延長する必要があります。",
        context_ja="佐藤部長宛てに進捗報告メールを作成し、理由を説明した上で新しい完了予定日時を提案してください。",
        incoming_message="お疲れ様です。佐藤です。API連携機能の進捗状況はどうなっていますか？本日の定例までに共有をお願いします。",
        constraints=["Phải xin lỗi trước khi nêu lý do", "Đưa ra thời gian dự kiến mới cụ thể", "Sử dụng kính ngữ Keigo chuẩn mực"],
        required_points=[
            MissionRequiredPoint(id="current_status", description="Báo cáo đã hoàn thành 90% phần cốt lõi"),
            MissionRequiredPoint(id="delay_reason", description="Lý do chậm trễ do server bên thứ 3 bảo trì"),
            MissionRequiredPoint(id="new_eta", description="Thời gian hoàn tất kiểm thử mới là 17:00 ngày mai"),
        ],
        target_register="business",
        optional_vocabulary=[
            VocabularyHelperItem(word="進捗", reading="しんちょく", meaning="tiến độ", example="進捗状況をご報告いたします。"),
            VocabularyHelperItem(word="ご査収", reading="ごさしゅう", meaning="xem xét/kiểm tra", example="添付ファイルをご査収ください。"),
            VocabularyHelperItem(word="遅延", reading="ちえん", meaning="chậm trễ", example="開発に遅延が生じており申し訳ございません。"),
        ],
        success_conditions=["Đầy đủ 3 điểm thông tin bắt buộc", "Dùng đúng kính ngữ sonkeigo/kenjougo", "Không có câu văn thân mật"],
        pedagogical_target_summary="Thực hành kính ngữ báo cáo tiến độ và cấu trúc xin lỗi kèm phương án xử lý.",
    )


def default_mission_evaluation_result() -> MissionEvaluationAIResult:
    return MissionEvaluationAIResult(
        overall_score=88,
        passed=True,
        dimensions=Mission10Dimensions(
            task_completion=MissionDimensionScore(score=90, status="excellent", feedback_vi="Hoàn thành xuất sắc mục tiêu báo cáo tiến độ."),
            factual_completeness=MissionDimensionScore(score=90, status="excellent", feedback_vi="Nêu đầy đủ tiến độ, lý do và thời gian mới."),
            naturalness=MissionDimensionScore(score=85, status="excellent", feedback_vi="Diễn đạt tự nhiên, chuẩn phong cách kinh doanh."),
            grammar=MissionDimensionScore(score=90, status="excellent", feedback_vi="Ngữ pháp chính xác, trợ từ dùng đúng."),
            vocabulary=MissionDimensionScore(score=85, status="excellent", feedback_vi="Từ vựng chuyên nghiệp, đúng ngữ cảnh công sở."),
            register=MissionDimensionScore(score=90, status="excellent", feedback_vi="Tuân thủ nghiêm ngặt văn phong kính ngữ Keigo."),
            politeness=MissionDimensionScore(score=90, status="excellent", feedback_vi="Mức độ lịch thiệp cao, thể hiện sự tôn trọng."),
            tone=MissionDimensionScore(score=85, status="excellent", feedback_vi="Sắc thái chân thành và tinh thần trách nhiệm cao."),
            clarity=MissionDimensionScore(score=88, status="excellent", feedback_vi="Trình bày mạch lạc, các mốc thời gian rõ ràng."),
            discourse=MissionDimensionScore(score=87, status="excellent", feedback_vi="Bố cục email chuẩn từ chào đầu đến kết thúc."),
        ),
        required_points=[
            MissionRequiredPointCheck(id="current_status", description="Báo cáo tiến độ 90%", status="satisfied", explanation_vi="Đã nêu rõ tiến độ đạt 90%."),
            MissionRequiredPointCheck(id="delay_reason", description="Lý do chậm trễ bên thứ 3", status="satisfied", explanation_vi="Đã giải thích nguyên nhân khách quan."),
            MissionRequiredPointCheck(id="new_eta", description="Thời hạn mới 17:00 ngày mai", status="satisfied", explanation_vi="Đã cam kết thời gian hoàn tất."),
        ],
        constraints_respected=True,
        constraints_feedback=["Đã xin lỗi lịch thiệp", "Đã nêu thời gian mới", "Đã dùng kính ngữ chuẩn"],
        strengths_vi=["Sử dụng chuẩn xác cấu trúc báo cáo kinh doanh.", "Sắc thái xin lỗi chân thành và chủ động đưa ra giải pháp."],
        improvements_vi=["Có thể bổ sung câu đệm '恐れ入りますが' để câu văn mềm mại hơn."],
        native_model_rewrite="佐藤部長\n\nお疲れ様です。進捗のご報告をいたします。\n現在開発は90%完了しておりますが、外部連携サーバーのメンテナンスに伴い、テスト完了を明日17時まで延長させていただきたく存じます。\nご迷惑をおかけし大変恐縮ですが、何卒よろしくお願い申し上げます。",
        rewrite_nuances_vi="Bản viết mẫu sử dụng kính ngữ khiêm nhường 'させていただきたく存じます' thể hiện sự tôn trọng tối đa.",
        cultural_discourse_tip_vi="Trong văn hóa kinh doanh Nhật Bản, khi báo trễ cần tuân thủ nguyên tắc HOU-REN-SO (Báo cáo - Liên lạc - Thảo luận) càng sớm càng tốt.",
    )


class ScriptedAIProvider(FakeAIProvider):
    """FakeAIProvider returning queued payloads per structured model.

    - plans: queued ExercisePlan payloads (falls back to default_plan())
    - drafts: queued ExerciseDraft payloads (falls back to default_draft())
    - validations: queued ExerciseValidationResult payloads
      (falls back to a valid result)
    - semantics / grammar_vocabs / naturalness_registers / corrections /
      hints / verifications: queued evaluation-stage payloads (falls back to
      the coherent fake samples)
    - vocabulary_extractions / vocabulary_validations / vocabulary_explanations:
      queued vocabulary-stage payloads (falls back to the fake samples)
    - fail_at: 1-based index of the structured call that must raise
      ``fail_error`` (defaults to an AIResponseError)
    """

    def __init__(
        self,
        *,
        plans: list[ExercisePlan] | None = None,
        drafts: list[ExerciseDraft] | None = None,
        validations: list[ExerciseValidationResult] | None = None,
        fallback_validation: ExerciseValidationResult | None = None,
        semantics: list[SemanticEvaluation] | None = None,
        grammar_vocabs: list[GrammarVocabularyEvaluation] | None = None,
        naturalness_registers: list[NaturalnessRegisterEvaluation] | None = None,
        corrections: list[CorrectionResult] | None = None,
        hints: list[HintResult] | None = None,
        verifications: list | None = None,
        vocabulary_extractions: list[VocabularyExtractionResult] | None = None,
        vocabulary_validations: list[VocabularyValidationResult] | None = None,
        vocabulary_explanations: list[VocabularyExplanationResult] | None = None,
        profile_syntheses: list[LearnerProfileSynthesisResult] | None = None,
        mistake_clusterings: list[MistakeClusteringResult] | None = None,
        learning_plans: list[LearningRecommendationResult] | None = None,
        recommendation_explanations: list[RecommendationExplanationResult] | None = None,
        daily_missions: list[DailyMissionResult] | None = None,
        challenge_generations: list[ChallengeGenerationResult] | None = None,
        progress_summaries: list[ProgressSummaryResult] | None = None,
        milestone_celebrations: list[MilestoneCelebrationResult] | None = None,
        encouragements: list[EncouragementResult] | None = None,
        discourse_segmentations: list[DiscourseSegmentationResult] | None = None,
        discourse_analyses: list[DiscourseAnalysisResult] | None = None,
        style_consistencies: list[StyleConsistencyResult] | None = None,
        structure_suggestions: list[StructureSuggestionResult] | None = None,
        discourse_syntheses: list[DiscourseSynthesisResult] | None = None,
        discourse_coaches: list[DiscourseCoachResult] | None = None,
        revision_guidances: list[RevisionGuidanceResult] | None = None,
        scenario_plans: list[WritingScenarioPlan] | None = None,
        scenario_drafts: list[WritingScenarioDraft] | None = None,
        scenario_validations: list[WritingScenarioValidationResult] | None = None,
        scenario_evaluations: list[ScenarioEvaluationResult] | None = None,
        simulation_plans: list[SimulationPlanResult] | None = None,
        simulation_turn_generations: list[SimulationTurnGenerationResult] | None = None,
        simulation_turn_evaluations: list[SimulationTurnEvaluationResult] | None = None,
        simulation_state_updates: list[SimulationStateUpdateResult] | None = None,
        simulation_context_summaries: list[SimulationContextSummaryResult] | None = None,
        simulation_summaries: list[SimulationSummaryResult] | None = None,
        simulation_coaches: list[SimulationCoachResult] | None = None,
        goal_interpretations: list[GoalInterpretationResult] | None = None,
        curriculum_plans: list[CurriculumPlanningResult] | None = None,
        curriculum_replans: list[CurriculumReplanningResult] | None = None,
        objective_progress_analyses: list[ObjectiveProgressAnalysisResult] | None = None,
        fail_at: int | None = None,
        fail_error: AIError | None = None,
        **kwargs: Any,
    ) -> None:
        super().__init__(**kwargs)
        self._plans = list(plans or [])
        self._drafts = list(drafts or [])
        self._validations = list(validations or [])
        self._fallback_validation = fallback_validation
        self._semantics = list(semantics or [])
        self._grammar_vocabs = list(grammar_vocabs or [])
        self._naturalness_registers = list(naturalness_registers or [])
        self._corrections = list(corrections or [])
        self._hints = list(hints or [])
        self._verifications = list(verifications or [])
        self._vocabulary_extractions = list(vocabulary_extractions or [])
        self._vocabulary_validations = list(vocabulary_validations or [])
        self._vocabulary_explanations = list(vocabulary_explanations or [])
        self._profile_syntheses = list(profile_syntheses or [])
        self._mistake_clusterings = list(mistake_clusterings or [])
        self._learning_plans = list(learning_plans or [])
        self._recommendation_explanations = list(recommendation_explanations or [])
        self._daily_missions = list(daily_missions or [])
        self._challenge_generations = list(challenge_generations or [])
        self._progress_summaries = list(progress_summaries or [])
        self._milestone_celebrations = list(milestone_celebrations or [])
        self._encouragements = list(encouragements or [])
        self._discourse_segmentations = list(discourse_segmentations or [])
        self._discourse_analyses = list(discourse_analyses or [])
        self._style_consistencies = list(style_consistencies or [])
        self._structure_suggestions = list(structure_suggestions or [])
        self._discourse_syntheses = list(discourse_syntheses or [])
        self._discourse_coaches = list(discourse_coaches or [])
        self._revision_guidances = list(revision_guidances or [])
        self._scenario_plans = list(scenario_plans or [])
        self._scenario_drafts = list(scenario_drafts or [])
        self._scenario_validations = list(scenario_validations or [])
        self._scenario_evaluations = list(scenario_evaluations or [])
        self._simulation_plans = list(simulation_plans or [])
        self._simulation_turn_generations = list(simulation_turn_generations or [])
        self._simulation_turn_evaluations = list(simulation_turn_evaluations or [])
        self._simulation_state_updates = list(simulation_state_updates or [])
        self._simulation_context_summaries = list(simulation_context_summaries or [])
        self._simulation_summaries = list(simulation_summaries or [])
        self._simulation_coaches = list(simulation_coaches or [])
        self._goal_interpretations = list(goal_interpretations or [])
        self._curriculum_plans = list(curriculum_plans or [])
        self._curriculum_replans = list(curriculum_replans or [])
        self._objective_progress_analyses = list(objective_progress_analyses or [])
        self._fail_at = fail_at
        self._fail_error = fail_error or AIResponseError(
            "Simulated invalid structured output", provider=self.name
        )
        self._structured_calls = 0

    @property
    def structured_calls(self) -> int:
        return self._structured_calls

    def _result(self, prompt: str) -> AIGenerationResult:
        return AIGenerationResult(
            text=prompt,
            provider=self.name,
            model=self._model,
            usage=self._usage(prompt, prompt),
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
        self._structured_calls += 1
        if self._fail_at is not None and self._structured_calls == self._fail_at:
            raise self._fail_error

        if response_model is ExercisePlan:
            payload = self._plans.pop(0) if self._plans else default_plan()
        elif response_model is ExerciseDraft:
            payload = self._drafts.pop(0) if self._drafts else default_draft()
        elif response_model is ExerciseValidationResult:
            if self._validations:
                payload = self._validations.pop(0)
            elif self._fallback_validation is not None:
                payload = self._fallback_validation
            else:
                payload = default_validation()
        elif response_model is SemanticEvaluation:
            payload = self._semantics.pop(0) if self._semantics else None
        elif response_model is GrammarVocabularyEvaluation:
            payload = self._grammar_vocabs.pop(0) if self._grammar_vocabs else None
        elif response_model is NaturalnessRegisterEvaluation:
            payload = self._naturalness_registers.pop(0) if self._naturalness_registers else None
        elif response_model is CorrectionResult:
            payload = self._corrections.pop(0) if self._corrections else None
        elif response_model is HintResult:
            payload = self._hints.pop(0) if self._hints else None
        elif response_model.__name__ == "EvaluationVerificationResult":
            payload = self._verifications.pop(0) if self._verifications else None
        elif response_model is VocabularyExtractionResult:
            payload = self._vocabulary_extractions.pop(0) if self._vocabulary_extractions else None
        elif response_model is VocabularyValidationResult:
            payload = self._vocabulary_validations.pop(0) if self._vocabulary_validations else None
        elif response_model is VocabularyExplanationResult:
            payload = (
                self._vocabulary_explanations.pop(0) if self._vocabulary_explanations else None
            )
        elif response_model is LearnerProfileSynthesisResult:
            payload = self._profile_syntheses.pop(0) if self._profile_syntheses else None
        elif response_model is MistakeClusteringResult:
            payload = self._mistake_clusterings.pop(0) if self._mistake_clusterings else None
        elif response_model is LearningRecommendationResult:
            payload = self._learning_plans.pop(0) if self._learning_plans else None
        elif response_model is RecommendationExplanationResult:
            payload = (
                self._recommendation_explanations.pop(0)
                if self._recommendation_explanations
                else None
            )
        elif response_model is DailyMissionResult:
            payload = self._daily_missions.pop(0) if self._daily_missions else None
        elif response_model is ChallengeGenerationResult:
            payload = self._challenge_generations.pop(0) if self._challenge_generations else None
        elif response_model is ProgressSummaryResult:
            payload = self._progress_summaries.pop(0) if self._progress_summaries else None
        elif response_model is MilestoneCelebrationResult:
            payload = self._milestone_celebrations.pop(0) if self._milestone_celebrations else None
        elif response_model is EncouragementResult:
            payload = self._encouragements.pop(0) if self._encouragements else None
        elif response_model is DiscourseSegmentationResult:
            payload = (
                self._discourse_segmentations.pop(0) if self._discourse_segmentations else None
            )
        elif response_model is DiscourseAnalysisResult:
            payload = self._discourse_analyses.pop(0) if self._discourse_analyses else None
        elif response_model is StyleConsistencyResult:
            payload = self._style_consistencies.pop(0) if self._style_consistencies else None
        elif response_model is StructureSuggestionResult:
            payload = self._structure_suggestions.pop(0) if self._structure_suggestions else None
        elif response_model is DiscourseSynthesisResult:
            payload = self._discourse_syntheses.pop(0) if self._discourse_syntheses else None
        elif response_model is DiscourseCoachResult:
            payload = self._discourse_coaches.pop(0) if self._discourse_coaches else None
        elif response_model is RevisionGuidanceResult:
            payload = self._revision_guidances.pop(0) if self._revision_guidances else None
        elif response_model is WritingScenarioPlan:
            payload = (
                self._scenario_plans.pop(0) if self._scenario_plans else default_scenario_plan()
            )
        elif response_model is WritingScenarioDraft:
            payload = (
                self._scenario_drafts.pop(0) if self._scenario_drafts else default_scenario_draft()
            )
        elif response_model is WritingScenarioValidationResult:
            payload = (
                self._scenario_validations.pop(0)
                if self._scenario_validations
                else default_scenario_validation()
            )
        elif response_model is ScenarioEvaluationResult:
            payload = (
                self._scenario_evaluations.pop(0)
                if self._scenario_evaluations
                else default_scenario_evaluation()
            )
        elif response_model is SimulationPlanResult:
            payload = (
                self._simulation_plans.pop(0)
                if self._simulation_plans
                else default_simulation_plan()
            )
        elif response_model is SimulationTurnGenerationResult:
            payload = (
                self._simulation_turn_generations.pop(0)
                if self._simulation_turn_generations
                else default_simulation_turn_generation()
            )
        elif response_model is SimulationTurnEvaluationResult:
            payload = (
                self._simulation_turn_evaluations.pop(0)
                if self._simulation_turn_evaluations
                else default_simulation_turn_evaluation()
            )
        elif response_model is SimulationStateUpdateResult:
            payload = (
                self._simulation_state_updates.pop(0)
                if self._simulation_state_updates
                else default_simulation_state_update()
            )
        elif response_model is SimulationContextSummaryResult:
            payload = (
                self._simulation_context_summaries.pop(0)
                if self._simulation_context_summaries
                else default_simulation_context_summary()
            )
        elif response_model is SimulationSummaryResult:
            payload = (
                self._simulation_summaries.pop(0)
                if self._simulation_summaries
                else default_simulation_summary()
            )
        elif response_model is SimulationCoachResult:
            payload = (
                self._simulation_coaches.pop(0)
                if self._simulation_coaches
                else default_simulation_coach()
            )
        elif response_model is GoalInterpretationResult:
            payload = self._goal_interpretations.pop(0) if self._goal_interpretations else None
        elif response_model is CurriculumPlanningResult:
            payload = self._curriculum_plans.pop(0) if self._curriculum_plans else None
        elif response_model is CurriculumReplanningResult:
            payload = self._curriculum_replans.pop(0) if self._curriculum_replans else None
        elif response_model is ObjectiveProgressAnalysisResult:
            payload = (
                self._objective_progress_analyses.pop(0)
                if self._objective_progress_analyses
                else None
            )
        elif response_model is IssueDetectionResult:
            payload = default_issue_detection()
        elif response_model is SelfCorrectionAttemptResult:
            payload = default_self_correction_attempt(correct=True)
        elif response_model is RewriteVariantsResult:
            payload = default_rewrite_variants()
        elif response_model is TransferTaskResult:
            payload = default_transfer_task()
        elif response_model is TransferEvaluationResult:
            payload = default_transfer_evaluation()
        elif response_model is RewriteModeResult:
            payload = default_rewrite_mode()
        elif response_model is DiffExplanationResult:
            payload = default_diff_explanation()
        elif response_model is SocraticCoachResult:
            payload = default_socratic_coach()
        elif response_model is RealWorldMissionAIDraft:
            payload = default_real_world_mission_draft()
        elif response_model is MissionEvaluationAIResult:
            payload = default_mission_evaluation_result()
        else:
            return await super().generate_structured(
                prompt, response_model, system=system, model=model, **kwargs
            )
        if payload is None:
            return await super().generate_structured(
                prompt, response_model, system=system, model=model, **kwargs
            )
        return payload, self._result(prompt)
