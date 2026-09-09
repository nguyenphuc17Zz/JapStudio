from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralized application configuration, loaded from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Japanese Writing Tutor API"
    app_version: str = "0.1.0"
    app_env: str = "development"
    app_debug: bool = False

    database_url: str = Field(
        default="mysql+aiomysql://root@localhost:3306/ai_japanese_writing",
        repr=False,
    )
    database_echo: bool = False
    database_pool_size: int = 5
    database_max_overflow: int = 10

    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:5174,http://127.0.0.1:5174,"
        "http://localhost:3000,http://127.0.0.1:3000"
    )

    log_level: str = "INFO"

    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 300
    rate_limit_trusted_proxy_headers: bool = False
    admin_api_key: str = Field(default="", repr=False)

    timezone_name: str = "Asia/Ho_Chi_Minh"

    ai_default_provider: str = ""
    ai_default_model: str = ""
    ai_max_retries: int = 2
    ai_request_timeout: float = 60.0
    ai_retry_backoff: float = 1.0
    ai_fallback_providers: str = ""

    ai_exercise_generation_provider: str = ""
    ai_exercise_generation_model: str = ""
    ai_exercise_generation_max_tokens: int = 1024
    ai_exercise_validation_provider: str = ""
    ai_exercise_validation_model: str = ""
    ai_exercise_validation_max_tokens: int = 512
    ai_exercise_max_regeneration_attempts: int = 1
    ai_exercise_recent_prompt_window: int = 100
    ai_exercise_near_duplicate_threshold: float = 0.88

    ai_exercise_evaluation_provider: str = ""
    ai_exercise_evaluation_model: str = ""
    ai_exercise_evaluation_model_semantic: str = ""
    ai_exercise_evaluation_model_grammar: str = ""
    ai_exercise_evaluation_model_naturalness: str = ""
    ai_exercise_evaluation_model_correction: str = ""
    ai_exercise_evaluation_model_hint: str = ""
    ai_exercise_evaluation_max_retries: int = 2
    ai_exercise_evaluation_max_tokens: int = 1024
    ai_exercise_learning_mode_enabled: bool = True
    ai_exercise_evaluation_verification_enabled: bool = False

    ai_long_form_enabled: bool = True
    ai_long_form_provider: str = ""
    ai_long_form_model: str = ""
    ai_long_form_coach_model: str = ""
    ai_long_form_max_tokens: int = 1536
    ai_long_form_sentence_evaluation_enabled: bool = True
    ai_long_form_ai_segmentation_enabled: bool = False
    ai_long_form_max_sentences: int = 30
    ai_long_form_overall_sentence_weight: int = 50
    ai_long_form_revision_guidance_enabled: bool = True
    ai_discourse_weight_coherence: int = 25
    ai_discourse_weight_cohesion: int = 20
    ai_discourse_weight_organization: int = 15
    ai_discourse_weight_flow: int = 20
    ai_discourse_weight_style: int = 10
    ai_discourse_weight_redundancy: int = 10

    ai_scenario_enabled: bool = True
    ai_scenario_provider: str = ""
    ai_scenario_model: str = ""
    ai_scenario_validation_model: str = ""
    ai_scenario_evaluation_provider: str = ""
    ai_scenario_evaluation_model: str = ""
    ai_scenario_max_tokens: int = 1536
    ai_scenario_max_regeneration_attempts: int = 1
    ai_scenario_history_window: int = 10
    ai_scenario_weight_semantic: int = 20
    ai_scenario_weight_audience: int = 20
    ai_scenario_weight_purpose: int = 15
    ai_scenario_weight_tone: int = 25
    ai_scenario_weight_constraint: int = 20
    ai_scenario_difficulty_weight_language: int = 20
    ai_scenario_difficulty_weight_context: int = 20
    ai_scenario_difficulty_weight_audience: int = 15
    ai_scenario_difficulty_weight_purpose: int = 15
    ai_scenario_difficulty_weight_constraint: int = 15
    ai_scenario_difficulty_weight_register: int = 15

    ai_simulation_enabled: bool = True
    ai_simulation_provider: str = ""
    ai_simulation_model: str = ""
    ai_simulation_planner_model: str = ""
    ai_simulation_turn_model: str = ""
    ai_simulation_evaluation_model: str = ""
    ai_simulation_summary_model: str = ""
    ai_simulation_coach_model: str = ""
    ai_simulation_max_tokens: int = 1024
    ai_simulation_max_turns: int = 12
    ai_simulation_context_window: int = 10
    ai_simulation_max_regeneration_attempts: int = 1
    ai_simulation_difficulty_bounds: int = 2
    ai_simulation_weight_sentence: int = 40
    ai_simulation_weight_scenario: int = 20
    ai_simulation_weight_communication: int = 20
    ai_simulation_weight_goal: int = 20
    ai_simulation_improvement_delta: int = 5

    ai_evaluation_weight_semantic: int = 25
    ai_evaluation_weight_grammar: int = 20
    ai_evaluation_weight_vocabulary: int = 10
    ai_evaluation_weight_naturalness: int = 30
    ai_evaluation_weight_context_fit: int = 10
    ai_evaluation_weight_register_fit: int = 5

    ai_vocabulary_provider: str = ""
    ai_vocabulary_model: str = ""
    ai_vocabulary_validation_model: str = ""
    ai_vocabulary_explanation_model: str = ""
    ai_vocabulary_max_tokens: int = 1024
    ai_vocabulary_min_importance: int = 4
    ai_vocabulary_auto_extract_enabled: bool = True

    ai_learning_provider: str = ""
    ai_learning_model: str = ""
    ai_learning_profile_model: str = ""
    ai_learning_max_tokens: int = 1024
    ai_learning_strategy_targeted: int = 70
    ai_learning_strategy_reinforcement: int = 20
    ai_learning_strategy_exploration: int = 10
    ai_learning_profile_refresh_interval: int = 10
    ai_learning_max_difficulty_step: int = 2
    ai_learning_max_jlpt_step: int = 1
    ai_learning_recency_half_life_days: float = 30.0
    ai_learning_evidence_window: int = 200
    ai_learning_auto_update_enabled: bool = True

    # Phase 13 - AI Curriculum & Learning Journey Engine
    ai_curriculum_enabled: bool = True
    ai_curriculum_provider: str = ""
    ai_curriculum_model: str = ""
    ai_curriculum_planning_model: str = ""
    ai_curriculum_replanning_model: str = ""
    ai_curriculum_explanation_model: str = ""
    ai_curriculum_max_tokens: int = 1536
    ai_curriculum_replan_interval: int = 25
    ai_curriculum_evidence_window: int = 50
    ai_curriculum_mastery_attempts: int = 5
    ai_curriculum_min_evidence_confident: int = 3
    ai_curriculum_default_threshold: int = 80
    ai_curriculum_max_milestones: int = 8
    ai_curriculum_max_objectives_per_milestone: int = 6

    gamification_enabled: bool = True

    xp_exercise_complete: int = 10
    xp_high_score_bonus: int = 5
    xp_retry_improvement: int = 5
    xp_challenge_complete: int = 15
    xp_daily_goal: int = 25
    xp_milestone: int = 50
    xp_objective_complete: int = 30
    xp_milestone_complete: int = 75
    xp_journey_complete: int = 200
    xp_mission_complete: int = 0
    xp_high_score_threshold: int = 80
    xp_retry_improvement_delta: int = 5
    xp_simulation_complete: int = 20
    xp_simulation_objective: int = 10
    xp_simulation_improvement: int = 10
    xp_level_base: int = 100

    ai_challenge_enabled: bool = True
    ai_daily_mission_enabled: bool = True
    ai_progress_summary_enabled: bool = True
    ai_encouragement_enabled: bool = True
    ai_challenge_frequency: int = 3
    ai_challenge_success_threshold: int = 80

    ai_gamification_provider: str = ""
    ai_gamification_model: str = ""
    ai_daily_mission_model: str = ""
    ai_challenge_model: str = ""
    ai_progress_summary_model: str = ""
    ai_milestone_model: str = ""
    ai_encouragement_model: str = ""
    ai_gamification_max_tokens: int = 1024

    ai_quality_min_confidence: str = "medium"
    ai_quality_max_provider_disagreement: int = 25
    ai_quality_max_retries: int = 2
    ai_quality_verification_enabled: bool = False
    ai_quality_escalation_enabled: bool = True
    ai_quality_diagnostics_enabled: bool = True
    ai_quality_telemetry_enabled: bool = True
    ai_quality_verification_provider: str = ""
    ai_quality_verification_model: str = ""
    ai_quality_escalation_model: str = ""
    ai_quality_evidence_min_count: int = 3
    ai_quality_evidence_max_contamination: float = 0.3
    ai_quality_cost_profiles: str = ""

    ai_memory_enabled: bool = True
    ai_memory_provider: str = ""
    ai_memory_model: str = ""
    ai_memory_validation_model: str = ""
    ai_memory_conflict_model: str = ""
    ai_memory_max_tokens: int = 1024
    ai_memory_max_items: int = 6
    ai_memory_context_max_tokens: int = 800
    ai_memory_min_importance: int = 4
    ai_memory_min_confidence: str = "medium"
    ai_memory_temporary_expiry_days: int = 90

    # Phase 14 - Product Intelligence, Learning Analytics & Optimization
    ai_analytics_enabled: bool = True
    analytics_retention_days: int = 90
    analytics_windows: str = "7d,14d,30d,90d,all_time"
    analytics_min_evidence: int = 2
    analytics_learner_min_evidence: int = 3
    analytics_ai_min_calls: int = 5
    analytics_aggregation_days: int = 30
    ai_product_analytics_provider: str = ""
    ai_product_analytics_model: str = ""
    ai_optimization_model: str = ""

    gemini_api_key: str = Field(default="", repr=False)
    gemini_default_model: str = "gemini-2.5-flash"
    groq_api_key: str = Field(default="", repr=False)
    groq_default_model: str = "llama-3.3-70b-versatile"
    ollama_base_url: str = ""
    ollama_default_model: str = "llama3.2"

    @property
    def ai_fallback_provider_list(self) -> list[str]:
        return [p.strip() for p in self.ai_fallback_providers.split(",") if p.strip()]

    @property
    def ai_quality_cost_profile_map(self) -> dict[str, str]:
        """AI_TASK_COST_PROFILE overrides as {task: profile}."""
        result: dict[str, str] = {}
        for entry in self.ai_quality_cost_profiles.split(","):
            entry = entry.strip()
            if not entry or ":" not in entry:
                continue
            task, profile = entry.split(":", 1)
            result[task.strip()] = profile.strip()
        return result

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_test(self) -> bool:
        return self.app_env.lower() == "test"

    @property
    def analytics_window_list(self) -> list[str]:
        """Supported learning windows (``ANALYTICS_WINDOWS``, comma-separated).

        Window ids: ``7d``, ``14d``, ``30d``, ``90d`` or ``all_time``.
        """
        windows: list[str] = []
        for entry in self.analytics_windows.split(","):
            window = entry.strip()
            if window in ("7d", "14d", "30d", "90d", "all_time"):
                windows.append(window)
        return windows or ["7d", "14d", "30d", "90d", "all_time"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
