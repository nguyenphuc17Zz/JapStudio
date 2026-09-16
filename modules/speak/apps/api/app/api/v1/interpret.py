"""VI-JA Interpretation API — Mode 9 integration (thin wrapper over Learning Engine)."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.interpret.dynamic_generator import AIInterpretGenerator
from app.domains.learning.exercise_session_service import ExerciseSessionService
from app.domains.learning.learning_item_service import LearningItemService
from app.domains.learning.models import Exercise
from app.domains.learning.prompts import LearningPrompts
from app.domains.learning.schemas import ExerciseDTO, ExerciseResultDTO
from app.domains.users.service import UserService
from app.infrastructure.database.session import get_db
from app.shared.errors.exceptions import ValidationException

router = APIRouter(prefix="/interpret", tags=["VI-JA Interpretation — Mode 9"])

VALID_MODES = {"interpret_word", "interpret_sentence", "interpret_situation"}
TIMER_BY_MODE = {"interpret_word": 8000, "interpret_sentence": 20000, "interpret_situation": 30000}


async def get_current_user_id(db: AsyncSession = Depends(get_db)) -> str:
    svc = UserService(db)
    user = await svc.get_or_create_default_user()
    return user.id


@router.get("/topics")
async def list_topics():
    return {
        "topics": [
            {"id": "workplace", "label": "Công sở", "ja": "職場"},
            {"id": "tet_holiday", "label": "Tết", "ja": "テト"},
            {"id": "daily_life", "label": "Đời sống", "ja": "生活"},
            {"id": "family", "label": "Gia đình", "ja": "家族"},
            {"id": "travel", "label": "Du lịch", "ja": "旅行"},
        ],
        "scaffolds": [
            {"id": "keyword_hint", "label": "Gợi ý ý chính JA"},
            {"id": "sentence_starter", "label": "Gợi ý mở đầu"},
            {"id": "none", "label": "Blind (tự lực)"},
        ],
    }


@router.get("/exercises/generate", response_model=ExerciseDTO)
async def generate_interpret_exercise_get(
    sub_mode: str = Query(default="interpret_sentence", description="interpret_word|interpret_sentence|interpret_situation|mixed"),
    relation: str = Query(default="casual_friend"),
    scaffold: str = Query(default="keyword_hint"),
    topic: str | None = Query(default=None),
    timer_limit_ms: int | None = Query(default=None, ge=0, le=120000),
    difficulty: str | None = Query(default=None),
    learning_item_key: str | None = Query(default=None),
    force_ai: bool = Query(default=False, description="Bypass cache and force AI generation"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await generate_interpret_exercise(
        sub_mode=sub_mode, relation=relation, scaffold=scaffold, topic=topic,
        timer_limit_ms=timer_limit_ms, difficulty=difficulty,
        learning_item_key=learning_item_key, force_ai=force_ai, user_id=user_id, db=db,
    )


@router.post("/exercises/generate", response_model=ExerciseDTO)
async def generate_interpret_exercise(
    sub_mode: str = Query(default="interpret_sentence", description="interpret_word|interpret_sentence|interpret_situation|mixed"),
    relation: str = Query(default="casual_friend"),
    scaffold: str = Query(default="keyword_hint"),
    topic: str | None = Query(default=None),
    timer_limit_ms: int | None = Query(default=None, ge=0, le=120000),
    difficulty: str | None = Query(default=None),
    learning_item_key: str | None = Query(default=None),
    force_ai: bool = Query(default=False, description="Bypass cache and force AI generation"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Dynamic VI-JA drill generation via AI + pool fallback. Content cached in DB."""
    if sub_mode == "mixed":
        import random

        r = random.random()
        sub_mode = "interpret_word" if r < 0.4 else ("interpret_sentence" if r < 0.7 else "interpret_situation")
    if sub_mode not in VALID_MODES:
        raise ValidationException(f"Invalid sub_mode '{sub_mode}'. Must be one of {sorted(VALID_MODES)}")
    if relation not in ("casual_friend", "business_polite"):
        relation = "casual_friend"
    if scaffold not in ("none", "keyword_hint", "sentence_starter"):
        scaffold = "keyword_hint"
    eff_diff = difficulty or "normal"

    ai_gen = AIInterpretGenerator(db)
    data = await ai_gen.generate_dynamic_exercise(
        sub_mode=sub_mode, relation=relation, scaffold=scaffold,
        timer_limit_ms=timer_limit_ms, difficulty=eff_diff, topic=topic, user_id=user_id,
        force_ai=force_ai,
    )

    item_key = learning_item_key
    if not item_key:
        item_service = LearningItemService(db)
        items = await item_service.list_items(user_id, limit=20)
        match = next((i for i in items if i.item_type == "fluency"), None)
        if match:
            item_key = match.key
        else:
            from app.domains.learning.models import LearningItem

            key = f"interpret.{sub_mode}"
            existing = await item_service.get_item_by_key(key, user_id)
            if not existing:
                new_item = LearningItem(
                    user_id=user_id, key=key, item_type="fluency",
                    title=f"VI-JA Interpret — {sub_mode}",
                    description=f"Luyện dịch Việt→Nhật {sub_mode}.",
                    difficulty=eff_diff, lifecycle="active", status="active",
                )
                db.add(new_item)
                await db.flush()
                item_key = key
            else:
                item_key = key

    from app.domains.learning.exercise_variety_policy import ExerciseVarietyPolicy

    sig = ExerciseVarietyPolicy.compute_exercise_signature(
        exercise_type=sub_mode,
        target_patterns=[data.get("title", sub_mode)],
        difficulty=eff_diff,
        scenario_topic=data.get("scenario"),
    )
    blind = bool(data.get("blind", scaffold == "none"))
    exercise = Exercise(
        user_id=user_id, exercise_type=sub_mode, status="not_started",
        title=data["title"], objective=data["objective"], scenario=data.get("scenario"),
        instructions=data["instructions"],
        constraints=["Giữ đủ ý chính, đúng SOV, đúng register."],
        target_patterns=[], learning_item_keys=[item_key],
        success_criteria=["Đủ ý, đúng trật tự, tự nhiên."],
        acceptable_variants=[], difficulty=eff_diff,
        scaffold_level="none" if blind else "keyword_hint",
        scaffold_hint=", ".join(data.get("expected_ja_keywords", [])) or None,
        estimated_minutes=4, template_version="v1",
        generator_version="interpret.1.0.0",
        prompt_version=LearningPrompts.INTERPRET_GEN_PROMPT_VERSION,
        provider="interpret_factory", model="deterministic_v1",
        exercise_signature=sig,
        extra_metadata={
            "interpret_config": {
                "sub_mode": sub_mode,
                "prompt_vi": data.get("prompt_vi"),
                "expected_ja_keywords": data.get("expected_ja_keywords", []),
                "reference_ja": data.get("reference_ja"),
                "situation_vi": data.get("situation_vi"),
                "topic": data.get("topic", topic),
                "relation": data.get("relation", relation),
                "scaffold": scaffold, "blind": blind,
                "timer_limit_ms": data.get("timer_limit_ms", TIMER_BY_MODE[sub_mode]),
                "generation_source": data.get("generation_source", "ai"),
                "is_fallback": data.get("is_fallback", False),
                "fallback_reason": data.get("fallback_reason"),
            },
            "generation_source": data.get("generation_source", "ai"),
            "is_fallback": data.get("is_fallback", False),
            "fallback_reason": data.get("fallback_reason"),
            "priority_score": 0.7, "item_type": "interpret",
        },
    )
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.get("/exercises/{exercise_id}", response_model=ExerciseDTO)
async def get_interpret_exercise(
    exercise_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select

    stmt = select(Exercise).where(Exercise.id == exercise_id, Exercise.user_id == user_id)
    res = await db.execute(stmt)
    ex = res.scalar_one_or_none()
    if not ex:
        from app.shared.errors.exceptions import NotFoundException

        raise NotFoundException(f"Exercise '{exercise_id}' not found.")
    return ex


@router.post("/exercises/{exercise_id}/submit", response_model=ExerciseResultDTO)
async def submit_interpret_attempt(
    exercise_id: str,
    payload: dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Submit Japanese rendition with fidelity metrics."""
    session_svc = ExerciseSessionService(db)
    transcript = payload.get("user_transcript") or payload.get("transcript") or ""
    interpret_metrics = payload.get("interpret_metrics") or {
        "reaction_latency_ms": payload.get("reaction_latency_ms"),
        "timer_limit_ms": payload.get("timer_limit_ms", 20000),
        "timed_out": payload.get("timed_out", False),
        "late_response": payload.get("late_response", False),
        "speech_confidence": payload.get("speech_confidence"),
        "independence": payload.get("independence", "independent"),
        "expected_keywords": payload.get("expected_keywords", []),
        "blind": payload.get("blind", False),
    }
    result = await session_svc.submit_exercise_attempt(
        exercise_id=exercise_id, user_id=user_id, user_transcript=transcript,
        response_speed_ms=payload.get("response_speed_ms") or payload.get("reaction_latency_ms"),
        used_hint=payload.get("used_hint", False) or (payload.get("independence") != "independent" if payload.get("independence") else False),
        plan_item_id=payload.get("plan_item_id"),
        interpret_metrics=interpret_metrics,
        reaction_latency_ms=payload.get("reaction_latency_ms"),
        timer_limit_ms=payload.get("timer_limit_ms"),
        timed_out=payload.get("timed_out"),
        late_response=payload.get("late_response"),
        speech_confidence=payload.get("speech_confidence"),
    )
    return result


@router.get("/progress")
async def get_interpret_progress(
    period: str = Query(default="30d", description="7d|30d|all"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Returns interpretation analytics derived from ExerciseAttempts."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.domains.learning.models import ExerciseAttempt

    days = {"7d": 7, "30d": 30, "all": 3650}.get(period, 30)
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = (
        select(ExerciseAttempt)
        .options(selectinload(ExerciseAttempt.exercise))
        .where(ExerciseAttempt.user_id == user_id, ExerciseAttempt.status == "completed", ExerciseAttempt.completed_at >= cutoff)
        .order_by(ExerciseAttempt.completed_at.desc())
        .limit(500)
    )
    res = await db.execute(stmt)
    attempts = res.scalars().all()
    i_attempts = [
        a for a in attempts
        if (a.metrics_json or {}).get("interpret") is not None
        or (a.exercise and a.exercise.exercise_type.startswith("interpret_"))
    ]
    total = len(i_attempts)
    if total == 0:
        return {"user_id": user_id, "period": period, "total_attempts": 0, "success_rate": 0.0,
                "blind_success_rate": 0.0, "vietglish_rate": 0.0, "by_sub_mode": {}}
    ok = sum(1 for a in i_attempts if a.success)
    blind = [a for a in i_attempts if ((a.metrics_json or {}).get("interpret", {}) or {}).get("blind")]
    blind_ok = sum(1 for a in blind if a.success)
    vglish = sum(1 for a in i_attempts if ((a.metrics_json or {}).get("interpret_assessment", {}) or {}).get("vietglish_flags"))
    by_mode: dict[str, Any] = {}
    for a in i_attempts:
        mode = a.exercise.exercise_type if a.exercise else "unknown"
        by_mode.setdefault(mode, {"count": 0, "success": 0})
        by_mode[mode]["count"] += 1
        if a.success:
            by_mode[mode]["success"] += 1
    for v in by_mode.values():
        v["accuracy"] = v["success"] / v["count"] if v["count"] else 0
    return {"user_id": user_id, "period": period, "total_attempts": total,
            "success_rate": round(ok / total, 3),
            "blind_success_rate": round(blind_ok / len(blind), 3) if blind else 0.0,
            "vietglish_rate": round(vglish / total, 3),
            "by_sub_mode": by_mode}
