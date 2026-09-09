"""AI Curriculum & Learning Journey endpoints (Phase 13).

- GET  /api/v1/learning/journey               -> active journey status
- POST /api/v1/learning/journey               -> create (or regenerate) a journey
- GET  /api/v1/learning/journey/objective/context -> active objective context
- GET  /api/v1/learning/journey/objective/evidence -> recent evidence for the active objective
- POST /api/v1/learning/journey/replan        -> evaluate replanning triggers (optionally apply)
- GET  /api/v1/learning/journey/objectives/{objective_id}/explanation -> progress narrative

All routes operate on the anonymous learner (user_id is NULL) until
authentication exists.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.schemas.journey import (
    JourneyCreateRequest,
    JourneyCreateResponse,
    JourneyEvidenceListResponse,
    JourneyObjectiveContextResponse,
    JourneyReplanningResponse,
    JourneyStatusResponse,
    ObjectiveExplanationResponse,
)
from app.services.curriculum_service import CurriculumService

logger = logging.getLogger("app.journey")

router = APIRouter(prefix="/journey", tags=["learning-journey"])

DbSession = Annotated[AsyncSession, Depends(get_session)]

ANONYMOUS_USER_ID: str | None = None


def _build_service(session: AsyncSession, settings: Settings) -> CurriculumService:
    return CurriculumService(session, settings)


async def _journey_status_payload(service: CurriculumService, journey: object) -> dict:
    from app.schemas.journey import (
        JourneyMilestoneResponse,
        JourneyObjectiveResponse,
        JourneyProgressResponse,
    )

    milestones = await service._curriculum.milestones.list_for_journey(journey.id)
    objectives = await service._curriculum.objectives.list_for_journey(journey.id)
    progress_rows = await service._curriculum.progress.list_for_journey(journey.id)
    return {
        "journey_id": journey.id,
        "status": journey.status,
        "goal_type": journey.goal_type,
        "goal": journey.goal,
        "title": None,
        "overview_vi": None,
        "progress": journey.progress,
        "source": journey.source,
        "current_milestone_id": journey.current_milestone_id,
        "current_objective_id": journey.current_objective_id,
        "explanation": journey.explanation,
        "started_at": journey.started_at,
        "completed_at": journey.completed_at,
        "milestones": [
            JourneyMilestoneResponse(
                id=milestone.id,
                position=milestone.position,
                title=milestone.title,
                description=milestone.description,
                status=milestone.status,
                unlocked_at=milestone.unlocked_at,
                completed_at=milestone.completed_at,
            )
            for milestone in milestones
        ],
        "objectives": [
            JourneyObjectiveResponse(
                id=objective.id,
                milestone_id=objective.milestone_id,
                position=objective.position,
                title=objective.title,
                description=objective.description,
                target_competencies=objective.target_competencies,
                target_skills=objective.target_skills,
                exercise_modes=objective.exercise_modes,
                target_level=objective.target_level,
                priority=objective.priority,
                status=objective.status,
                unlocked_at=objective.unlocked_at,
                completed_at=objective.completed_at,
            )
            for objective in objectives
        ],
        "objectives_progress": {
            objective_id: JourneyProgressResponse(
                skill_evidence=progress.skill_evidence or {},
                mastery_state=progress.mastery_state,
                exercises_completed=progress.exercises_completed,
                attempts_submitted=progress.attempts_submitted,
                average_score=progress.average_score,
                best_score=progress.best_score,
            )
            for objective_id, progress in progress_rows.items()
        },
    }


@router.get("", response_model=JourneyStatusResponse | None)
async def get_journey_status(session: DbSession) -> JourneyStatusResponse | None:
    settings = get_settings()
    service = _build_service(session, settings)
    journey = await service.get_status(ANONYMOUS_USER_ID)
    if journey is None:
        return None
    return JourneyStatusResponse(**await _journey_status_payload(service, journey))


@router.post("", response_model=JourneyCreateResponse, status_code=201)
async def create_journey(
    session: DbSession,
    payload: JourneyCreateRequest,
) -> JourneyCreateResponse:
    settings = get_settings()
    service = _build_service(session, settings)
    journey = await service.create_journey(
        ANONYMOUS_USER_ID,
        goal_type=payload.goal_type,
        goal=payload.goal,
        force_regenerate=payload.force_regenerate,
        provider=payload.provider,
        model=payload.model,
    )
    return JourneyCreateResponse(**await _journey_status_payload(service, journey))


@router.get("/objective/context", response_model=JourneyObjectiveContextResponse | None)
async def get_objective_context(
    session: DbSession,
) -> JourneyObjectiveContextResponse | None:
    settings = get_settings()
    service = _build_service(session, settings)
    context = await service.get_objective_context(ANONYMOUS_USER_ID)
    if context is None:
        return None
    return JourneyObjectiveContextResponse(**context)


@router.get("/objective/evidence", response_model=JourneyEvidenceListResponse)
async def get_objective_evidence(session: DbSession) -> JourneyEvidenceListResponse:
    """Recent evidence for the active objective (reverse chronological)."""
    from app.models import Exercise, ExerciseAttempt, WritingFeedback

    settings = get_settings()
    service = _build_service(session, settings)
    active = await service.get_active_objective(ANONYMOUS_USER_ID)
    if active is None:
        return JourneyEvidenceListResponse(objective_id="", items=[], total=0)
    _, _, objective, _ = active

    result = await session.execute(
        select(ExerciseAttempt, WritingFeedback, Exercise)
        .join(WritingFeedback, WritingFeedback.attempt_id == ExerciseAttempt.id)
        .join(Exercise, Exercise.id == ExerciseAttempt.exercise_id)
        .where(Exercise.objective_id == objective.id)
        .order_by(ExerciseAttempt.created_at.desc())
        .limit(50)
    )
    rows = result.all()
    items = [
        {
            "objective_id": objective.id,
            "exercise_id": exercise.id,
            "attempt_id": attempt.id,
            "exercise_type": exercise.exercise_type.value,
            "mode": exercise.exercise_type.value,
            "topic": exercise.topic,
            "score": feedback.overall_score,
            "skills": {
                "grammar": feedback.grammar_score,
                "vocabulary": feedback.vocabulary_score,
                "naturalness": feedback.naturalness_score,
                "semantic": feedback.semantic_score,
                "context_fit": feedback.context_fit_score,
                "register_fit": feedback.register_fit_score,
            },
            "created_at": attempt.created_at,
        }
        for attempt, feedback, exercise in rows
    ]
    return JourneyEvidenceListResponse(objective_id=objective.id, items=items, total=len(items))


@router.post("/replan", response_model=JourneyReplanningResponse)
async def replan_journey(
    session: DbSession,
    requested_changes: list[dict] | None = None,
) -> JourneyReplanningResponse:
    settings = get_settings()
    service = _build_service(session, settings)
    payload = await service.replan(ANONYMOUS_USER_ID, requested_changes=requested_changes or None)
    return JourneyReplanningResponse(**payload)


@router.get(
    "/objectives/{objective_id}/explanation",
    response_model=ObjectiveExplanationResponse,
)
async def get_objective_explanation(
    session: DbSession,
    objective_id: str,
) -> ObjectiveExplanationResponse:
    settings = get_settings()
    service = _build_service(session, settings)
    payload = await service.objective_explanation(ANONYMOUS_USER_ID, objective_id)
    if payload is None:
        from app.core.errors import NotFoundError

        raise NotFoundError(f"Objective '{objective_id}' not found for the active journey")
    return ObjectiveExplanationResponse(**payload)
