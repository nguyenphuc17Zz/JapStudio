"""Aizuchi Dojo API — Mode 7 integration (thin wrapper over Learning Engine)."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.aizuchi.dynamic_generator import AIAizuchiGenerator
from app.domains.aizuchi.exercise_factory import AizuchiExerciseFactory
from app.domains.aizuchi.pressure_profiles import WINDOW_PROFILES, window_for_profile
from app.domains.learning.contracts import ExerciseType
from app.domains.learning.exercise_session_service import ExerciseSessionService
from app.domains.learning.learning_item_service import LearningItemService
from app.domains.learning.models import Exercise
from app.domains.learning.schemas import ExerciseDTO, ExerciseResultDTO
from app.domains.users.service import UserService
from app.infrastructure.database.session import get_db
from app.shared.errors.exceptions import ValidationException

router = APIRouter(prefix="/aizuchi", tags=["Aizuchi Dojo — Mode 7"])


async def get_current_user_id(db: AsyncSession = Depends(get_db)) -> str:
    svc = UserService(db)
    user = await svc.get_or_create_default_user()
    return user.id


_factory = AizuchiExerciseFactory()


@router.get("/pressure-profiles")
async def list_window_profiles():
    """Returns available pause-window profiles and timer configs."""
    return {
        "profiles": WINDOW_PROFILES,
        "default": "normal",
        "recommended_order": ["relaxed", "normal", "fast", "reflex"],
    }


@router.get("/exercises/generate", response_model=ExerciseDTO)
async def generate_aizuchi_exercise_get(
    sub_mode: str = Query(default="aizuchi_reaction", description="aizuchi_reaction|warikomi_interrupt"),
    relation: str = Query(default="casual_friend", description="casual_friend|business_polite"),
    window_profile: str = Query(default="normal"),
    speed: float = Query(default=1.0),
    difficulty: str | None = Query(default=None),
    num_turns: int = Query(default=3, ge=1, le=5),
    window_ms: int | None = Query(default=None, ge=0, le=10000),
    learning_item_key: str | None = Query(default=None),
    force_ai: bool = Query(default=False, description="Force fresh AI generation bypassing DB cache"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await generate_aizuchi_exercise(
        sub_mode=sub_mode,
        relation=relation,
        window_profile=window_profile,
        speed=speed,
        difficulty=difficulty,
        num_turns=num_turns,
        window_ms=window_ms,
        learning_item_key=learning_item_key,
        force_ai=force_ai,
        user_id=user_id,
        db=db,
    )


@router.post("/exercises/generate", response_model=ExerciseDTO)
async def generate_aizuchi_exercise(
    sub_mode: str = Query(default="aizuchi_reaction", description="aizuchi_reaction|warikomi_interrupt"),
    relation: str = Query(default="casual_friend", description="casual_friend|business_polite"),
    window_profile: str = Query(default="normal"),
    speed: float = Query(default=1.0),
    difficulty: str | None = Query(default=None),
    num_turns: int = Query(default=3, ge=1, le=5),
    window_ms: int | None = Query(default=None, ge=0, le=10000),
    learning_item_key: str | None = Query(default=None),
    force_ai: bool = Query(default=False, description="Force fresh AI generation bypassing DB cache"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Dynamic aizuchi exercise generation via AI + template fallback.

    Full NPC script is persisted in extra_metadata.aizuchi_config (DB cache hit on replay).
    """
    valid_modes = {e.value for e in ExerciseType if e.value.startswith(("aizuchi", "warikomi"))}
    if sub_mode not in valid_modes:
        raise ValidationException(f"Invalid sub_mode '{sub_mode}'. Must be one of {sorted(valid_modes)}")
    if relation not in ("casual_friend", "business_polite"):
        relation = "casual_friend"
    if window_profile not in WINDOW_PROFILES:
        window_profile = "normal"
    eff_window = window_ms if window_ms is not None else window_for_profile(window_profile)
    eff_diff = difficulty or "normal"

    # Generate dynamic content via AI generator (falls back to pools when AI is down)
    ai_gen = AIAizuchiGenerator(db)
    data = await ai_gen.generate_dynamic_exercise(
        sub_mode=sub_mode,
        relation=relation,
        window_profile=window_profile,
        window_ms=eff_window,
        difficulty=eff_diff,
        speed=speed,
        num_turns=num_turns,
        user_id=user_id,
        force_ai=force_ai,
    )

    # Resolve learning item key (fluency for reaction, naturalness for interrupt)
    item_key = learning_item_key
    if not item_key:
        item_service = LearningItemService(db)
        items = await item_service.list_items(user_id, limit=20)
        affinity_map = {
            "aizuchi_reaction": "fluency",
            "warikomi_interrupt": "naturalness",
        }
        target_type = affinity_map.get(sub_mode, "fluency")
        match = next((i for i in items if i.item_type == target_type), None)
        if match:
            item_key = match.key
        else:
            from app.domains.learning.models import LearningItem

            key = f"aizuchi.{sub_mode}.{eff_diff}"
            existing = await item_service.get_item_by_key(key, user_id)
            if not existing:
                new_item = LearningItem(
                    user_id=user_id,
                    key=key,
                    item_type=target_type,
                    title=f"Aizuchi — {sub_mode} ({eff_diff})",
                    description=f"Luyện相づち {sub_mode} quan hệ {relation} với cửa sổ {eff_window}ms.",
                    difficulty=eff_diff,
                    lifecycle="active",
                    status="active",
                )
                db.add(new_item)
                await db.flush()
                item_key = key
            else:
                item_key = key

    from app.domains.learning.exercise_variety_policy import ExerciseVarietyPolicy
    from app.domains.learning.prompts import LearningPrompts

    sig = ExerciseVarietyPolicy.compute_exercise_signature(
        exercise_type=sub_mode,
        target_patterns=[data.get("title", sub_mode)],
        difficulty=eff_diff,
        scenario_topic=data.get("scenario"),
    )

    exercise = Exercise(
        user_id=user_id,
        exercise_type=sub_mode,
        status="not_started",
        title=data["title"],
        objective=data["objective"],
        scenario=data.get("scenario"),
        instructions=data["instructions"],
        constraints=["Chêm trong cửa sổ pause, không đè lên lời NPC."],
        target_patterns=[],
        learning_item_keys=[item_key],
        success_criteria=["Chêm đúng timing và đúng loại aizuchi."],
        acceptable_variants=[],
        difficulty=eff_diff,
        scaffold_level="none",
        scaffold_hint=None,
        estimated_minutes=5,
        template_version="v1",
        generator_version="aizuchi.1.0.0",
        prompt_version=LearningPrompts.AIZUCHI_GEN_PROMPT_VERSION,
        provider="aizuchi_factory",
        model="deterministic_v1",
        exercise_signature=sig,
        extra_metadata={
            "aizuchi_config": {
                "sub_mode": sub_mode,
                "relation": relation,
                "window_profile": window_profile,
                "window_ms": eff_window,
                "speed": speed,
                "npc_turns": data.get("npc_turns", []),
                "expected_types": data.get("expected_types", ["continuer"]),
                "sample_responses": data.get("sample_responses", []),
                "generation_source": data.get("generation_source", "ai"),
                "is_fallback": data.get("is_fallback", False),
                "fallback_reason": data.get("fallback_reason"),
            },
            "generation_source": data.get("generation_source", "ai"),
            "is_fallback": data.get("is_fallback", False),
            "fallback_reason": data.get("fallback_reason"),
            "priority_score": 0.7,
            "item_type": "aizuchi",
        },
    )

    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.get("/exercises/{exercise_id}", response_model=ExerciseDTO)
async def get_aizuchi_exercise(
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
async def submit_aizuchi_attempt(
    exercise_id: str,
    payload: dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Submit aizuchi attempt with window timing metrics."""
    session_svc = ExerciseSessionService(db)
    transcript = payload.get("user_transcript") or payload.get("transcript") or ""
    aizuchi_metrics = payload.get("aizuchi_metrics") or {
        "reaction_latency_ms": payload.get("reaction_latency_ms"),
        "window_ms": payload.get("window_ms") or payload.get("timer_limit_ms"),
        "timer_limit_ms": payload.get("timer_limit_ms") or payload.get("window_ms"),
        "timed_out": payload.get("timed_out", False),
        "late_response": payload.get("late_response", False),
        "overlap_rude": payload.get("overlap_rude", False),
        "bc_type": payload.get("bc_type"),
        "speech_confidence": payload.get("speech_confidence"),
        "independence": payload.get("independence", "independent"),
    }
    result = await session_svc.submit_exercise_attempt(
        exercise_id=exercise_id,
        user_id=user_id,
        user_transcript=transcript,
        response_speed_ms=payload.get("response_speed_ms") or payload.get("reaction_latency_ms"),
        used_hint=payload.get("used_hint", False) or (payload.get("independence") != "independent" if payload.get("independence") else False),
        plan_item_id=payload.get("plan_item_id"),
        aizuchi_metrics=aizuchi_metrics,
        reaction_latency_ms=payload.get("reaction_latency_ms"),
        timer_limit_ms=payload.get("timer_limit_ms") or payload.get("window_ms"),
        timed_out=payload.get("timed_out"),
        late_response=payload.get("late_response"),
        speech_confidence=payload.get("speech_confidence"),
    )
    return result


@router.get("/progress")
async def get_aizuchi_progress(
    period: str = Query(default="30d", description="7d|30d|all"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Returns aizuchi analytics derived from ExerciseAttempts."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.domains.learning.models import ExerciseAttempt

    days_map = {"7d": 7, "30d": 30, "all": 3650}
    days = days_map.get(period, 30)
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

    aiz_attempts = [
        a for a in attempts
        if (a.metrics_json or {}).get("aizuchi") is not None
        or (a.exercise and a.exercise.exercise_type.startswith(("aizuchi", "warikomi")))
    ]

    total = len(aiz_attempts)
    if total == 0:
        return {
            "user_id": user_id,
            "period": period,
            "total_attempts": 0,
            "success_rate": 0.0,
            "avg_latency_ms": None,
            "p50_latency_ms": None,
            "p90_latency_ms": None,
            "miss_rate": 0.0,
            "rude_rate": 0.0,
            "recommended_window_ms": 600,
            "by_sub_mode": {},
        }

    successes = sum(1 for a in aiz_attempts if a.success)
    latencies = []
    misses = 0
    rudes = 0
    for a in aiz_attempts:
        am = (a.metrics_json or {}).get("aizuchi", {}) if a.metrics_json else {}
        lat = am.get("reaction_latency_ms", a.response_speed_ms)
        if lat is not None:
            latencies.append(float(lat))
        if am.get("timed_out"):
            misses += 1
        if am.get("overlap_rude"):
            rudes += 1
    latencies.sort()
    avg_lat = sum(latencies) / len(latencies) if latencies else None
    p50 = latencies[len(latencies) // 2] if latencies else None
    p90 = latencies[int(len(latencies) * 0.9)] if latencies else None

    # Elo-lite window recommendation: fast+accurate -> tighten, struggle -> widen
    acc = successes / total if total else 0
    if p50 is not None and acc >= 0.8 and p50 < 400:
        rec_window = 450
    elif acc < 0.5 or (p50 is not None and p50 and p50 > 700):
        rec_window = 900
    else:
        rec_window = 600

    by_mode: dict[str, Any] = {}
    for a in aiz_attempts:
        mode = a.exercise.exercise_type if a.exercise else "unknown"
        by_mode.setdefault(mode, {"count": 0, "success": 0})
        by_mode[mode]["count"] += 1
        if a.success:
            by_mode[mode]["success"] += 1
    for k, v in by_mode.items():
        v["accuracy"] = v["success"] / v["count"] if v["count"] else 0

    return {
        "user_id": user_id,
        "period": period,
        "total_attempts": total,
        "success_rate": round(acc, 3),
        "avg_latency_ms": round(avg_lat, 1) if avg_lat is not None else None,
        "p50_latency_ms": round(p50, 1) if p50 is not None else None,
        "p90_latency_ms": round(p90, 1) if p90 is not None else None,
        "miss_rate": round(misses / total, 3) if total else 0.0,
        "rude_rate": round(rudes / total, 3) if total else 0.0,
        "recommended_window_ms": rec_window,
        "by_sub_mode": by_mode,
    }
