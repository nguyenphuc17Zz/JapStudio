"""Sentence Builder API — Mode 8 integration (thin wrapper over Learning Engine)."""

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.builder.dynamic_generator import AIBuilderGenerator
from app.domains.learning.exercise_session_service import ExerciseSessionService
from app.domains.learning.learning_item_service import LearningItemService
from app.domains.learning.models import Exercise
from app.domains.learning.prompts import LearningPrompts
from app.domains.learning.schemas import ExerciseDTO, ExerciseResultDTO
from app.domains.users.service import UserService
from app.infrastructure.database.session import get_db
from app.shared.errors.exceptions import ValidationException

router = APIRouter(prefix="/builder", tags=["Sentence Builder — Mode 8"])

VALID_MODES = {"sentence_assemble", "sentence_expand", "sentence_repair"}
VALID_SKILLS = {"te_chain", "relative_clause", "conditional", "nominalization", "contraction"}
VALID_SCAFFOLDS = {"none", "keyword_hint", "sentence_starter", "structured_options"}


async def get_current_user_id(db: AsyncSession = Depends(get_db)) -> str:
    svc = UserService(db)
    user = await svc.get_or_create_default_user()
    return user.id


@router.get("/skills")
async def list_skills():
    """Returns focus clause skills and scaffold levels."""
    return {
        "skills": [
            {"id": "te_chain", "ja": "て形接続", "label": "Nối て-chain"},
            {"id": "relative_clause", "ja": "関係節", "label": "Mệnh đề quan hệ"},
            {"id": "conditional", "ja": "条件", "label": "Điều kiện たら・ば"},
            {"id": "nominalization", "ja": "名詞化", "label": "Danh từ hóa わけ・はず"},
            {"id": "contraction", "ja": "縮約", "label": "Contraction bản xứ"},
        ],
        "scaffolds": [
            {"id": "keyword_hint", "label": "Từ khóa"},
            {"id": "sentence_starter", "label": "Gợi ý mở đầu"},
            {"id": "structured_options", "label": "Khung sườn"},
            {"id": "none", "label": "Blind (tự lực)"},
        ],
        "default": {"skill": "te_chain", "scaffold": "keyword_hint"},
    }


@router.get("/exercises/generate", response_model=ExerciseDTO)
async def generate_builder_exercise_get(
    sub_mode: str = Query(default="sentence_assemble", description="sentence_assemble|sentence_expand|sentence_repair|mixed"),
    focus_skill: str = Query(default="te_chain"),
    relation: str = Query(default="casual_friend", description="casual_friend|business_polite"),
    scaffold: str = Query(default="keyword_hint", description="none|keyword_hint|sentence_starter|structured_options"),
    timer_limit_ms: int | None = Query(default=None, ge=0, le=120000),
    difficulty: str | None = Query(default=None),
    learning_item_key: str | None = Query(default=None),
    force_ai: bool = Query(default=False, description="Force fresh AI generation bypassing DB cache"),
    recent_prompts: list[str] = Query(default=[]),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await generate_builder_exercise(
        sub_mode=sub_mode, focus_skill=focus_skill, relation=relation, scaffold=scaffold,
        timer_limit_ms=timer_limit_ms, difficulty=difficulty,
        learning_item_key=learning_item_key, force_ai=force_ai, recent_prompts=recent_prompts,
        user_id=user_id, db=db,
    )


@router.post("/exercises/generate", response_model=ExerciseDTO)
async def generate_builder_exercise(
    sub_mode: str = Query(default="sentence_assemble", description="sentence_assemble|sentence_expand|sentence_repair|mixed"),
    focus_skill: str = Query(default="te_chain"),
    relation: str = Query(default="casual_friend", description="casual_friend|business_polite"),
    scaffold: str = Query(default="keyword_hint", description="none|keyword_hint|sentence_starter|structured_options"),
    timer_limit_ms: int | None = Query(default=None, ge=0, le=120000),
    difficulty: str | None = Query(default=None),
    learning_item_key: str | None = Query(default=None),
    force_ai: bool = Query(default=False, description="Force fresh AI generation bypassing DB cache"),
    recent_prompts: list[str] = Query(default=[]),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Dynamic builder drill generation via AI + pool fallback. Content cached in DB."""
    if sub_mode == "mixed":
        import random

        r = random.random()
        sub_mode = "sentence_assemble" if r < 0.4 else ("sentence_expand" if r < 0.7 else "sentence_repair")
    if sub_mode not in VALID_MODES:
        raise ValidationException(f"Invalid sub_mode '{sub_mode}'. Must be one of {sorted(VALID_MODES)}")
    if focus_skill not in VALID_SKILLS:
        focus_skill = "te_chain"
    if relation not in ("casual_friend", "business_polite"):
        relation = "casual_friend"
    if scaffold not in VALID_SCAFFOLDS:
        scaffold = "keyword_hint"
    eff_diff = difficulty or "normal"

    ai_gen = AIBuilderGenerator(db)
    data = await ai_gen.generate_dynamic_exercise(
        sub_mode=sub_mode, focus_skill=focus_skill, relation=relation,
        scaffold=scaffold, timer_limit_ms=timer_limit_ms,
        difficulty=eff_diff, user_id=user_id, force_ai=force_ai,
        recent_prompts=recent_prompts,
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

            key = f"builder.{sub_mode}.{focus_skill}"
            existing = await item_service.get_item_by_key(key, user_id)
            if not existing:
                new_item = LearningItem(
                    user_id=user_id, key=key, item_type="fluency",
                    title=f"Sentence Builder — {sub_mode} ({focus_skill})",
                    description=f"Luyện xây câu {sub_mode}, focus {focus_skill}.",
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
    canonical = data.get("canonical") or ""
    canonical_vi = data.get("canonical_vi") or ""
    exercise = Exercise(
        user_id=user_id, exercise_type=sub_mode, status="not_started",
        title=data["title"], objective=data["objective"], scenario=data.get("scenario"),
        instructions=data["instructions"],
        constraints=["Dùng hết từ khóa, nối mệnh đề mượt, đúng register."],
        target_patterns=[], learning_item_keys=[item_key],
        success_criteria=["Câu dài, nối đúng focus skill, tự nhiên."],
        acceptable_variants=[canonical] if canonical else [], difficulty=eff_diff,
        scaffold_level="none" if blind else ("keyword_hint" if scaffold == "keyword_hint" else "sentence_starter"),
        scaffold_hint=data.get("starter"),
        estimated_minutes=4, template_version="v1",
        generator_version="builder.1.0.0",
        prompt_version=LearningPrompts.BUILDER_GEN_PROMPT_VERSION,
        provider="builder_factory", model="deterministic_v1",
        exercise_signature=sig,
        extra_metadata={
            "builder_config": {
                "sub_mode": sub_mode, "focus_skill": data.get("focus_skill", focus_skill),
                "relation": data.get("relation", relation), "scaffold": scaffold,
                "control_level": data.get("control_level", "controlled" if scaffold in ("structured_options", "sentence_starter") else ("semi_controlled" if scaffold == "keyword_hint" else "free")),
                "blind": blind, "timer_limit_ms": data.get("timer_limit_ms", 60000),
                "keywords": data.get("keywords", []), "starter": data.get("starter"),
                "source_sentence": data.get("source_sentence"),
                "prompt_vi": data.get("prompt_vi") or data.get("situation_vi"),
                "situation_vi": data.get("situation_vi"),
                "template": data.get("template"),
                "suggested_vocabulary": data.get("suggested_vocabulary", []),
                "connector_items": data.get("connector_items", []),
                "hints": data.get("hints", []),
                "expand_requirement": data.get("expand_requirement"),
                "connectors": data.get("connectors", []),
                "canonical": canonical,
                "canonical_vi": canonical_vi,
                "generation_source": data.get("generation_source", "ai"),
                "is_fallback": data.get("is_fallback", False),
                "fallback_reason": data.get("fallback_reason"),
            },
            "generation_source": data.get("generation_source", "ai"),
            "is_fallback": data.get("is_fallback", False),
            "fallback_reason": data.get("fallback_reason"),
            "priority_score": 0.7, "item_type": "builder",
        },
    )
    db.add(exercise)
    await db.commit()
    await db.refresh(exercise)
    return exercise


@router.get("/exercises/{exercise_id}", response_model=ExerciseDTO)
async def get_builder_exercise(
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
async def submit_builder_attempt(
    exercise_id: str,
    payload: dict[str, Any],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Submit built sentence with clause metrics."""
    session_svc = ExerciseSessionService(db)
    transcript = payload.get("user_transcript") or payload.get("transcript") or ""
    builder_metrics = payload.get("builder_metrics") or {
        "reaction_latency_ms": payload.get("reaction_latency_ms"),
        "timer_limit_ms": payload.get("timer_limit_ms", 20000),
        "timed_out": payload.get("timed_out", False),
        "late_response": payload.get("late_response", False),
        "speech_confidence": payload.get("speech_confidence"),
        "independence": payload.get("independence", "independent"),
        "focus_skill": payload.get("focus_skill"),
        "keywords": payload.get("keywords", []),
        "scaffold_level": payload.get("scaffold_level"),
        "blind": payload.get("blind", False),
    }
    result = await session_svc.submit_exercise_attempt(
        exercise_id=exercise_id, user_id=user_id, user_transcript=transcript,
        response_speed_ms=payload.get("response_speed_ms") or payload.get("reaction_latency_ms"),
        used_hint=payload.get("used_hint", False) or (payload.get("independence") != "independent" if payload.get("independence") else False),
        plan_item_id=payload.get("plan_item_id"),
        builder_metrics=builder_metrics,
        reaction_latency_ms=payload.get("reaction_latency_ms"),
        timer_limit_ms=payload.get("timer_limit_ms"),
        timed_out=payload.get("timed_out"),
        late_response=payload.get("late_response"),
        speech_confidence=payload.get("speech_confidence"),
    )
    return result


@router.get("/progress")
async def get_builder_progress(
    period: str = Query(default="30d", description="7d|30d|all"),
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """Returns builder analytics derived from ExerciseAttempts."""
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
    b_attempts = [
        a for a in attempts
        if (a.metrics_json or {}).get("builder") is not None
        or (a.exercise and a.exercise.exercise_type.startswith("sentence_"))
    ]
    total = len(b_attempts)
    if total == 0:
        return {"user_id": user_id, "period": period, "total_attempts": 0, "success_rate": 0.0,
                "blind_success_rate": 0.0, "by_skill": {}, "by_sub_mode": {}}
    ok = sum(1 for a in b_attempts if a.success)
    blind = [a for a in b_attempts if ((a.metrics_json or {}).get("builder", {}) or {}).get("blind")]
    blind_ok = sum(1 for a in blind if a.success)
    by_skill: dict[str, Any] = {}
    by_mode: dict[str, Any] = {}
    for a in b_attempts:
        bm = (a.metrics_json or {}).get("builder", {}) or {}
        sk = bm.get("focus_skill", "unknown")
        by_skill.setdefault(sk, {"count": 0, "success": 0})
        by_skill[sk]["count"] += 1
        if a.success:
            by_skill[sk]["success"] += 1
        mode = a.exercise.exercise_type if a.exercise else "unknown"
        by_mode.setdefault(mode, {"count": 0, "success": 0})
        by_mode[mode]["count"] += 1
        if a.success:
            by_mode[mode]["success"] += 1
    for d in (by_skill, by_mode):
        for v in d.values():
            v["accuracy"] = v["success"] / v["count"] if v["count"] else 0
    return {"user_id": user_id, "period": period, "total_attempts": total,
            "success_rate": round(ok / total, 3),
            "blind_success_rate": round(blind_ok / len(blind), 3) if blind else 0.0,
            "by_skill": by_skill, "by_sub_mode": by_mode}
